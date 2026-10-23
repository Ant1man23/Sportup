<?php

namespace App\Actions\Matches;

use App\Events\MatchLiveUpdated;
use App\Models\MatchEvent;
use App\Models\MatchPlayer;
use App\Models\SportMatch;
use App\Models\TournamentStanding;
use App\Models\UserSportStatistics;
use App\Models\UserStatisticsHistory;
use Illuminate\Support\Facades\DB;

class FinishMatchAction
{
    public function execute(SportMatch $match, ?int $userId = null): SportMatch
    {
        return DB::transaction(function () use ($match, $userId) {
            $now = now();

            // 1. Finalize playing times for on-court players
            $periodSeconds = (int) ($match->period_elapsed_seconds ?: 0);
            if ($match->status === 'in_progress' && $match->last_resumed_at) {
                $diff = max(0, (int) round(abs($now->diffInSeconds($match->last_resumed_at))));
                $periodSeconds += $diff;
                $match->elapsed_seconds = max(0, (int) $match->elapsed_seconds + $diff);
            }
            $periodSeconds = max(0, (int) round((float) $periodSeconds));

            $onCourtPlayers = MatchPlayer::where('match_id', $match->id)
                ->where('is_on_court', true)
                ->get();

            foreach ($onCourtPlayers as $mp) {
                $lastIn = $mp->last_subbed_in_at ?: 0;
                $segment = max(0, $periodSeconds - $lastIn);
                $mp->update([
                    'is_on_court'    => false,
                    'seconds_played' => $mp->seconds_played + $segment,
                ]);
            }

            // 2. Mark match as finished & archive final set if set-based sport
            $isSetSport = \App\Services\SportRulesService::isSetSport($match->session?->sport?->slug ?? '');
            if ($isSetSport && ($match->score_team_a > 0 || $match->score_team_b > 0)) {
                \App\Models\MatchSet::updateOrCreate(
                    ['match_id' => $match->id, 'set_number' => $match->current_period],
                    ['score_team_a' => $match->score_team_a, 'score_team_b' => $match->score_team_b]
                );
                if ($match->score_team_a > $match->score_team_b) {
                    $match->sets_won_a = ($match->sets_won_a ?? 0) + 1;
                } elseif ($match->score_team_b > $match->score_team_a) {
                    $match->sets_won_b = ($match->sets_won_b ?? 0) + 1;
                }
            }

            $match->update([
                'status'          => 'finished',
                'finished_at'     => $now,
                'last_resumed_at' => null,
                'sets_won_a'      => $match->sets_won_a,
                'sets_won_b'      => $match->sets_won_b,
            ]);

            // 3. Record match_ended event
            $endEvent = MatchEvent::create([
                'match_id'           => $match->id,
                'type'               => 'match_ended',
                'team_side'          => 'team_a',
                'period'             => $match->current_period,
                'minute'             => max(1, (int)ceil($match->elapsed_seconds / 60)),
                'match_time_seconds' => $periodSeconds,
                'recorded_by'        => $userId,
                'created_at'         => $now,
            ]);

            $match->load(['events', 'session.participants']);

            if ($match->session) {
                $match->session->update(['status' => 'finished']);
            }

            $events = $match->events->where('is_cancelled', false);
            $scoreA = $match->score_team_a;
            $scoreB = $match->score_team_b;

            // Tournament standings update if match belongs to a tournament
            if ($match->tournament_id && $match->team_a_id && $match->team_b_id) {
                $standingA = TournamentStanding::firstOrCreate([
                    'tournament_id' => $match->tournament_id,
                    'team_id'       => $match->team_a_id,
                ]);
                $standingB = TournamentStanding::firstOrCreate([
                    'tournament_id' => $match->tournament_id,
                    'team_id'       => $match->team_b_id,
                ]);

                $standingA->increment('played');
                $standingB->increment('played');

                $standingA->increment('points_for', $scoreA);
                $standingA->increment('points_against', $scoreB);
                $standingB->increment('points_for', $scoreB);
                $standingB->increment('points_against', $scoreA);

                if ($scoreA > $scoreB) {
                    $standingA->increment('wins');
                    $standingA->increment('points', 3);
                    $standingB->increment('losses');
                } elseif ($scoreB > $scoreA) {
                    $standingB->increment('wins');
                    $standingB->increment('points', 3);
                    $standingA->increment('losses');
                } else {
                    $standingA->increment('draws');
                    $standingA->increment('points', 1);
                    $standingB->increment('draws');
                    $standingB->increment('points', 1);
                }
            }

            // Calculate user statistics for all participants
            $participants = $match->session->participants ?? collect();
            $sportId = $match->session->sport_id ?? 1;

            foreach ($participants as $index => $user) {
                $stat = UserSportStatistics::firstOrCreate(
                    ['user_id' => $user->id, 'sport_id' => $sportId],
                    [
                        'matches_played' => 0, 'wins' => 0, 'losses' => 0, 'draws' => 0,
                        'goals_scored' => 0, 'points_scored' => 0, 'assists' => 0,
                        'rebounds' => 0, 'blocks' => 0, 'steals' => 0,
                    ]
                );

                $playerEvent = $events->firstWhere('player_id', $user->id);
                if ($playerEvent) {
                    $userSide = $playerEvent->team_side;
                } else {
                    $userSide = ($index < ceil($participants->count() / 2)) ? 'team_a' : 'team_b';
                }

                $stat->increment('matches_played');

                $wonMatch = false;
                $isDraw = false;
                if ($isSetSport) {
                    $setA = $match->sets_won_a ?? 0;
                    $setB = $match->sets_won_b ?? 0;
                    if ($setA === $setB) {
                        $isDraw = true;
                    } elseif (($userSide === 'team_a' && $setA > $setB) || ($userSide === 'team_b' && $setB > $setA)) {
                        $wonMatch = true;
                    }
                } else {
                    if ($scoreA === $scoreB) {
                        $isDraw = true;
                    } elseif (($userSide === 'team_a' && $scoreA > $scoreB) || ($userSide === 'team_b' && $scoreB > $scoreA)) {
                        $wonMatch = true;
                    }
                }

                if ($isDraw) {
                    $stat->increment('draws');
                } elseif ($wonMatch) {
                    $stat->increment('wins');
                } else {
                    $stat->increment('losses');
                }

                $userGoals = $events->where('player_id', $user->id)->where('type', 'goal')->count();
                $userPoints = $events->where('player_id', $user->id)->where('type', 'basket')->sum('points')
                    + $events->where('player_id', $user->id)->where('type', 'free_throw')->where('shot_result', 'made')->count()
                    + $events->where('player_id', $user->id)->whereIn('type', ['point', 'ace', 'attack_kill', 'winner'])->sum(fn($e) => $e->points ?: 1);
                $userAssists = $events->where('player_id', $user->id)->where('type', 'assist')->count();
                $userRebounds = $events->where('player_id', $user->id)->where('type', 'rebound')->count();
                $userBlocks = $events->where('player_id', $user->id)->where('type', 'block')->count();
                $userSteals = $events->where('player_id', $user->id)->where('type', 'steal')->count();

                if ($userGoals > 0) $stat->increment('goals_scored', $userGoals);
                if ($userPoints > 0) $stat->increment('points_scored', $userPoints);
                if ($userAssists > 0) $stat->increment('assists', $userAssists);
                if ($userRebounds > 0) $stat->increment('rebounds', $userRebounds);
                if ($userBlocks > 0) $stat->increment('blocks', $userBlocks);
                if ($userSteals > 0) $stat->increment('steals', $userSteals);

                $stat->update(['updated_at' => $now]);

                // Store history snapshot
                UserStatisticsHistory::create([
                    'user_id'    => $user->id,
                    'sport_id'   => $sportId,
                    'match_id'   => $match->id,
                    'stats_json' => [
                        'goals'    => $userGoals,
                        'points'   => $userPoints,
                        'assists'  => $userAssists,
                        'rebounds' => $userRebounds,
                        'blocks'   => $userBlocks,
                        'steals'   => $userSteals,
                        'result'   => ($scoreA === $scoreB) ? 'draw' : ((($userSide === 'team_a' && $scoreA > $scoreB) || ($userSide === 'team_b' && $scoreB > $scoreA)) ? 'win' : 'loss'),
                    ],
                    'played_at'  => $now,
                ]);
            }

            event(new MatchLiveUpdated($match, $endEvent, 'match_ended'));

            // Push Notification pour fin de match & score final
            try {
                $this->notifyMatchFinished($match);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('[FinishMatchAction] Notification push error: ' . $e->getMessage());
            }

            return $match->load(['session', 'events']);
        });
    }

