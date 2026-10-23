<?php

namespace App\Actions\Matches;

use App\Events\MatchLiveUpdated;
use App\Models\MatchEvent;
use App\Models\MatchPlayer;
use App\Models\SportMatch;
use Illuminate\Support\Facades\DB;

class AddMatchEventAction
{
    public function execute(SportMatch $match, array $data, ?int $userId = null): MatchEvent
    {
        return DB::transaction(function () use ($match, $data, $userId) {
            // Idempotency prevention: if idempotency_key is present and already registered, return existing
            if (!empty($data['idempotency_key'])) {
                $existing = MatchEvent::where('match_id', $match->id)
                    ->where('idempotency_key', $data['idempotency_key'])
                    ->first();
                if ($existing) {
                    return $existing;
                }
            }

            $currentPeriod = $data['period'] ?? $match->current_period ?: 1;

            // Compute elapsed seconds in the period
            $periodSeconds = $data['match_time_seconds'] ?? null;
            if ($periodSeconds === null) {
                $periodSeconds = (int) ($match->period_elapsed_seconds ?: 0);
                if ($match->status === 'in_progress' && $match->last_resumed_at) {
                    $periodSeconds += abs(now()->diffInSeconds($match->last_resumed_at));
                }
            }
            $periodSeconds = max(0, (int) round((float) $periodSeconds));

            $minute = $data['minute'] ?? max(1, (int)ceil((($currentPeriod - 1) * ($match->period_duration_seconds ?: 600) + $periodSeconds) / 60));

            $type = $data['type'];
            $teamSide = $data['team_side'];
            $points = $data['points'] ?? null;
            $shotType = $data['shot_type'] ?? null;
            $shotResult = $data['shot_result'] ?? null;

            // Normalize points and results across all disciplines
            if ($type === 'basket') {
                if ($points === null) {
                    $points = 2;
                }
                $shotResult = 'made';
                if ($shotType === null) {
                    $shotType = $points === 3 ? '3pt' : ($points === 1 ? 'free_throw' : '2pt');
                }
            } elseif ($type === 'free_throw') {
                $points = 1;
                $shotType = 'free_throw';
                $shotResult = $data['shot_result'] ?? 'made';
            } elseif ($type === 'missed_shot') {
                $points = null;
                $shotResult = 'missed';
                if ($shotType === null) {
                    $shotType = '2pt';
                }
            } elseif (in_array($type, ['goal', 'point', 'ace', 'attack_kill', 'winner'])) {
                $points = $points ?? 1;
                $shotResult = 'made';
            }

            $event = MatchEvent::create([
                'match_id'           => $match->id,
                'type'               => $type,
                'team_side'          => $teamSide,
                'player_id'          => $data['player_id'] ?? null,
                'sub_in_player_id'   => $data['sub_in_player_id'] ?? null,
                'sub_out_player_id'  => $data['sub_out_player_id'] ?? null,
                'related_player_id'  => $data['related_player_id'] ?? null,
                'points'             => $points,
                'shot_type'          => $shotType,
                'shot_result'        => $shotResult,
                'rebound_type'       => $data['rebound_type'] ?? null,
                'foul_type'          => $data['foul_type'] ?? null,
                'period'             => $currentPeriod,
                'minute'             => $minute,
                'match_time_seconds' => $periodSeconds,
                'recorded_by'        => $userId,
                'idempotency_key'    => $data['idempotency_key'] ?? null,
                'metadata'           => $data['metadata'] ?? null,
                'created_at'         => now(),
            ]);

            // 1. Scoring events update match score
            $isScoring = in_array($type, ['basket', 'goal', 'point', 'ace', 'attack_kill', 'winner'])
                || ($type === 'free_throw' && $shotResult === 'made');

            if ($isScoring) {
                $pts = $points ?? 1;
                if ($teamSide === 'team_a') {
                    $match->increment('score_team_a', $pts);
                } else {
                    $match->increment('score_team_b', $pts);
                }
            }

            // 2. Disciplinary & fouls tracking
            if ($type === 'foul') {
                if ($teamSide === 'team_a') {
                    $match->increment('team_a_fouls');
                } else {
                    $match->increment('team_b_fouls');
                }
                if (!empty($data['player_id'])) {
                    MatchPlayer::where('match_id', $match->id)
                        ->where('user_id', $data['player_id'])
                        ->increment('fouls_count');
                }
            } elseif ($type === 'card_yellow') {
                if (!empty($data['player_id'])) {
                    $mp = MatchPlayer::where('match_id', $match->id)
                        ->where('user_id', $data['player_id'])
                        ->first();
                    if ($mp) {
                        $mp->increment('yellow_cards');
                        // 2 yellow cards equal 1 red card expulsion in football
                        if ($mp->yellow_cards >= 2) {
                            $mp->increment('red_cards');
                            $mp->update(['is_on_court' => false]);
                        }
                    }
                }
            } elseif ($type === 'card_red') {
                if (!empty($data['player_id'])) {
                    $mp = MatchPlayer::where('match_id', $match->id)
                        ->where('user_id', $data['player_id'])
                        ->first();
                    if ($mp) {
                        $mp->increment('red_cards');
                        $mp->update(['is_on_court' => false]);
                    }
                }
            } elseif ($type === 'substitution') {
                // Handle player substitution
                if (!empty($data['sub_out_player_id'])) {
                    $subOut = MatchPlayer::where('match_id', $match->id)
                        ->where('user_id', $data['sub_out_player_id'])
                        ->first();
                    if ($subOut && $subOut->is_on_court) {
                        $lastIn = $subOut->last_subbed_in_at ?: 0;
                        $playedSeconds = max(0, $periodSeconds - $lastIn);
                        $subOut->update([
                            'is_on_court' => false,
                            'seconds_played' => $subOut->seconds_played + $playedSeconds,
                        ]);
                    }
                }

                if (!empty($data['sub_in_player_id'])) {
                    $subIn = MatchPlayer::firstOrCreate(
                        ['match_id' => $match->id, 'user_id' => $data['sub_in_player_id']],
                        ['team_side' => $teamSide, 'is_starter' => false]
                    );
                    $subIn->update([
                        'is_on_court' => true,
                        'last_subbed_in_at' => $periodSeconds,
                    ]);
                }
            }

            // Keep elapsed time in sync
            if ($match->status === 'in_progress' && $match->last_resumed_at) {
                $delta = max(0, (int) round(abs(now()->diffInSeconds($match->last_resumed_at))));
                $match->period_elapsed_seconds = max(0, (int) $match->period_elapsed_seconds + $delta);
                $match->elapsed_seconds = max(0, (int) $match->elapsed_seconds + $delta);
                $match->last_resumed_at = now();
                $match->save();
            }

            $match->refresh();

            // Broadcast live update
            event(new MatchLiveUpdated($match, $event, 'event_added'));

            // Push Notification pour alerte de score / but en direct
            if ($isScoring) {
                try {
                    $this->notifyScoringEvent($match, $event);
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('[AddMatchEventAction] Notification push error: ' . $e->getMessage());
                }
            }

            return $event;
        });
    }

