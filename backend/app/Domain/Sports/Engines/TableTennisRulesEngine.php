<?php

namespace App\Domain\Sports\Engines;

use App\Domain\Sports\Contracts\SportRulesEngineInterface;
use App\Models\MatchEvent;
use App\Models\MatchPlayer;
use App\Models\MatchSet;
use App\Models\SportMatch;
use Illuminate\Validation\ValidationException;

class TableTennisRulesEngine implements SportRulesEngineInterface
{
    public function getSportSlug(): string
    {
        return 'table-tennis';
    }

    public function getOfficialBody(): string
    {
        return 'ITTF';
    }

    public function getOfficialRulesVersion(): string
    {
        return 'ITTF Handbook & Laws of Table Tennis 2024';
    }

    public function getDefaultRulesProfile(): array
    {
        return [
            'id' => 'ittf_table_tennis_standard',
            'games_to_win' => 3, // Best of 5 games (3 to win)
            'total_games_max' => 5,
            'points_per_game' => 11,
            'minimum_point_lead' => 2,
            'service_alternation_regular' => 2,
            'service_alternation_deuce' => 1,
            'deciding_game_side_switch_points' => 5,
            'max_timeouts_per_player' => 1,
            'timeout_duration_seconds' => 60,
            'is_doubles' => false,
        ];
    }

    public function initializeMatch(SportMatch $match, array $options = []): void
    {
        $gamesToWin = $options['games_to_win'] ?? 3;
        $totalMax = ($gamesToWin * 2) - 1; // 3 to win => best of 5; 4 to win => best of 7

        $initialServingSide = $options['serving_side'] ?? 'team_a';

        $match->update([
            'total_periods' => $totalMax,
            'current_period' => 1,
            'sets_won_a' => 0,
            'sets_won_b' => 0,
            'score_team_a' => 0,
            'score_team_b' => 0,
            'serving_side' => $initialServingSide,
            'rules_profile' => $options['rules_profile'] ?? 'ittf_table_tennis_standard',
            'rules_state' => [
                'current_game' => 1,
                'games_to_win' => $gamesToWin,
                'total_games_max' => $totalMax,
                'is_doubles' => $options['is_doubles'] ?? false,
                'game_1_starting_server' => $initialServingSide,
                'current_game_starting_server' => $initialServingSide,
                'deciding_game_side_switched' => false,
                'team_a_timeouts_used' => 0,
                'team_b_timeouts_used' => 0,
            ],
        ]);

        // Create Game 1 record
        MatchSet::updateOrCreate(
            ['match_id' => $match->id, 'set_number' => 1],
            ['score_team_a' => 0, 'score_team_b' => 0]
        );
    }

    public function validateEvent(SportMatch $match, array $eventData): void
    {
        $type = $eventData['type'] ?? '';
        $allowed = [
            'point', 'winner', 'ace', 'service_error', 'unforced_error', 'edge_ball', 'net_let',
            'timeout', 'period_started', 'period_ended', 'match_paused', 'match_resumed', 'match_ended'
        ];

        if (!in_array($type, $allowed)) {
            throw ValidationException::withMessages([
                'type' => ["L'événement '{$type}' n'est pas conforme aux règles officielles de Tennis de table ITTF."]
            ]);
        }

        if ($match->status === 'finished') {
            throw ValidationException::withMessages([
                'status' => ["Le match est déjà terminé conformément aux règles officielles ITTF."]
            ]);
        }

        // Check timeout (ITTF Rule 3.4.4.1: max 1 time-out per match per player/pair)
        if ($type === 'timeout') {
            $side = $eventData['team_side'] ?? 'team_a';
            $state = $match->rules_state ?? [];
            $key = "{$side}_timeouts_used";
            if (($state[$key] ?? 0) >= 1) {
                throw ValidationException::withMessages([
                    'timeout' => ["Règle ITTF 3.4.4.1 : un seul temps mort d'une minute est autorisé par match."]
                ]);
            }
        }
    }

