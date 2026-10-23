<?php

namespace App\Domain\Sports\Engines;

use App\Domain\Sports\Contracts\SportRulesEngineInterface;
use App\Models\MatchEvent;
use App\Models\MatchPlayer;
use App\Models\SportMatch;
use Illuminate\Validation\ValidationException;

class FutsalRulesEngine implements SportRulesEngineInterface
{
    public function getSportSlug(): string
    {
        return 'futsal';
    }

    public function getOfficialBody(): string
    {
        return 'FIFA';
    }

    public function getOfficialRulesVersion(): string
    {
        return 'FIFA Futsal Laws of the Game 2024/2025';
    }

    public function getDefaultRulesProfile(): array
    {
        return [
            'id' => 'fifa_futsal_standard',
            'periods' => 2,
            'period_duration_seconds' => 1200, // 20 minutes effective time
            'players_on_court' => 5, // 4 + 1 GK
            'max_accumulated_fouls_before_10m' => 5, // 6th foul = 10m penalty
            'timeouts_per_period' => 1,
            'timeout_duration_seconds' => 60,
            'red_card_penalty_seconds' => 120, // 2 min expulsion or goal conceded
        ];
    }

    public function initializeMatch(SportMatch $match, array $options = []): void
    {
        $match->update([
            'total_periods' => 2,
            'period_duration_seconds' => $options['period_duration_seconds'] ?? 1200,
            'rules_profile' => $options['rules_profile'] ?? 'fifa_futsal_standard',
            'rules_state' => [
                'period_1_fouls_a' => 0,
                'period_1_fouls_b' => 0,
                'period_2_fouls_a' => 0,
                'period_2_fouls_b' => 0,
                'active_expulsions' => [], // ['team_side' => 'team_a', 'player_id' => 12, 'penalty_ends_at_second' => 450]
                'timeouts_taken_period_1_a' => 0,
                'timeouts_taken_period_1_b' => 0,
                'timeouts_taken_period_2_a' => 0,
                'timeouts_taken_period_2_b' => 0,
            ],
        ]);
    }

    public function validateEvent(SportMatch $match, array $eventData): void
    {
        $type = $eventData['type'] ?? '';
        $allowed = [
            'goal', 'missed_shot', 'foul', 'card_yellow', 'card_red',
            'corner', 'substitution', 'timeout', 'match_paused', 'match_resumed',
            'period_started', 'period_ended', 'match_ended'
        ];

        if (!in_array($type, $allowed)) {
            throw ValidationException::withMessages([
                'type' => ["Le type d'événement '{$type}' n'est pas autorisé pour le Futsal FIFA."]
            ]);
        }

        if ($type === 'timeout') {
            $side = $eventData['team_side'];
            $period = $match->current_period;
            $state = $match->rules_state ?? [];
            $sideSuffix = ($side === 'team_a') ? 'a' : 'b';
            $key = "timeouts_taken_period_{$period}_{$sideSuffix}";
            $taken = $state[$key] ?? 0;
            if ($taken >= 1) {
                throw ValidationException::withMessages([
                    'timeout' => ["L'équipe {$side} a déjà utilisé son temps mort autorisé (1 par période en Futsal FIFA)."]
                ]);
            }
        }
    }