    /**
     * Envoie une alerte push aux participants et suiveurs pour chaque but / panier
     */
    protected function notifyScoringEvent(SportMatch $match, MatchEvent $event): void
    {
        $notificationService = app(\App\Services\NotificationService::class);
        $sportSlug = strtolower($match->session?->sport?->slug ?? '');

        $teamName = $event->team_side === 'team_a'
            ? ($match->teamA?->name ?? 'Équipe A')
            : ($match->teamB?->name ?? 'Équipe B');

        $scorerName = 'Un joueur';
        if ($event->player_id) {
            $player = \App\Models\User::find($event->player_id);
            if ($player) {
                $scorerName = $player->username ?? $player->name;
            }
        }

        $scoreA = $match->score_team_a;
        $scoreB = $match->score_team_b;
        $minute = $event->minute ?: 1;

        $title = "⚽ BUT ! {$teamName}";
        $body = "{$scorerName} a marqué ({$minute}') ! Score : {$scoreA} - {$scoreB}";

        if (str_contains($sportSlug, 'basket')) {
            $pts = $event->points ?? 2;
            $title = "🏀 PANIER ! +{$pts} pts {$teamName}";
            $body = "{$scorerName} marque pour {$teamName} ! Score : {$scoreA} - {$scoreB}";
        } elseif (str_contains($sportSlug, 'volley')) {
            $title = "🏐 POINT ! {$teamName}";
            $body = "Point pour {$teamName} ({$scorerName}) ! Score : {$scoreA} - {$scoreB}";
        } elseif (str_contains($sportSlug, 'table_tennis') || str_contains($sportSlug, 'ping')) {
            $title = "🏓 POINT ! {$teamName}";
            $body = "Point pour {$teamName} ! Score : {$scoreA} - {$scoreB}";
        }

        // Récupérer les destinataires : participants session + joueurs match + membres équipes
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
                'match_score_update',
                $title,
                $body,
                $match->session_id,
                $match->id,
                [
                    'match_id'     => (string) $match->id,
                    'session_id'   => (string) ($match->session_id ?? ''),
                    'event_type'   => $event->type,
                    'team_side'    => $event->team_side,
                    'score_team_a' => (string) $scoreA,
                    'score_team_b' => (string) $scoreB,
                    'type'         => 'match_score_update',
                ]
            );
        }
    }
}