    public function applyEvent(SportMatch $match, array $eventData): array
    {
        $type = $eventData['type'];
        $side = $eventData['team_side'] ?? 'team_a';
        $currentGame = $match->current_period ?: 1;
        $state = $match->rules_state ?? [];
        $gamesToWin = $state['games_to_win'] ?? 3;
        $totalGamesMax = $state['total_games_max'] ?? (($gamesToWin * 2) - 1);

        $isPoint = in_array($type, ['point', 'winner', 'ace']);
        $isOpponentPoint = in_array($type, ['service_error', 'unforced_error']);

        if ($isPoint || $isOpponentPoint) {
            $scoringSide = $isPoint ? $side : ($side === 'team_a' ? 'team_b' : 'team_a');

            // 1. Increment score for current game
            if ($scoringSide === 'team_a') {
                $match->increment('score_team_a');
            } else {
                $match->increment('score_team_b');
            }

            // Sync MatchSet
            $matchSet = MatchSet::firstOrCreate(
                ['match_id' => $match->id, 'set_number' => $currentGame],
                ['score_team_a' => 0, 'score_team_b' => 0]
            );
            $matchSet->score_team_a = $match->score_team_a;
            $matchSet->score_team_b = $match->score_team_b;
            $matchSet->save();

            $scoreA = $match->score_team_a;
            $scoreB = $match->score_team_b;

            // 2. Check Deciding Game side switch (ITTF Rule 2.13.3)
            // When reaching 5 points in deciding game
            if ($currentGame === $totalGamesMax && empty($state['deciding_game_side_switched'])) {
                if ($scoreA >= 5 || $scoreB >= 5) {
                    $state['deciding_game_side_switched'] = true;
                }
            }

            // 3. Check Game Victory (ITTF Rule 2.11: 11 points with 2-point lead)
            $gameWon = false;
            if ($scoreA >= 11 && ($scoreA - $scoreB) >= 2) {
                $match->increment('sets_won_a');
                $gameWon = true;
            } elseif ($scoreB >= 11 && ($scoreB - $scoreA) >= 2) {
                $match->increment('sets_won_b');
                $gameWon = true;
            }

            if ($gameWon) {
                // Check Match Victory (best of 5: 3 games won; best of 7: 4 games won)
                if ($match->sets_won_a >= $gamesToWin || $match->sets_won_b >= $gamesToWin) {
                    $match->status = 'finished';
                    $match->finished_at = now();
                } else {
                    // Transition to next game (ITTF Rule 2.13.5: alternate starting server each game)
                    $nextGame = $currentGame + 1;
                    $match->current_period = $nextGame;
                    $match->score_team_a = 0;
                    $match->score_team_b = 0;

                    $prevStartingServer = $state['current_game_starting_server'] ?? 'team_a';
                    $nextStartingServer = ($prevStartingServer === 'team_a') ? 'team_b' : 'team_a';

                    $state['current_game'] = $nextGame;
                    $state['current_game_starting_server'] = $nextStartingServer;
                    $match->serving_side = $nextStartingServer;

                    MatchSet::updateOrCreate(
                        ['match_id' => $match->id, 'set_number' => $nextGame],
                        ['score_team_a' => 0, 'score_team_b' => 0]
                    );
                }
            } else {
                // Game continues: calculate serving side (ITTF Rule 2.13)
                $match->serving_side = $this->determineCurrentServer($match, $state);
            }
        } elseif ($type === 'timeout') {
            $key = "{$side}_timeouts_used";
            $state[$key] = ($state[$key] ?? 0) + 1;
        }

        $match->rules_state = $state;
        $match->save();

        return [
            'serving_side' => $match->serving_side,
            'games_won_a' => $match->sets_won_a,
            'games_won_b' => $match->sets_won_b,
            'current_game' => $match->current_period,
            'current_game_score_a' => $match->score_team_a,
            'current_game_score_b' => $match->score_team_b,
            'is_match_finished' => $match->status === 'finished',
            'side_switch_active' => $state['deciding_game_side_switched'] ?? false,
        ];
    }

