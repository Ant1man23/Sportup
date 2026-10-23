<?php

namespace App\Domain\Sports\Engines;

use App\Domain\Sports\Contracts\SportRulesEngineInterface;
use App\Models\MatchEvent;
use App\Models\MatchPlayer;
use App\Models\SportMatch;
use Illuminate\Validation\ValidationException;

class Basketball3x3RulesEngine implements SportRulesEngineInterface
{
    public function getSportSlug(): string
    {
        return 'basketball-3x3';
    }

    public function getOfficialBody(): string
    {
        return 'FIBA';
    }

    public function getOfficialRulesVersion(): string
    {
        return 'FIBA 3x3 Official Rules 2024';
    }

    public function getDefaultRulesProfile(): array
    {
        return [
            'id' => 'fiba_3x3_official',
            'periods' => 1,
            'period_duration_seconds' => 600, // 10 minutes
            'target_score' => 21, // 21 pts = sudden death regulation win
            'shot_clock_seconds' => 12,
            'players_on_court' => 3,
            'overtime_target_lead_points' => 2, // First team to score 2 pts in OT wins
            'team_foul_penalty_threshold_1' => 7,  // 7-9 fouls = 2 FT
            'team_foul_penalty_threshold_2' => 10, // 10+ fouls = 2 FT + ball possession
            'timeouts_allowed' => 1,
            'timeout_duration_seconds' => 30,
        ];
    }

    public function initializeMatch(SportMatch $match, array $options = []): void
    {
        $match->update([
            'total_periods' => 1,
            'current_period' => 1,
            'period_duration_seconds' => $options['period_duration_seconds'] ?? 600,
            'target_score' => 21,
            'shot_clock_seconds' => 12,
            'rules_profile' => $options['rules_profile'] ?? 'fiba_3x3_official',
            'rules_state' => [
                'overtime_active' => false,
                'overtime_start_score_a' => null,
                'overtime_start_score_b' => null,
                'possession_side' => 'team_a',
                'shot_clock_remaining' => 12,
                'timeouts_taken_a' => 0,
                'timeouts_taken_b' => 0,
            ],
        ]);
    }

    public function validateEvent(SportMatch $match, array $eventData): void
    {
        $type = $eventData['type'] ?? '';
        $allowed = [
            'basket', 'free_throw', 'missed_shot', 'rebound', 'assist',
            'foul', 'steal', 'block', 'turnover', 'substitution',
            'timeout', 'shot_clock_reset', 'shot_clock_violation',
            'period_started', 'period_ended', 'match_paused', 'match_resumed', 'match_ended'
        ];

        if (!in_array($type, $allowed)) {
            throw ValidationException::withMessages([
                'type' => ["L'événement '{$type}' n'est pas valide pour le Basketball 3x3 FIBA."]
            ]);
        }

        // 3x3 FIBA Rule: baskets are strictly 1 point or 2 points (NO 3 points!)
        if ($type === 'basket' && isset($eventData['points'])) {
            if ($eventData['points'] > 2 || $eventData['points'] < 1) {
                throw ValidationException::withMessages([
                    'points' => ["Au basketball 3x3 FIBA, les paniers valent uniquement 1 point (dans l'arc) ou 2 points (derrière l'arc)."]
                ]);
            }
        }
    }