    public function applyEvent(SportMatch $match, array $eventData): array
    {
        $type = $eventData['type'];
        $side = $eventData['team_side'];
        $state = $match->rules_state ?? [];
        $currentPeriod = $match->current_period;

        if ($type === 'goal') {
            if ($side === 'team_a') {
                $match->increment('score_team_a');
            } else {
                $match->increment('score_team_b');
            }

            // Check if opposing team had an active expulsion: a goal ends the expulsion early (FIFA Rule 12)
            $opposingSide = ($side === 'team_a') ? 'team_b' : 'team_a';
            if (!empty($state['active_expulsions'])) {
                $state['active_expulsions'] = array_values(array_filter(
                    $state['active_expulsions'],
                    fn ($exp) => $exp['team_side'] !== $opposingSide
                ));
            }
        } elseif ($type === 'foul') {
            if ($side === 'team_a') {
                $match->increment('team_a_fouls');
            } else {
                $match->increment('team_b_fouls');
            }

            $foulKey = "period_{$currentPeriod}_fouls_" . ($side === 'team_a' ? 'a' : 'b');
            $state[$foulKey] = ($state[$foulKey] ?? 0) + 1;
        } elseif ($type === 'card_yellow') {
            if (!empty($eventData['player_id'])) {
                $mp = MatchPlayer::where('match_id', $match->id)
                    ->where('user_id', $eventData['player_id'])
                    ->first();
                if ($mp) {
                    $mp->increment('yellow_cards');
                    // 2nd yellow card = red card
                    if ($mp->yellow_cards >= 2) {
                        $mp->increment('red_cards');
                        $state['active_expulsions'][] = [
                            'team_side' => $side,
                            'player_id' => $eventData['player_id'],
                            'penalty_ends_at_second' => ($match->period_elapsed_seconds ?? 0) + 120,
                        ];
                    }
                }
            }
        } elseif ($type === 'card_red') {
            if (!empty($eventData['player_id'])) {
                $mp = MatchPlayer::where('match_id', $match->id)
                    ->where('user_id', $eventData['player_id'])
                    ->first();
                if ($mp) {
                    $mp->increment('red_cards');
                    $mp->update(['is_on_court' => false]);
                }
            }
            $state['active_expulsions'][] = [
                'team_side' => $side,
                'player_id' => $eventData['player_id'] ?? null,
                'penalty_ends_at_second' => ($match->period_elapsed_seconds ?? 0) + 120,
            ];
        } elseif ($type === 'timeout') {
            $key = "timeouts_taken_period_{$currentPeriod}_" . ($side === 'team_a' ? 'a' : 'b');
            $state[$key] = ($state[$key] ?? 0) + 1;
            if ($side === 'team_a') {
                $match->increment('team_a_timeouts');
            } else {
                $match->increment('team_b_timeouts');
            }
        }

        $match->rules_state = $state;
        $match->save();

        return [
            'is_penalty_10m' => ($side === 'team_a' ? $match->team_a_fouls : $match->team_b_fouls) >= 6,
            'rules_state' => $state,
        ];
    }

    public function cancelEvent(SportMatch $match, MatchEvent $event): void
    {
        $activeEvents = $match->activeEvents;
        $scoreA = $activeEvents->where('type', 'goal')->where('team_side', 'team_a')->count();
        $scoreB = $activeEvents->where('type', 'goal')->where('team_side', 'team_b')->count();

        $foulsA = $activeEvents->where('type', 'foul')->where('team_side', 'team_a')->where('period', $match->current_period)->count();
        $foulsB = $activeEvents->where('type', 'foul')->where('team_side', 'team_b')->where('period', $match->current_period)->count();

        $match->update([
            'score_team_a' => $scoreA,
            'score_team_b' => $scoreB,
            'team_a_fouls' => $foulsA,
            'team_b_fouls' => $foulsB,
        ]);
    }