    public function cancelEvent(SportMatch $match, MatchEvent $event): void
    {
        // Replay all remaining active events to reconstruct pristine state
        $activeEvents = $match->activeEvents;
        $gamesToWin = $match->rules_state['games_to_win'] ?? 3;
        $currentGame = 1;
        $scoreA = 0;
        $scoreB = 0;
        $gamesWonA = 0;
        $gamesWonB = 0;
        $startingServerGame1 = $match->rules_state['game_1_starting_server'] ?? 'team_a';
        $currentStartingServer = $startingServerGame1;
        $servingSide = $startingServerGame1;

        foreach ($activeEvents as $ev) {
            $isPoint = in_array($ev->type, ['point', 'winner', 'ace']);
            $isOpponent = in_array($ev->type, ['service_error', 'unforced_error']);

            if ($isPoint || $isOpponent) {
                $scoringSide = $isPoint ? $ev->team_side : ($ev->team_side === 'team_a' ? 'team_b' : 'team_a');
                if ($scoringSide === 'team_a') $scoreA++; else $scoreB++;

                // Check game win
                if ($scoreA >= 11 && ($scoreA - $scoreB) >= 2) {
                    $gamesWonA++;
                    $currentGame++;
                    $scoreA = 0;
                    $scoreB = 0;
                    $currentStartingServer = ($currentStartingServer === 'team_a') ? 'team_b' : 'team_a';
                    $servingSide = $currentStartingServer;
                } elseif ($scoreB >= 11 && ($scoreB - $scoreA) >= 2) {
                    $gamesWonB++;
                    $currentGame++;
                    $scoreA = 0;
                    $scoreB = 0;
                    $currentStartingServer = ($currentStartingServer === 'team_a') ? 'team_b' : 'team_a';
                    $servingSide = $currentStartingServer;
                } else {
                    // Update serving side within game
                    $totalPoints = $scoreA + $scoreB;
                    $otherSide = ($currentStartingServer === 'team_a') ? 'team_b' : 'team_a';
                    if ($scoreA >= 10 && $scoreB >= 10) {
                        // Deuce: change every point
                        $servingSide = ($totalPoints % 2 === 0) ? $currentStartingServer : $otherSide;
                    } else {
                        // Regular: change every 2 points
                        $blocks = intdiv($totalPoints, 2);
                        $servingSide = ($blocks % 2 === 0) ? $currentStartingServer : $otherSide;
                    }
                }
            }
        }

        $match->update([
            'score_team_a' => $scoreA,
            'score_team_b' => $scoreB,
            'sets_won_a' => $gamesWonA,
            'sets_won_b' => $gamesWonB,
            'current_period' => $currentGame,
            'serving_side' => $servingSide,
            'status' => ($gamesWonA < $gamesToWin && $gamesWonB < $gamesToWin) ? 'in_progress' : 'finished',
        ]);
    }

    public function calculateStatistics(SportMatch $match): array
    {
        $events = $match->activeEvents;
        $players = $match->matchPlayers()->with('user')->get();

        $teamA = $this->initStats();
        $teamB = $this->initStats();

        // Games breakdown
        $sets = MatchSet::where('match_id', $match->id)->orderBy('set_number')->get();
        $gameScores = [];
        foreach ($sets as $s) {
            $gameScores[] = [
                'game_number' => $s->set_number,
                'team_a' => $s->score_team_a,
                'team_b' => $s->score_team_b,
            ];
        }

        $playerStats = [];
        foreach ($players as $p) {
            $playerStats[$p->user_id] = [
                'user_id' => $p->user_id,
                'username' => $p->user->username ?? 'Joueur #' . $p->jersey_number,
                'photo_url' => $p->user->photo_url ?? null,
                'jersey_number' => $p->jersey_number,
                'team_side' => $p->team_side,
                'total_points' => 0,
                'winners' => 0,
                'aces' => 0,
                'service_errors' => 0,
                'unforced_errors' => 0,
                'points_won_on_serve' => 0,
            ];
        }

        foreach ($events as $ev) {
            $side = $ev->team_side;
            $pid = $ev->player_id;
            $targetTeam = $side === 'team_a' ? $teamA : $teamB;
            $oppTeam = $side === 'team_a' ? $teamB : $teamA;

            if ($ev->type === 'point' || $ev->type === 'winner') {
                $targetTeam['points']++;
                $targetTeam['winners']++;
                if ($pid && isset($playerStats[$pid])) {
                    $playerStats[$pid]['total_points']++;
                    $playerStats[$pid]['winners']++;
                }
            } elseif ($ev->type === 'ace') {
                $targetTeam['points']++;
                $targetTeam['aces']++;
                $targetTeam['points_won_on_serve']++;
                if ($pid && isset($playerStats[$pid])) {
                    $playerStats[$pid]['total_points']++;
                    $playerStats[$pid]['aces']++;
                    $playerStats[$pid]['points_won_on_serve']++;
                }
            } elseif ($ev->type === 'service_error') {
                $targetTeam['service_errors']++;
                $oppTeam['points']++;
                if ($pid && isset($playerStats[$pid])) $playerStats[$pid]['service_errors']++;
            } elseif ($ev->type === 'unforced_error') {
                $targetTeam['unforced_errors']++;
                $oppTeam['points']++;
                if ($pid && isset($playerStats[$pid])) $playerStats[$pid]['unforced_errors']++;
            }

            if ($side === 'team_a') {
                $teamA = $targetTeam;
                $teamB = $oppTeam;
            } else {
                $teamB = $targetTeam;
                $teamA = $oppTeam;
            }
        }

        return [
            'collective' => [
                'team_a' => $teamA,
                'team_b' => $teamB,
            ],
            'set_scores' => $gameScores,
            'players' => [
                'team_a' => array_values(array_filter($playerStats, fn ($p) => $p['team_side'] === 'team_a')),
                'team_b' => array_values(array_filter($playerStats, fn ($p) => $p['team_side'] === 'team_b')),
                'all' => array_values($playerStats),
            ],
        ];
    }

