<?php

namespace App\Actions\Matches;

use App\Models\SportMatch;
use App\Services\SportRulesService;

class CalculateMatchStatisticsAction
{
    public function execute(SportMatch $match): array
    {
        $events = $match->activeEvents;
        $players = $match->matchPlayers()->with('user')->get();
        $category = SportRulesService::getSportCategory($match->session?->sport?->slug);

        // If no match_players exist yet, seed them from session participants or events
        if ($players->isEmpty() && $match->session) {
            $participants = $match->session->participants ?? collect();

            // Determine any sides already indicated in events
            $knownSides = [];
            foreach ($events as $ev) {
                if ($ev->player_id && !isset($knownSides[$ev->player_id])) {
                    $knownSides[$ev->player_id] = $ev->team_side;
                }
            }

            foreach ($participants as $idx => $p) {
                $side = $knownSides[$p->id] ?? (($idx % 2 === 0) ? 'team_a' : 'team_b');
                $match->matchPlayers()->create([
                    'user_id' => $p->id,
                    'team_side' => $side,
                    'jersey_number' => $idx + 1,
                    'is_starter' => true,
                    'is_on_court' => true,
                    'seconds_played' => 0,
                ]);
            }
            $players = $match->matchPlayers()->with('user')->get();
        }

        // 1. Calculate Team Collective Statistics
        $teamStats = [
            'team_a' => $this->initTeamStats(),
            'team_b' => $this->initTeamStats(),
        ];

        // 2. Calculate Period Breakdown
        $periodScores = [];
        $totalPeriods = max(
            $category === SportRulesService::CATEGORY_FOOTBALL ? 2 : ($category === SportRulesService::CATEGORY_BASKETBALL_3X3 ? 1 : 4),
            $match->total_periods,
            $match->current_period
        );

        for ($p = 1; $p <= $totalPeriods; $p++) {
            $periodScores[$p] = [
                'period' => $p,
                'team_a' => 0,
                'team_b' => 0,
            ];
        }

        // 3. Initialize Individual Player Stats
        $playerStats = [];
        foreach ($players as $mp) {
            $playerStats[$mp->user_id] = [
                'user_id' => $mp->user_id,
                'username' => $mp->user->username ?? 'Joueur #' . $mp->jersey_number,
                'photo_url' => $mp->user->photo_url ?? null,
                'jersey_number' => $mp->jersey_number,
                'position' => $mp->position,
                'team_side' => $mp->team_side,
                'is_on_court' => (bool)$mp->is_on_court,
                'seconds_played' => (int)$mp->seconds_played,
                'minutes_formatted' => $this->formatSecondsToMinutes($mp->seconds_played),

                // Common & Basketball
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

                // Basketball 3x3 specifics
                'one_pt_made' => 0,
                'one_pt_attempted' => 0,
                'one_pt_pct' => 0.0,

                // Football / Futsal
                'goals' => 0,
                'shots_on_target' => 0,
                'shots_off_target' => 0,
                'total_shots' => 0,
                'shot_accuracy_pct' => 0.0,
                'saves' => 0,
                'yellow_cards' => (int) $mp->yellow_cards,
                'red_cards' => (int) $mp->red_cards,
                'corners' => 0,
                'offsides' => 0,

                // Volleyball / Table Tennis
                'aces' => 0,
                'attack_kills' => 0,
                'winners' => 0,
            ];
        }

        // 4. Process all non-cancelled events
        foreach ($events as $event) {
            $side = $event->team_side;
            if (!isset($teamStats[$side])) {
                continue;
            }

            $pid = $event->player_id;
            $period = $event->period ?: 1;
            if (!isset($periodScores[$period])) {
                $periodScores[$period] = ['period' => $period, 'team_a' => 0, 'team_b' => 0];
            }

            switch ($event->type) {
                // Football: Goal
                case 'goal':
                    $teamStats[$side]['goals']++;
                    $teamStats[$side]['points']++;
                    $teamStats[$side]['shots_on_target']++;
                    $teamStats[$side]['total_shots']++;
                    $periodScores[$period][$side] += 1;

                    if ($pid && isset($playerStats[$pid])) {
                        $playerStats[$pid]['goals']++;
                        $playerStats[$pid]['points']++;
                        $playerStats[$pid]['shots_on_target']++;
                        $playerStats[$pid]['total_shots']++;
                    }

                    if ($event->related_player_id && isset($playerStats[$event->related_player_id])) {
                        $playerStats[$event->related_player_id]['assists']++;
                        $teamStats[$side]['assists']++;
                    }
                    break;

                // Football: Shot on target
                case 'shot_on_target':
                    $teamStats[$side]['shots_on_target']++;
                    $teamStats[$side]['total_shots']++;
                    if ($pid && isset($playerStats[$pid])) {
                        $playerStats[$pid]['shots_on_target']++;
                        $playerStats[$pid]['total_shots']++;
                    }
                    break;

                // Football: Shot off target
                case 'shot_off_target':
                    $teamStats[$side]['shots_off_target']++;
                    $teamStats[$side]['total_shots']++;
                    if ($pid && isset($playerStats[$pid])) {
                        $playerStats[$pid]['shots_off_target']++;
                        $playerStats[$pid]['total_shots']++;
                    }
                    break;

                // Football: Save
                case 'save':
                    $teamStats[$side]['saves']++;
                    if ($pid && isset($playerStats[$pid])) {
                        $playerStats[$pid]['saves']++;
                    }
                    break;

                // Football: Corner
                case 'corner':
                    $teamStats[$side]['corners']++;
                    if ($pid && isset($playerStats[$pid])) {
                        $playerStats[$pid]['corners']++;
                    }
                    break;

                // Football: Offside
                case 'offside':
                    $teamStats[$side]['offsides']++;
                    if ($pid && isset($playerStats[$pid])) {
                        $playerStats[$pid]['offsides']++;
                    }
                    break;

                // Cards
                case 'card_yellow':
                    $teamStats[$side]['yellow_cards']++;
                    if ($pid && isset($playerStats[$pid])) {
                        $playerStats[$pid]['yellow_cards']++;
                    }
                    break;

                case 'card_red':
                    $teamStats[$side]['red_cards']++;
                    if ($pid && isset($playerStats[$pid])) {
                        $playerStats[$pid]['red_cards']++;
                    }
                    break;

                // Basketball: Basket scored
                case 'basket':
                    $points = $event->points ?: ($category === SportRulesService::CATEGORY_BASKETBALL_3X3 ? 1 : 2);
                    $teamStats[$side]['points'] += $points;
                    $periodScores[$period][$side] += $points;

                    if ($category === SportRulesService::CATEGORY_BASKETBALL_3X3) {
                        if ($points === 2) {
                            $teamStats[$side]['two_pt_made']++;
                            $teamStats[$side]['two_pt_attempted']++;
                        } else {
                            $teamStats[$side]['one_pt_made']++;
                            $teamStats[$side]['one_pt_attempted']++;
                        }
                    } else {
                        if ($points === 1) {
                            $teamStats[$side]['ft_made']++;
                            $teamStats[$side]['ft_attempted']++;
                        } elseif ($points === 3) {
                            $teamStats[$side]['three_pt_made']++;
                            $teamStats[$side]['three_pt_attempted']++;
                            $teamStats[$side]['fg_made']++;
                            $teamStats[$side]['fg_attempted']++;
                        } else { // 2 pts
                            $teamStats[$side]['two_pt_made']++;
                            $teamStats[$side]['two_pt_attempted']++;
                            $teamStats[$side]['fg_made']++;
                            $teamStats[$side]['fg_attempted']++;
                        }
                    }

                    if ($pid && isset($playerStats[$pid])) {
                        $playerStats[$pid]['points'] += $points;
                        if ($category === SportRulesService::CATEGORY_BASKETBALL_3X3) {
                            if ($points === 2) {
                                $playerStats[$pid]['two_pt_made']++;
                                $playerStats[$pid]['two_pt_attempted']++;
                            } else {
                                $playerStats[$pid]['one_pt_made']++;
                                $playerStats[$pid]['one_pt_attempted']++;
                            }
                        } else {
                            if ($points === 1) {
                                $playerStats[$pid]['ft_made']++;
                                $playerStats[$pid]['ft_attempted']++;
                            } elseif ($points === 3) {
                                $playerStats[$pid]['three_pt_made']++;
                                $playerStats[$pid]['three_pt_attempted']++;
                                $playerStats[$pid]['fg_made']++;
                                $playerStats[$pid]['fg_attempted']++;
                            } else {
                                $playerStats[$pid]['two_pt_made']++;
                                $playerStats[$pid]['two_pt_attempted']++;
                                $playerStats[$pid]['fg_made']++;
                                $playerStats[$pid]['fg_attempted']++;
                            }
                        }
                    }

                    if ($event->related_player_id && isset($playerStats[$event->related_player_id])) {
                        $playerStats[$event->related_player_id]['assists']++;
                        $teamStats[$side]['assists']++;
                    }
                    break;

                // Basketball: Free throw
                case 'free_throw':
                    $isMade = ($event->shot_result === 'made' || $event->points === 1);
                    $teamStats[$side]['ft_attempted']++;
                    if ($category === SportRulesService::CATEGORY_BASKETBALL_3X3) {
                        $teamStats[$side]['one_pt_attempted']++;
                    }

                    if ($isMade) {
                        $teamStats[$side]['ft_made']++;
                        $teamStats[$side]['points'] += 1;
                        if ($category === SportRulesService::CATEGORY_BASKETBALL_3X3) {
                            $teamStats[$side]['one_pt_made']++;
                        }
                        $periodScores[$period][$side] += 1;
                    }

                    if ($pid && isset($playerStats[$pid])) {
                        $playerStats[$pid]['ft_attempted']++;
                        if ($category === SportRulesService::CATEGORY_BASKETBALL_3X3) {
                            $playerStats[$pid]['one_pt_attempted']++;
                        }
                        if ($isMade) {
                            $playerStats[$pid]['ft_made']++;
                            if ($category === SportRulesService::CATEGORY_BASKETBALL_3X3) {
                                $playerStats[$pid]['one_pt_made']++;
                            }
                            $playerStats[$pid]['points'] += 1;
                        }
                    }
                    break;

                // Basketball: Missed shot
                case 'missed_shot':
                    $shotType = $event->shot_type ?: ($event->points === 3 ? '3pt' : ($event->points === 1 ? 'free_throw' : '2pt'));
                    if ($category === SportRulesService::CATEGORY_BASKETBALL_3X3) {
                        if ($shotType === '2pt') {
                            $teamStats[$side]['two_pt_attempted']++;
                            if ($pid && isset($playerStats[$pid])) {
                                $playerStats[$pid]['two_pt_attempted']++;
                            }
                        } else {
                            $teamStats[$side]['one_pt_attempted']++;
                            if ($pid && isset($playerStats[$pid])) {
                                $playerStats[$pid]['one_pt_attempted']++;
                            }
                        }
                    } else {
                        if ($shotType === '3pt') {
                            $teamStats[$side]['three_pt_attempted']++;
                            $teamStats[$side]['fg_attempted']++;
                            if ($pid && isset($playerStats[$pid])) {
                                $playerStats[$pid]['three_pt_attempted']++;
                                $playerStats[$pid]['fg_attempted']++;
                            }
                        } elseif ($shotType === 'free_throw') {
                            $teamStats[$side]['ft_attempted']++;
                            if ($pid && isset($playerStats[$pid])) {
                                $playerStats[$pid]['ft_attempted']++;
                            }
                        } else { // 2pt
                            $teamStats[$side]['two_pt_attempted']++;
                            $teamStats[$side]['fg_attempted']++;
                            if ($pid && isset($playerStats[$pid])) {
                                $playerStats[$pid]['two_pt_attempted']++;
                                $playerStats[$pid]['fg_attempted']++;
                            }
                        }
                    }
                    break;

                // Rebound
                case 'rebound':
                    $reboundType = $event->rebound_type ?: 'defensive';
                    if ($reboundType === 'offensive') {
                        $teamStats[$side]['rebounds_offensive']++;
                    } else {
                        $teamStats[$side]['rebounds_defensive']++;
                    }
                    $teamStats[$side]['rebounds_total']++;

                    if ($pid && isset($playerStats[$pid])) {
                        if ($reboundType === 'offensive') {
                            $playerStats[$pid]['rebounds_offensive']++;
                        } else {
                            $playerStats[$pid]['rebounds_defensive']++;
                        }
                        $playerStats[$pid]['rebounds_total']++;
                    }
                    break;

                // Assist
                case 'assist':
                    $teamStats[$side]['assists']++;
                    if ($pid && isset($playerStats[$pid])) {
                        $playerStats[$pid]['assists']++;
                    }
                    break;

                // Steal
                case 'steal':
                    $teamStats[$side]['steals']++;
                    if ($pid && isset($playerStats[$pid])) {
                        $playerStats[$pid]['steals']++;
                    }
                    break;

                // Block
                case 'block':
                    $teamStats[$side]['blocks']++;
                    if ($pid && isset($playerStats[$pid])) {
                        $playerStats[$pid]['blocks']++;
                    }
                    break;

                // Turnover
                case 'turnover':
                    $teamStats[$side]['turnovers']++;
                    if ($pid && isset($playerStats[$pid])) {
                        $playerStats[$pid]['turnovers']++;
                    }
                    break;

                // Foul
                case 'foul':
                    $teamStats[$side]['fouls']++;
                    if ($pid && isset($playerStats[$pid])) {
                        $playerStats[$pid]['fouls']++;
                    }
                    break;

                // Volleyball / Table tennis: generic point
                case 'point':
                    $teamStats[$side]['points'] += ($event->points ?: 1);
                    $periodScores[$period][$side] += ($event->points ?: 1);
                    if ($pid && isset($playerStats[$pid])) {
                        $playerStats[$pid]['points'] += ($event->points ?: 1);
                    }
                    break;

                // Volleyball / Table tennis: Ace
                case 'ace':
                    $teamStats[$side]['points'] += 1;
                    $teamStats[$side]['aces']++;
                    $periodScores[$period][$side] += 1;
                    if ($pid && isset($playerStats[$pid])) {
                        $playerStats[$pid]['points'] += 1;
                        $playerStats[$pid]['aces']++;
                    }
                    break;

                // Volleyball: Attack Kill
                case 'attack_kill':
                    $teamStats[$side]['points'] += 1;
                    $teamStats[$side]['attack_kills']++;
                    $periodScores[$period][$side] += 1;
                    if ($pid && isset($playerStats[$pid])) {
                        $playerStats[$pid]['points'] += 1;
                        $playerStats[$pid]['attack_kills']++;
                    }
                    break;

                // Table Tennis: Winner
                case 'winner':
                    $teamStats[$side]['points'] += 1;
                    $teamStats[$side]['winners']++;
                    $periodScores[$period][$side] += 1;
                    if ($pid && isset($playerStats[$pid])) {
                        $playerStats[$pid]['points'] += 1;
                        $playerStats[$pid]['winners']++;
                    }
                    break;
            }
        }

        // 5. Calculate Percentages safely
        foreach (['team_a', 'team_b'] as $s) {
            $teamStats[$s]['fg_pct'] = $this->calculatePercentage($teamStats[$s]['fg_made'], $teamStats[$s]['fg_attempted']);
            $teamStats[$s]['two_pt_pct'] = $this->calculatePercentage($teamStats[$s]['two_pt_made'], $teamStats[$s]['two_pt_attempted']);
            $teamStats[$s]['three_pt_pct'] = $this->calculatePercentage($teamStats[$s]['three_pt_made'], $teamStats[$s]['three_pt_attempted']);
            $teamStats[$s]['ft_pct'] = $this->calculatePercentage($teamStats[$s]['ft_made'], $teamStats[$s]['ft_attempted']);
            $teamStats[$s]['one_pt_pct'] = $this->calculatePercentage($teamStats[$s]['one_pt_made'], $teamStats[$s]['one_pt_attempted']);
            $teamStats[$s]['shot_accuracy_pct'] = $this->calculatePercentage($teamStats[$s]['shots_on_target'], $teamStats[$s]['total_shots']);
        }

        foreach ($playerStats as $uid => $stat) {
            $playerStats[$uid]['fg_pct'] = $this->calculatePercentage($stat['fg_made'], $stat['fg_attempted']);
            $playerStats[$uid]['two_pt_pct'] = $this->calculatePercentage($stat['two_pt_made'], $stat['two_pt_attempted']);
            $playerStats[$uid]['three_pt_pct'] = $this->calculatePercentage($stat['three_pt_made'], $stat['three_pt_attempted']);
            $playerStats[$uid]['ft_pct'] = $this->calculatePercentage($stat['ft_made'], $stat['ft_attempted']);
            $playerStats[$uid]['one_pt_pct'] = $this->calculatePercentage($stat['one_pt_made'], $stat['one_pt_attempted']);
            $playerStats[$uid]['shot_accuracy_pct'] = $this->calculatePercentage($stat['shots_on_target'], $stat['total_shots']);
        }

        // 6. Group players by team side
        $teamAPlayers = [];
        $teamBPlayers = [];
        foreach ($playerStats as $p) {
            if ($p['team_side'] === 'team_a') {
                $teamAPlayers[] = $p;
            } else {
                $teamBPlayers[] = $p;
            }
        }

        return [
            'sport_category' => $category,
            'collective' => $teamStats,
            'period_scores' => array_values($periodScores),
            'players' => [
                'team_a' => $teamAPlayers,
                'team_b' => $teamBPlayers,
                'all' => array_values($playerStats),
            ],
        ];
    }

    private function initTeamStats(): array
    {
        return [
            'points' => 0,
            // Basketball
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

            // Basketball 3x3
            'one_pt_made' => 0,
            'one_pt_attempted' => 0,
            'one_pt_pct' => 0.0,

            // Football
            'goals' => 0,
            'shots_on_target' => 0,
            'shots_off_target' => 0,
            'total_shots' => 0,
            'shot_accuracy_pct' => 0.0,
            'saves' => 0,
            'corners' => 0,
            'offsides' => 0,
            'yellow_cards' => 0,
            'red_cards' => 0,

            // Volleyball / Table Tennis
            'aces' => 0,
            'attack_kills' => 0,
            'winners' => 0,
        ];
    }

    private function calculatePercentage(int $made, int $attempted): float
    {
        if ($attempted <= 0) {
            return 0.0;
        }
        return round(($made / $attempted) * 100, 1);
    }

    private function formatSecondsToMinutes(int $seconds): string
    {
        $min = floor($seconds / 60);
        $sec = $seconds % 60;
        return sprintf('%02d:%02d', $min, $sec);
    }
}