    public function applyEvent(SportMatch $match, array $eventData): array
    {
        $type = $eventData['type'];
        $side = $eventData['team_side'];
        $pts = $eventData['points'] ?? null;
        $state = $match->rules_state ?? [];

        if ($type === 'basket') {
            $points = $pts ?? 1;
            if ($side === 'team_a') {
                $match->increment('score_team_a', $points);
            } else {
                $match->increment('score_team_b', $points);
            }
            // After score, reset shot clock to 12s
            $match->shot_clock_seconds = 12;
            $state['shot_clock_remaining'] = 12;
            $state['possession_side'] = ($side === 'team_a') ? 'team_b' : 'team_a';
        } elseif ($type === 'free_throw') {
            $isMade = ($eventData['shot_result'] ?? 'made') === 'made';
            if ($isMade) {
                if ($side === 'team_a') {
                    $match->increment('score_team_a', 1);
                } else {
                    $match->increment('score_team_b', 1);
                }
            }
            $match->shot_clock_seconds = 12;
        } elseif ($type === 'foul') {
            if ($side === 'team_a') {
                $match->increment('team_a_fouls');
            } else {
                $match->increment('team_b_fouls');
            }
        } elseif ($type === 'timeout') {
            $key = ($side === 'team_a') ? 'timeouts_taken_a' : 'timeouts_taken_b';
            $state[$key] = ($state[$key] ?? 0) + 1;
        }

        $match->rules_state = $state;
        $match->save();

        // Check FIBA 3x3 Victory Condition (21 pts in regular, or +2 in OT)
        $victory = $this->checkVictoryConditions($match);
        if ($victory) {
            $match->status = 'finished';
            $match->finished_at = now();
            $match->save();
        }

        $teamFouls = ($side === 'team_a') ? $match->team_a_fouls : $match->team_b_fouls;

        return [
            'is_target_reached' => $victory !== null,
            'foul_penalty_status' => $teamFouls >= 10 ? 'two_ft_and_possession' : ($teamFouls >= 7 ? 'two_ft' : 'standard'),
            'victory_team' => $victory,
        ];
    }

    public function cancelEvent(SportMatch $match, MatchEvent $event): void
    {
        $activeEvents = $match->activeEvents;
        $scoreA = 0;
        $scoreB = 0;
        $foulsA = 0;
        $foulsB = 0;

        foreach ($activeEvents as $ev) {
            if ($ev->type === 'basket') {
                $p = $ev->points ?: 1;
                if ($ev->team_side === 'team_a') $scoreA += $p; else $scoreB += $p;
            } elseif ($ev->type === 'free_throw' && ($ev->shot_result === 'made' || $ev->points === 1)) {
                if ($ev->team_side === 'team_a') $scoreA += 1; else $scoreB += 1;
            } elseif ($ev->type === 'foul') {
                if ($ev->team_side === 'team_a') $foulsA++; else $foulsB++;
            }
        }

        $match->update([
            'score_team_a' => $scoreA,
            'score_team_b' => $scoreB,
            'team_a_fouls' => $foulsA,
            'team_b_fouls' => $foulsB,
            'status' => ($scoreA < 21 && $scoreB < 21) ? 'in_progress' : $match->status,
        ]);
    }