    public function calculateStatistics(SportMatch $match): array
    {
        $events = $match->activeEvents;
        $players = $match->matchPlayers()->with('user')->get();

        $teamA = $this->initTeamStats();
        $teamB = $this->initTeamStats();

        $periodScores = [
            1 => ['period' => 1, 'team_a' => 0, 'team_b' => 0],
            2 => ['period' => 2, 'team_a' => 0, 'team_b' => 0],
        ];

        $playerStats = [];
        foreach ($players as $p) {
            $playerStats[$p->user_id] = [
                'user_id' => $p->user_id,
                'username' => $p->user->username ?? 'Joueur #' . $p->jersey_number,
                'photo_url' => $p->user->photo_url ?? null,
                'jersey_number' => $p->jersey_number,
                'position' => $p->position,
                'team_side' => $p->team_side,
                'is_on_court' => (bool)$p->is_on_court,
                'seconds_played' => (int)$p->seconds_played,
                'minutes_formatted' => sprintf('%02d:%02d', floor($p->seconds_played / 60), $p->seconds_played % 60),
                'goals' => 0,
                'assists' => 0,
                'shots_on_target' => 0,
                'shots_off_target' => 0,
                'total_shots' => 0,
                'shot_accuracy_pct' => 0.0,
                'fouls' => 0,
                'yellow_cards' => (int)$p->yellow_cards,
                'red_cards' => (int)$p->red_cards,
            ];
        }

        foreach ($events as $ev) {
            $side = $ev->team_side;
            $pid = $ev->player_id;
            $period = $ev->period ?: 1;
            if (!isset($periodScores[$period])) {
                $periodScores[$period] = ['period' => $period, 'team_a' => 0, 'team_b' => 0];
            }

            if ($ev->type === 'goal') {
                if ($side === 'team_a') {
                    $teamA['goals']++;
                    $teamA['shots_on_target']++;
                    $teamA['total_shots']++;
                    $periodScores[$period]['team_a']++;
                } else {
                    $teamB['goals']++;
                    $teamB['shots_on_target']++;
                    $teamB['total_shots']++;
                    $periodScores[$period]['team_b']++;
                }
                if ($pid && isset($playerStats[$pid])) {
                    $playerStats[$pid]['goals']++;
                    $playerStats[$pid]['shots_on_target']++;
                    $playerStats[$pid]['total_shots']++;
                }
                if ($ev->related_player_id && isset($playerStats[$ev->related_player_id])) {
                    $playerStats[$ev->related_player_id]['assists']++;
                    if ($side === 'team_a') $teamA['assists']++; else $teamB['assists']++;
                }
            } elseif ($ev->type === 'missed_shot') {
                $isOnTarget = ($ev->shot_result === 'saved' || $ev->action_detail === 'on_target');
                $targetTeam = $side === 'team_a' ? $teamA : $teamB;
                if ($isOnTarget) {
                    $targetTeam['shots_on_target']++;
                } else {
                    $targetTeam['shots_off_target']++;
                }
                $targetTeam['total_shots']++;
                if ($side === 'team_a') $teamA = $targetTeam; else $teamB = $targetTeam;

                if ($pid && isset($playerStats[$pid])) {
                    if ($isOnTarget) $playerStats[$pid]['shots_on_target']++;
                    else $playerStats[$pid]['shots_off_target']++;
                    $playerStats[$pid]['total_shots']++;
                }
            } elseif ($ev->type === 'foul') {
                if ($side === 'team_a') $teamA['fouls']++; else $teamB['fouls']++;
                if ($pid && isset($playerStats[$pid])) $playerStats[$pid]['fouls']++;
            } elseif ($ev->type === 'corner') {
                if ($side === 'team_a') $teamA['corners']++; else $teamB['corners']++;
            } elseif ($ev->type === 'card_yellow') {
                if ($side === 'team_a') $teamA['yellow_cards']++; else $teamB['yellow_cards']++;
            } elseif ($ev->type === 'card_red') {
                if ($side === 'team_a') $teamA['red_cards']++; else $teamB['red_cards']++;
            }
        }

        // Compute accuracies
        $teamA['shot_accuracy_pct'] = $teamA['total_shots'] > 0 ? round(($teamA['shots_on_target'] / $teamA['total_shots']) * 100, 1) : 0.0;
        $teamB['shot_accuracy_pct'] = $teamB['total_shots'] > 0 ? round(($teamB['shots_on_target'] / $teamB['total_shots']) * 100, 1) : 0.0;

        foreach ($playerStats as $uid => $ps) {
            $playerStats[$uid]['shot_accuracy_pct'] = $ps['total_shots'] > 0 ? round(($ps['shots_on_target'] / $ps['total_shots']) * 100, 1) : 0.0;
        }

        return [
            'collective' => [
                'team_a' => $teamA,
                'team_b' => $teamB,
            ],
            'period_scores' => array_values($periodScores),
            'players' => [
                'team_a' => array_values(array_filter($playerStats, fn ($p) => $p['team_side'] === 'team_a')),
                'team_b' => array_values(array_filter($playerStats, fn ($p) => $p['team_side'] === 'team_b')),
                'all' => array_values($playerStats),
            ],
        ];
    }

