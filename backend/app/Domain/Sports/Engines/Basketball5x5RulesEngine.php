<?php

namespace App\Domain\Sports\Engines;

use App\Domain\Sports\Contracts\SportRulesEngineInterface;
use App\Models\MatchEvent;
use App\Models\MatchPlayer;
use App\Models\SportMatch;
use Illuminate\Validation\ValidationException;

class Basketball5x5RulesEngine implements SportRulesEngineInterface
{
    public function getSportSlug(): string
    {
        return 'basketball-5x5';
    }

    public function getOfficialBody(): string
    {
        return 'FIBA';
    }

    public function getOfficialRulesVersion(): string
    {
        return 'FIBA Official Basketball Rules 2024';
    }

    public function getDefaultRulesProfile(): array
    {
        return [
            'id' => 'fiba_5x5_official',
            'periods' => 4,
            'period_duration_seconds' => 600, // 10 minutes per quarter
            'overtime_duration_seconds' => 300, // 5 minutes
            'shot_clock_seconds' => 24,
            'shot_clock_offensive_rebound_seconds' => 14,
            'players_on_court' => 5,
            'max_personal_fouls_before_disqualification' => 5,
            'team_foul_penalty_quarter_threshold' => 5, // 5th foul = penalty
            'timeouts_half_1' => 2,
            'timeouts_half_2' => 3,
            'timeouts_overtime' => 1,
        ];
    }

    public function initializeMatch(SportMatch $match, array $options = []): void
    {
        $match->update([
            'total_periods' => 4,
            'current_period' => 1,
            'period_duration_seconds' => $options['period_duration_seconds'] ?? 600,
            'shot_clock_seconds' => 24,
            'rules_profile' => $options['rules_profile'] ?? 'fiba_5x5_official',
            'rules_state' => [
                'shot_clock_remaining' => 24,
                'possession_arrow' => 'team_b', // Alternating possession after jump ball
                'timeouts_taken_half_1_a' => 0,
                'timeouts_taken_half_1_b' => 0,
                'timeouts_taken_half_2_a' => 0,
                'timeouts_taken_half_2_b' => 0,
            ],
        ]);
    }