    public function checkVictoryConditions(SportMatch $match): ?string
    {
        $gamesToWin = $match->rules_state['games_to_win'] ?? 3;
        if ($match->sets_won_a >= $gamesToWin) {
            return 'team_a';
        }
        if ($match->sets_won_b >= $gamesToWin) {
            return 'team_b';
        }
        return null;
    }

    public function getScoreboardData(SportMatch $match): array
    {
        $state = $match->rules_state ?? [];
        $totalPoints = $match->score_team_a + $match->score_team_b;
        $isDeuce = ($match->score_team_a >= 10 && $match->score_team_b >= 10);
        $pointsUntilChange = $isDeuce ? 1 : (2 - ($totalPoints % 2));

        return [
            'sport' => 'table-tennis',
            'official_body' => 'ITTF',
            'games_won_a' => $match->sets_won_a ?? 0,
            'games_won_b' => $match->sets_won_b ?? 0,
            'current_game' => $match->current_period ?? 1,
            'current_game_score_a' => $match->score_team_a,
            'current_game_score_b' => $match->score_team_b,
            'serving_side' => $match->serving_side ?? 'team_a',
            'points_to_service_change' => $pointsUntilChange,
            'is_deuce' => $isDeuce,
            'is_game_point_a' => $this->isGamePoint($match, 'team_a'),
            'is_game_point_b' => $this->isGamePoint($match, 'team_b'),
            'is_match_point_a' => $this->isMatchPoint($match, 'team_a'),
            'is_match_point_b' => $this->isMatchPoint($match, 'team_b'),
            'is_doubles' => $state['is_doubles'] ?? false,
            'deciding_game_side_switched' => $state['deciding_game_side_switched'] ?? false,
        ];
    }

    /**
     * ITTF Rule 2.13 Service Alternation logic
     */
    private function determineCurrentServer(SportMatch $match, array $state): string
    {
        $startServer = $state['current_game_starting_server'] ?? 'team_a';
        $otherServer = ($startServer === 'team_a') ? 'team_b' : 'team_a';

        $scoreA = $match->score_team_a;
        $scoreB = $match->score_team_b;
        $total = $scoreA + $scoreB;

        // At 10-10 or later: each player serves 1 point in turn
        if ($scoreA >= 10 && $scoreB >= 10) {
            return ($total % 2 === 0) ? $startServer : $otherServer;
        }

        // Before 10-10: server changes every 2 points
        $blocks = intdiv($total, 2);
        return ($blocks % 2 === 0) ? $startServer : $otherServer;
    }

    private function isGamePoint(SportMatch $match, string $side): bool
    {
        $score = ($side === 'team_a') ? $match->score_team_a : $match->score_team_b;
        $opp = ($side === 'team_a') ? $match->score_team_b : $match->score_team_a;
        return ($score >= 10 && ($score - $opp) >= 1);
    }

    private function isMatchPoint(SportMatch $match, string $side): bool
    {
        $gamesWon = ($side === 'team_a') ? $match->sets_won_a : $match->sets_won_b;
        $gamesToWin = $match->rules_state['games_to_win'] ?? 3;
        if ($gamesWon < ($gamesToWin - 1)) {
            return false;
        }
        return $this->isGamePoint($match, $side);
    }

    private function initStats(): array
    {
        return [
            'points' => 0,
            'winners' => 0,
            'aces' => 0,
            'service_errors' => 0,
            'unforced_errors' => 0,
            'points_won_on_serve' => 0,
        ];
    }
}