    public function checkVictoryConditions(SportMatch $match): ?string
    {
        if ($match->status !== 'finished') {
            return null;
        }
        if ($match->score_team_a > $match->score_team_b) {
            return 'team_a';
        } elseif ($match->score_team_b > $match->score_team_a) {
            return 'team_b';
        }
        return 'draw';
    }

    public function getScoreboardData(SportMatch $match): array
    {
        $state = $match->rules_state ?? [];
        $players = $match->matchPlayers()->with('user')->get();
        $events  = $match->activeEvents;

        // Build top scorers list
        $topScorers = [];
        foreach ($events->where('type', 'goal') as $ev) {
            $pid = $ev->player_id;
            if (!$pid) continue;
            if (!isset($topScorers[$pid])) {
                $player = $players->firstWhere('user_id', $pid);
                $topScorers[$pid] = [
                    'player_id'      => $pid,
                    'username'       => $player?->user?->username ?? "#{$pid}",
                    'jersey_number'  => $player?->jersey_number,
                    'team_side'      => $ev->team_side,
                    'goals'          => 0,
                    'assists'        => 0,
                ];
            }
            $topScorers[$pid]['goals']++;
        }
        // Build assists list
        foreach ($events->where('type', 'goal') as $ev) {
            $aid = $ev->related_player_id;
            if (!$aid) continue;
            if (!isset($topScorers[$aid])) {
                $player = $players->firstWhere('user_id', $aid);
                $topScorers[$aid] = [
                    'player_id'     => $aid,
                    'username'      => $player?->user?->username ?? "#{$aid}",
                    'jersey_number' => $player?->jersey_number,
                    'team_side'     => $player?->team_side,
                    'goals'         => 0,
                    'assists'       => 0,
                ];
            }
            $topScorers[$aid]['assists']++;
        }
        usort($topScorers, fn ($a, $b) => ($b['goals'] * 3 + $b['assists']) <=> ($a['goals'] * 3 + $a['assists']));

        // Enrich active expulsions with username and period_seconds_remaining
        $enrichedExpulsions = array_map(function (array $exp) use ($match, $players) {
            $player = $players->firstWhere('user_id', $exp['player_id'] ?? null);
            $secondsRemaining = max(0, ($exp['penalty_ends_at_second'] ?? 0) - ($match->period_elapsed_seconds ?? 0));
            return array_merge($exp, [
                'username'          => $player?->user?->username ?? 'Joueur',
                'jersey_number'     => $player?->jersey_number,
                'seconds_remaining' => $secondsRemaining,
                'minutes_remaining' => sprintf('%d:%02d', intdiv($secondsRemaining, 60), $secondsRemaining % 60),
            ]);
        }, $state['active_expulsions'] ?? []);

        return [
            'sport'                   => 'futsal',
            'official_body'           => 'FIFA',
            'is_penalty_10m_team_a'   => $match->team_a_fouls >= 6,
            'is_penalty_10m_team_b'   => $match->team_b_fouls >= 6,
            'accumulated_fouls_a'     => $match->team_a_fouls,
            'accumulated_fouls_b'     => $match->team_b_fouls,
            'timeouts_available_a'    => max(0, 1 - ($state["timeouts_taken_period_{$match->current_period}_a"] ?? 0)),
            'timeouts_available_b'    => max(0, 1 - ($state["timeouts_taken_period_{$match->current_period}_b"] ?? 0)),
            'active_expulsions'       => $enrichedExpulsions,
            'top_scorers'             => array_values($topScorers),
            'period_fouls'            => [
                'team_a' => $state["period_{$match->current_period}_fouls_a"] ?? 0,
                'team_b' => $state["period_{$match->current_period}_fouls_b"] ?? 0,
            ],
        ];
    }

    private function initTeamStats(): array
    {
        return [
            'goals' => 0,
            'assists' => 0,
            'shots_on_target' => 0,
            'shots_off_target' => 0,
            'total_shots' => 0,
            'shot_accuracy_pct' => 0.0,
            'fouls' => 0,
            'corners' => 0,
            'yellow_cards' => 0,
            'red_cards' => 0,
        ];
    }
}