    public function validateEvent(SportMatch $match, array $eventData): void
    {
        $type = $eventData['type'] ?? '';
        $allowed = [
            'basket', 'free_throw', 'missed_shot', 'rebound', 'assist',
            'foul', 'steal', 'block', 'turnover', 'substitution',
            'timeout', 'shot_clock_reset_24', 'shot_clock_reset_14',
            'shot_clock_violation', 'period_started', 'period_ended',
            'match_paused', 'match_resumed', 'match_ended'
        ];

        if (!in_array($type, $allowed)) {
            throw ValidationException::withMessages([
                'type' => ["L'événement '{$type}' n'est pas autorisé en Basketball 5x5 FIBA."]
            ]);
        }

        // Check 5 personal fouls disqualification rule (FIBA Rule 40)
        if ($type === 'foul' && !empty($eventData['player_id'])) {
            $mp = MatchPlayer::where('match_id', $match->id)
                ->where('user_id', $eventData['player_id'])
                ->first();
            if ($mp && $mp->fouls_count >= 5) {
                throw ValidationException::withMessages([
                    'player_id' => ["Le joueur #{$mp->jersey_number} a déjà commis 5 fautes personnelles et est disqualifié du match selon les règles FIBA."]
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
            $points = $pts ?? 2;
            if ($side === 'team_a') {
                $match->increment('score_team_a', $points);
            } else {
                $match->increment('score_team_b', $points);
            }
            $match->shot_clock_seconds = 24;
            $state['shot_clock_remaining'] = 24;
        } elseif ($type === 'free_throw') {
            $isMade = ($eventData['shot_result'] ?? 'made') === 'made';
            if ($isMade) {
                if ($side === 'team_a') {
                    $match->increment('score_team_a', 1);
                } else {
                    $match->increment('score_team_b', 1);
                }
            }
        } elseif ($type === 'foul') {
            if ($side === 'team_a') {
                $match->increment('team_a_fouls');
            } else {
                $match->increment('team_b_fouls');
            }

            if (!empty($eventData['player_id'])) {
                $mp = MatchPlayer::where('match_id', $match->id)
                    ->where('user_id', $eventData['player_id'])
                    ->first();
                if ($mp) {
                    $mp->increment('fouls_count');
                    if ($mp->fouls_count >= 5) {
                        $mp->update(['is_on_court' => false]);
                    }
                }
            }
        } elseif ($type === 'rebound') {
            // Offensive rebound resets shot clock to 14 seconds (FIBA Rule 29.2.1)
            if (($eventData['rebound_type'] ?? '') === 'offensive') {
                $match->shot_clock_seconds = 14;
                $state['shot_clock_remaining'] = 14;
            } else {
                $match->shot_clock_seconds = 24;
                $state['shot_clock_remaining'] = 24;
            }
        } elseif ($type === 'shot_clock_reset_14') {
            $match->shot_clock_seconds = 14;
            $state['shot_clock_remaining'] = 14;
        } elseif ($type === 'shot_clock_reset_24') {
            $match->shot_clock_seconds = 24;
            $state['shot_clock_remaining'] = 24;
        }

        $match->rules_state = $state;
        $match->save();

        $quarterFouls = ($side === 'team_a') ? $match->team_a_fouls : $match->team_b_fouls;

        return [
            'is_penalty_situation' => $quarterFouls >= 5,
            'shot_clock_seconds' => $match->shot_clock_seconds,
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
                $p = $ev->points ?: 2;
                if ($ev->team_side === 'team_a') $scoreA += $p; else $scoreB += $p;
            } elseif ($ev->type === 'free_throw' && ($ev->shot_result === 'made' || $ev->points === 1)) {
                if ($ev->team_side === 'team_a') $scoreA += 1; else $scoreB += 1;
            } elseif ($ev->type === 'foul' && $ev->period === $match->current_period) {
                if ($ev->team_side === 'team_a') $foulsA++; else $foulsB++;
            }
        }

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

        $periodScores = [];
        $totalPeriods = max(4, $match->total_periods, $match->current_period);
        for ($i = 1; $i <= $totalPeriods; $i++) {
            $periodScores[$i] = ['period' => $i, 'team_a' => 0, 'team_b' => 0];
        }

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
                'two_pt_made' => 0,
                'two_pt_attempted' => 0,
                'two_pt_pct' => 0.0,
                'three_pt_made' => 0,
                'three_pt_attempted' => 0,
                'three_pt_pct' => 0.0,
                'ft_made' => 0,
                'ft_attempted' => 0,
                'ft_pct' => 0.0,
                'fg_made' => 0,
                'fg_attempted' => 0,
                'fg_pct' => 0.0,
                'rebounds_offensive' => 0,
                'rebounds_defensive' => 0,
                'rebounds_total' => 0,
                'assists' => 0,
                'steals' => 0,
                'blocks' => 0,
                'turnovers' => 0,
                'fouls' => (int)$p->fouls_count,
                'efficiency' => 0, // FIBA Efficiency Rating: (PTS + REB + AST + STL + BLK - Missed FG - Missed FT - TO)
            ];
        }

        foreach ($events as $ev) {
            $side = $ev->team_side;
            $pid = $ev->player_id;
            $period = $ev->period ?: 1;
            if (!isset($periodScores[$period])) {
                $periodScores[$period] = ['period' => $period, 'team_a' => 0, 'team_b' => 0];
            }
            $targetTeam = $side === 'team_a' ? $teamA : $teamB;

            if ($ev->type === 'basket') {
                $pts = $ev->points ?: 2;
                $targetTeam['points'] += $pts;
                $periodScores[$period][$side] += $pts;
                $targetTeam['fg_made']++;
                $targetTeam['fg_attempted']++;

                if ($pts === 3) {
                    $targetTeam['three_pt_made']++;
                    $targetTeam['three_pt_attempted']++;
                } elseif ($pts === 1) {
                    $targetTeam['ft_made']++;
                    $targetTeam['ft_attempted']++;
                } else {
                    $targetTeam['two_pt_made']++;
                    $targetTeam['two_pt_attempted']++;
                }

                if ($pid && isset($playerStats[$pid])) {
                    $playerStats[$pid]['points'] += $pts;
                    $playerStats[$pid]['fg_made']++;
                    $playerStats[$pid]['fg_attempted']++;
                    if ($pts === 3) {
                        $playerStats[$pid]['three_pt_made']++;
                        $playerStats[$pid]['three_pt_attempted']++;
                    } elseif ($pts === 1) {
                        $playerStats[$pid]['ft_made']++;
                        $playerStats[$pid]['ft_attempted']++;
                    } else {
                        $playerStats[$pid]['two_pt_made']++;
                        $playerStats[$pid]['two_pt_attempted']++;
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
                    $periodScores[$period][$side] += 1;
                }
                if ($pid && isset($playerStats[$pid])) {
                    $playerStats[$pid]['ft_attempted']++;
                    if ($isMade) {
                        $playerStats[$pid]['ft_made']++;
                        $playerStats[$pid]['points'] += 1;
                    }
                }
            } elseif ($ev->type === 'missed_shot') {
                $is3 = ($ev->shot_type === '3pt' || $ev->points === 3);
                $isFT = ($ev->shot_type === 'free_throw' || $ev->points === 1);
                if ($isFT) {
                    $targetTeam['ft_attempted']++;
                    if ($pid && isset($playerStats[$pid])) $playerStats[$pid]['ft_attempted']++;
                } elseif ($is3) {
                    $targetTeam['three_pt_attempted']++;
                    $targetTeam['fg_attempted']++;
                    if ($pid && isset($playerStats[$pid])) {
                        $playerStats[$pid]['three_pt_attempted']++;
                        $playerStats[$pid]['fg_attempted']++;
                    }
                } else {
                    $targetTeam['two_pt_attempted']++;
                    $targetTeam['fg_attempted']++;
                    if ($pid && isset($playerStats[$pid])) {
                        $playerStats[$pid]['two_pt_attempted']++;
                        $playerStats[$pid]['fg_attempted']++;
                    }
                }
            } elseif ($ev->type === 'rebound') {
                $isOff = ($ev->rebound_type === 'offensive');
                if ($isOff) $targetTeam['rebounds_offensive']++; else $targetTeam['rebounds_defensive']++;
                $targetTeam['rebounds_total']++;
                if ($pid && isset($playerStats[$pid])) {
                    if ($isOff) $playerStats[$pid]['rebounds_offensive']++; else $playerStats[$pid]['rebounds_defensive']++;
                    $playerStats[$pid]['rebounds_total']++;
                }
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

        // Compute percentages & FIBA Efficiency
        foreach (['team_a' => &$teamA, 'team_b' => &$teamB] as &$t) {
            $t['fg_pct'] = $t['fg_attempted'] > 0 ? round(($t['fg_made'] / $t['fg_attempted']) * 100, 1) : 0.0;
            $t['two_pt_pct'] = $t['two_pt_attempted'] > 0 ? round(($t['two_pt_made'] / $t['two_pt_attempted']) * 100, 1) : 0.0;
            $t['three_pt_pct'] = $t['three_pt_attempted'] > 0 ? round(($t['three_pt_made'] / $t['three_pt_attempted']) * 100, 1) : 0.0;
            $t['ft_pct'] = $t['ft_attempted'] > 0 ? round(($t['ft_made'] / $t['ft_attempted']) * 100, 1) : 0.0;
        }

        foreach ($playerStats as $uid => $ps) {
            $playerStats[$uid]['fg_pct'] = $ps['fg_attempted'] > 0 ? round(($ps['fg_made'] / $ps['fg_attempted']) * 100, 1) : 0.0;
            $playerStats[$uid]['two_pt_pct'] = $ps['two_pt_attempted'] > 0 ? round(($ps['two_pt_made'] / $ps['two_pt_attempted']) * 100, 1) : 0.0;
            $playerStats[$uid]['three_pt_pct'] = $ps['three_pt_attempted'] > 0 ? round(($ps['three_pt_made'] / $ps['three_pt_attempted']) * 100, 1) : 0.0;
            $playerStats[$uid]['ft_pct'] = $ps['ft_attempted'] > 0 ? round(($ps['ft_made'] / $ps['ft_attempted']) * 100, 1) : 0.0;

            // FIBA Efficiency Formula
            $missedFg = $ps['fg_attempted'] - $ps['fg_made'];
            $missedFt = $ps['ft_attempted'] - $ps['ft_made'];
            $playerStats[$uid]['efficiency'] = ($ps['points'] + $ps['rebounds_total'] + $ps['assists'] + $ps['steals'] + $ps['blocks']) - ($missedFg + $missedFt + $ps['turnovers']);
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
        if ($match->score_team_a > $match->score_team_b) return 'team_a';
        if ($match->score_team_b > $match->score_team_a) return 'team_b';
        return 'draw';
    }

    public function getScoreboardData(SportMatch $match): array
    {
        $players = $match->matchPlayers()->with('user')->get();
        $events  = $match->activeEvents;

        // Build top scorers by points
        $topScorers = [];
        foreach ($events->whereIn('type', ['basket', 'free_throw', 'point']) as $ev) {
            $pid = $ev->player_id;
            if (!$pid) continue;
            if (!isset($topScorers[$pid])) {
                $player = $players->firstWhere('user_id', $pid);
                $topScorers[$pid] = [
                    'player_id'     => $pid,
                    'username'      => $player?->user?->username ?? "#{$pid}",
                    'jersey_number' => $player?->jersey_number,
                    'team_side'     => $ev->team_side,
                    'points'        => 0,
                    'assists'       => 0,
                ];
            }
            $topScorers[$pid]['points'] += ($ev->points ?? 0);
        }
        // Assists
        foreach ($events->where('type', 'assist') as $ev) {
            $pid = $ev->player_id;
            if (!$pid) continue;
            if (!isset($topScorers[$pid])) {
                $player = $players->firstWhere('user_id', $pid);
                $topScorers[$pid] = [
                    'player_id'     => $pid,
                    'username'      => $player?->user?->username ?? "#{$pid}",
                    'jersey_number' => $player?->jersey_number,
                    'team_side'     => $player?->team_side,
                    'points'        => 0,
                    'assists'       => 0,
                ];
            }
            $topScorers[$pid]['assists']++;
        }
        usort($topScorers, fn ($a, $b) => $b['points'] <=> $a['points']);

        return [
            'sport'                       => 'basketball-5x5',
            'official_body'               => 'FIBA',
            'shot_clock_seconds'          => $match->shot_clock_seconds ?? 24,
            'is_penalty_situation_team_a' => $match->team_a_fouls >= 5,
            'is_penalty_situation_team_b' => $match->team_b_fouls >= 5,
            'team_a_quarter_fouls'        => $match->team_a_fouls,
            'team_b_quarter_fouls'        => $match->team_b_fouls,
            'top_scorers'                 => array_values($topScorers),
        ];
    }

    private function initTeamStats(): array
    {
        return [
            'points' => 0,
            'fg_made' => 0,
            'fg_attempted' => 0,
            'fg_pct' => 0.0,
            'two_pt_made' => 0,
            'two_pt_attempted' => 0,
            'two_pt_pct' => 0.0,
            'three_pt_made' => 0,
            'three_pt_attempted' => 0,
            'three_pt_pct' => 0.0,
            'ft_made' => 0,
            'ft_attempted' => 0,
            'ft_pct' => 0.0,
            'rebounds_offensive' => 0,
            'rebounds_defensive' => 0,
            'rebounds_total' => 0,
            'assists' => 0,
            'steals' => 0,
            'blocks' => 0,
            'turnovers' => 0,
            'fouls' => 0,
        ];
    }
}