    public function calculateStatistics(SportMatch $match): array
    {
        $events = $match->activeEvents;
        $players = $match->matchPlayers()->with('user')->get();

        $teamA = $this->initTeamStats();
        $teamB = $this->initTeamStats();

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
                'points' => 0,
                'one_pt_made' => 0,
                'one_pt_attempted' => 0,
                'one_pt_pct' => 0.0,
                'two_pt_made' => 0,
                'two_pt_attempted' => 0,
                'two_pt_pct' => 0.0,
                'ft_made' => 0,
                'ft_attempted' => 0,
                'ft_pct' => 0.0,
                'fg_made' => 0,
                'fg_attempted' => 0,
                'fg_pct' => 0.0,
                'rebounds' => 0,
                'assists' => 0,
                'steals' => 0,
                'blocks' => 0,
                'turnovers' => 0,
                'fouls' => 0,
            ];
        }

        foreach ($events as $ev) {
            $side = $ev->team_side;
            $pid = $ev->player_id;
            $pts = $ev->points ?: 1;
            $targetTeam = $side === 'team_a' ? $teamA : $teamB;

            if ($ev->type === 'basket') {
                $targetTeam['points'] += $pts;
                $targetTeam['fg_made']++;
                $targetTeam['fg_attempted']++;

                if ($pts === 2) {
                    $targetTeam['two_pt_made']++;
                    $targetTeam['two_pt_attempted']++;
                } else {
                    $targetTeam['one_pt_made']++;
                    $targetTeam['one_pt_attempted']++;
                }

                if ($pid && isset($playerStats[$pid])) {
                    $playerStats[$pid]['points'] += $pts;
                    $playerStats[$pid]['fg_made']++;
                    $playerStats[$pid]['fg_attempted']++;
                    if ($pts === 2) {
                        $playerStats[$pid]['two_pt_made']++;
                        $playerStats[$pid]['two_pt_attempted']++;
                    } else {
                        $playerStats[$pid]['one_pt_made']++;
                        $playerStats[$pid]['one_pt_attempted']++;
                    }
                }

                if ($ev->related_player_id && isset($playerStats[$ev->related_player_id])) {
                    $playerStats[$ev->related_player_id]['assists']++;
                    $targetTeam['assists']++;
                }
            } elseif ($ev->type === 'free_throw') {
                $isMade = ($ev->shot_result === 'made' || $ev->points === 1);
                $targetTeam['ft_attempted']++;
                if ($isMade) {
                    $targetTeam['ft_made']++;
                    $targetTeam['points'] += 1;
                }
                if ($pid && isset($playerStats[$pid])) {
                    $playerStats[$pid]['ft_attempted']++;
                    if ($isMade) {
                        $playerStats[$pid]['ft_made']++;
                        $playerStats[$pid]['points'] += 1;
                    }
                }
            } elseif ($ev->type === 'missed_shot') {
                $targetTeam['fg_attempted']++;
                $is2pt = ($ev->shot_type === '2pt' || $ev->points === 2);
                if ($is2pt) {
                    $targetTeam['two_pt_attempted']++;
                } else {
                    $targetTeam['one_pt_attempted']++;
                }
                if ($pid && isset($playerStats[$pid])) {
                    $playerStats[$pid]['fg_attempted']++;
                    if ($is2pt) $playerStats[$pid]['two_pt_attempted']++; else $playerStats[$pid]['one_pt_attempted']++;
                }
            } elseif ($ev->type === 'rebound') {
                $targetTeam['rebounds']++;
                if ($pid && isset($playerStats[$pid])) $playerStats[$pid]['rebounds']++;
            } elseif ($ev->type === 'assist') {
                $targetTeam['assists']++;
                if ($pid && isset($playerStats[$pid])) $playerStats[$pid]['assists']++;
            } elseif ($ev->type === 'steal') {
                $targetTeam['steals']++;
                if ($pid && isset($playerStats[$pid])) $playerStats[$pid]['steals']++;
            } elseif ($ev->type === 'block') {
                $targetTeam['blocks']++;
                if ($pid && isset($playerStats[$pid])) $playerStats[$pid]['blocks']++;
            } elseif ($ev->type === 'turnover') {
                $targetTeam['turnovers']++;
                if ($pid && isset($playerStats[$pid])) $playerStats[$pid]['turnovers']++;
            } elseif ($ev->type === 'foul') {
                $targetTeam['fouls']++;
                if ($pid && isset($playerStats[$pid])) $playerStats[$pid]['fouls']++;
            }

            if ($side === 'team_a') $teamA = $targetTeam; else $teamB = $targetTeam;
        }

        // Percentages
        foreach (['team_a' => &$teamA, 'team_b' => &$teamB] as &$t) {
            $t['fg_pct'] = $t['fg_attempted'] > 0 ? round(($t['fg_made'] / $t['fg_attempted']) * 100, 1) : 0.0;
            $t['one_pt_pct'] = $t['one_pt_attempted'] > 0 ? round(($t['one_pt_made'] / $t['one_pt_attempted']) * 100, 1) : 0.0;
            $t['two_pt_pct'] = $t['two_pt_attempted'] > 0 ? round(($t['two_pt_made'] / $t['two_pt_attempted']) * 100, 1) : 0.0;
            $t['ft_pct'] = $t['ft_attempted'] > 0 ? round(($t['ft_made'] / $t['ft_attempted']) * 100, 1) : 0.0;
        }

        foreach ($playerStats as $uid => $ps) {
            $playerStats[$uid]['fg_pct'] = $ps['fg_attempted'] > 0 ? round(($ps['fg_made'] / $ps['fg_attempted']) * 100, 1) : 0.0;
            $playerStats[$uid]['one_pt_pct'] = $ps['one_pt_attempted'] > 0 ? round(($ps['one_pt_made'] / $ps['one_pt_attempted']) * 100, 1) : 0.0;
            $playerStats[$uid]['two_pt_pct'] = $ps['two_pt_attempted'] > 0 ? round(($ps['two_pt_made'] / $ps['two_pt_attempted']) * 100, 1) : 0.0;
            $playerStats[$uid]['ft_pct'] = $ps['ft_attempted'] > 0 ? round(($ps['ft_made'] / $ps['ft_attempted']) * 100, 1) : 0.0;
        }

        return [
            'collective' => [
                'team_a' => $teamA,
                'team_b' => $teamB,
            ],
            'period_scores' => [
                ['period' => 1, 'team_a' => $teamA['points'], 'team_b' => $teamB['points']]
            ],
            'players' => [
                'team_a' => array_values(array_filter($playerStats, fn ($p) => $p['team_side'] === 'team_a')),
                'team_b' => array_values(array_filter($playerStats, fn ($p) => $p['team_side'] === 'team_b')),
                'all' => array_values($playerStats),
            ],
        ];
    }

    public function checkVictoryConditions(SportMatch $match): ?string
    {
        $scoreA = $match->score_team_a;
        $scoreB = $match->score_team_b;
        $state = $match->rules_state ?? [];
        $isOvertime = $state['overtime_active'] ?? false;

        // 1. Regular time target condition: first team to reach 21 points wins immediately!
        if (!$isOvertime) {
            if ($scoreA >= 21) {
                return 'team_a';
            }
            if ($scoreB >= 21) {
                return 'team_b';
            }
        }

        // 2. Overtime condition: first team to score 2 points in overtime wins
        if ($isOvertime) {
            $otStartA = $state['overtime_start_score_a'] ?? 0;
            $otStartB = $state['overtime_start_score_b'] ?? 0;
            if (($scoreA - $otStartA) >= 2) {
                return 'team_a';
            }
            if (($scoreB - $otStartB) >= 2) {
                return 'team_b';
            }
        }

        // 3. Time expiration
        if ($match->status === 'finished') {
            if ($scoreA > $scoreB) return 'team_a';
            if ($scoreB > $scoreA) return 'team_b';
            return 'draw';
        }

        return null;
    }

    public function getScoreboardData(SportMatch $match): array
    {
        $state = $match->rules_state ?? [];
        return [
            'sport' => 'basketball-3x3',
            'official_body' => 'FIBA',
            'shot_clock_seconds' => $match->shot_clock_seconds ?? 12,
            'target_score' => 21,
            'points_to_win_a' => max(0, 21 - $match->score_team_a),
            'points_to_win_b' => max(0, 21 - $match->score_team_b),
            'foul_penalty_a' => $match->team_a_fouls >= 10 ? '2_FT_AND_POSSESSION' : ($match->team_a_fouls >= 7 ? '2_FT' : 'NORMAL'),
            'foul_penalty_b' => $match->team_b_fouls >= 10 ? '2_FT_AND_POSSESSION' : ($match->team_b_fouls >= 7 ? '2_FT' : 'NORMAL'),
            'possession_side' => $state['possession_side'] ?? 'team_a',
            'is_overtime' => $state['overtime_active'] ?? false,
        ];
    }

    private function initTeamStats(): array
    {
        return [
            'points' => 0,
            'one_pt_made' => 0,
            'one_pt_attempted' => 0,
            'one_pt_pct' => 0.0,
            'two_pt_made' => 0,
            'two_pt_attempted' => 0,
            'two_pt_pct' => 0.0,
            'ft_made' => 0,
            'ft_attempted' => 0,
            'ft_pct' => 0.0,
            'fg_made' => 0,
            'fg_attempted' => 0,
            'fg_pct' => 0.0,
            'rebounds' => 0,
            'assists' => 0,
            'steals' => 0,
            'blocks' => 0,
            'turnovers' => 0,
            'fouls' => 0,
        ];
    }
}