    /**
     * Envoie une alerte push du score final aux participants et suiveurs des équipes
     */
    protected function notifyMatchFinished(SportMatch $match): void
    {
        $notificationService = app(\App\Services\NotificationService::class);
        $teamAName = $match->teamA?->name ?? 'Équipe A';
        $teamBName = $match->teamB?->name ?? 'Équipe B';
        $scoreA = $match->score_team_a;
        $scoreB = $match->score_team_b;

        $title = "🏁 Fin de match ! {$teamAName} {$scoreA} - {$scoreB} {$teamBName}";
        $body = "Coup de sifflet final ! Retrouvez le résumé du match et les statistiques détaillées sur SportUp.";

        // Destinataires : participants session + joueurs match + membres des équipes
        $recipients = collect();
        if ($match->session) {
            $recipients = $recipients->merge($match->session->participants);
            if ($match->session->organizer) {
                $recipients->push($match->session->organizer);
            }
        }

        $matchPlayerUsers = MatchPlayer::where('match_id', $match->id)
            ->with('user')
            ->get()
            ->pluck('user')
            ->filter();
        $recipients = $recipients->merge($matchPlayerUsers);

        if ($match->teamA) {
            $recipients = $recipients->merge($match->teamA->members()->get());
        }
        if ($match->teamB) {
            $recipients = $recipients->merge($match->teamB->members()->get());
        }

        $uniqueRecipients = $recipients->unique('id');

        if ($uniqueRecipients->isNotEmpty()) {
            $notificationService->sendToUsers(
                $uniqueRecipients,
                'match_finished',
                $title,
                $body,
                $match->session_id,
                $match->id,
                [
                    'match_id'     => (string) $match->id,
                    'session_id'   => (string) ($match->session_id ?? ''),
                    'score_team_a' => (string) $scoreA,
                    'score_team_b' => (string) $scoreB,
                    'type'         => 'match_finished',
                ]
            );
        }
    }
}
