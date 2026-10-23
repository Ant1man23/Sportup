<?php

namespace App\Domain\Sports\Engines;

use App\Domain\Sports\Contracts\SportRulesEngineInterface;
use App\Models\MatchEvent;
use App\Models\MatchPlayer;
use App\Models\MatchSet;
use App\Models\SportMatch;
use Illuminate\Validation\ValidationException;

class VolleyballRulesEngine implements SportRulesEngineInterface
{
    public function getSportSlug(): string
    {
        return 'volleyball';
    }

    public function getOfficialBody(): string
    {
        return 'FIVB';
    }

    public function getOfficialRulesVersion(): string
    {
        return 'FIVB Official Volleyball Rules 2021-2024';
    }

    public function getDefaultRulesProfile(): array
    {
        return [
            'id' => 'fivb_volleyball_standard',
            'sets_to_win' => 3, // Best of 5 sets
            'points_per_regular_set' => 25,
            'points_per_tie_break_set' => 15,
            'minimum_point_lead' => 2,
            'players_on_court' => 6,
            'max_substitutions_per_set' => 6,
            'timeouts_per_set' => 2,
            'timeout_duration_seconds' => 30,
        ];
    }

    public function initializeMatch(SportMatch $match, array $options = []): void
    {
        $match->update([
            'total_periods' => 5, // Up to 5 sets
            'current_period' => 1,
            'sets_won_a' => 0,
            'sets_won_b' => 0,
            'serving_side' => 'team_a',
            'rules_profile' => $options['rules_profile'] ?? 'fivb_volleyball_standard',
            'rules_state' => [
                'current_set_number' => 1,
                'team_a_rotations' => [1, 2, 3, 4, 5, 6], // Positions P1..P6
                'team_b_rotations' => [1, 2, 3, 4, 5, 6],
                'team_a_subs_count_set_1' => 0,
                'team_b_subs_count_set_1' => 0,
                'team_a_timeouts_set_1' => 0,
                'team_b_timeouts_set_1' => 0,
            ],
        ]);

        // Create Set 1 entry
        MatchSet::updateOrCreate(
            ['match_id' => $match->id, 'set_number' => 1],
            ['score_team_a' => 0, 'score_team_b' => 0]
        );
    }

    public function validateEvent(SportMatch $match, array $eventData): void
    {
        $type = $eventData['type'] ?? '';
        $allowed = [
            'point', 'ace', 'service_error', 'attack_kill', 'attack_error',
            'block_point', 'dig', 'reception', 'rotation_fault', 'substitution',
            'timeout', 'period_started', 'period_ended', 'match_paused', 'match_resumed', 'match_ended'
        ];

        if (!in_array($type, $allowed)) {
            throw ValidationException::withMessages([
                'type' => ["L'événement '{$type}' n'est pas conforme aux règles officielles de Volleyball FIVB."]
            ]);
        }

        // Check max 6 substitutions per set (FIVB Rule 15.6)
        if ($type === 'substitution') {
            $side = $eventData['team_side'];
            $set = $match->current_period;
            $state = $match->rules_state ?? [];
            $key = "{$side}_subs_count_set_{$set}";
            $count = $state[$key] ?? 0;
            if ($count >= 6) {
                throw ValidationException::withMessages([
                    'substitution' => ["Le quota réglementaire FIVB de 6 remplacements par set a été atteint par cette équipe."]
                ]);
            }
        }
    }

    public function applyEvent(SportMatch $match, array $eventData): array
    {
        $type = $eventData['type'];
        $scoringSide = $eventData['team_side'];
        $currentSet = $match->current_period ?: 1;
        $state = $match->rules_state ?? [];

        // Check if event generates a point (rally point system)
        $isPoint = in_array($type, ['point', 'ace', 'attack_kill', 'block_point']) ||
                   in_array($type, ['service_error', 'attack_error', 'rotation_fault']); // opponent error awards point

        if ($type === 'service_error' || $type === 'attack_error' || $type === 'rotation_fault') {
            // Error by side means the OPPOSING side scores
            $scoringSide = ($eventData['team_side'] === 'team_a') ? 'team_b' : 'team_a';
        }

        if ($isPoint) {
            // 1. Service & Rotation Rule (FIVB Rule 7.6.2)
            $oldServingSide = $match->serving_side ?: 'team_a';
            $sideoutOccurred = ($scoringSide !== $oldServingSide);

            if ($sideoutOccurred) {
                // Team gaining service rotates clockwise
                $match->serving_side = $scoringSide;
                $rotKey = "{$scoringSide}_rotations";
                $currRot = $state[$rotKey] ?? [1, 2, 3, 4, 5, 6];
                // Rotate array: element from end to start (P1 -> P6...)
                $last = array_pop($currRot);
                array_unshift($currRot, $last);
                $state[$rotKey] = $currRot;
            }

            // 2. Increment score for current set
            if ($scoringSide === 'team_a') {
                $match->increment('score_team_a');
            } else {
                $match->increment('score_team_b');
            }

            // Update MatchSet record
            $matchSet = MatchSet::firstOrCreate(
                ['match_id' => $match->id, 'set_number' => $currentSet],
                ['score_team_a' => 0, 'score_team_b' => 0]
            );
            $matchSet->score_team_a = $match->score_team_a;
            $matchSet->score_team_b = $match->score_team_b;
            $matchSet->save();

            // 3. Check Set Victory Condition (25 pts regular, 15 pts 5th set, min 2-pt lead)
            $targetPts = ($currentSet === 5) ? 15 : 25;
            $scoreA = $match->score_team_a;
            $scoreB = $match->score_team_b;

            $setWon = false;
            if ($scoreA >= $targetPts && ($scoreA - $scoreB) >= 2) {
                $match->increment('sets_won_a');
                $setWon = true;
            } elseif ($scoreB >= $targetPts && ($scoreB - $scoreA) >= 2) {
                $match->increment('sets_won_b');
                $setWon = true;
            }

            if ($setWon) {
                // Check Match Victory (3 sets won)
                if ($match->sets_won_a >= 3 || $match->sets_won_b >= 3) {
                    $match->status = 'finished';
                    $match->finished_at = now();
                } else {
                    // Advance to next set
                    $nextSet = $currentSet + 1;
                    $match->current_period = $nextSet;
                    $match->score_team_a = 0;
                    $match->score_team_b = 0;
                    $match->period_elapsed_seconds = 0;

                    // Initialize next set
                    MatchSet::updateOrCreate(
                        ['match_id' => $match->id, 'set_number' => $nextSet],
                        ['score_team_a' => 0, 'score_team_b' => 0]
                    );
                }
            }
        } elseif ($type === 'substitution') {
            $key = "{$eventData['team_side']}_subs_count_set_{$currentSet}";
            $state[$key] = ($state[$key] ?? 0) + 1;
        } elseif ($type === 'timeout') {
            $key = "{$eventData['team_side']}_timeouts_set_{$currentSet}";
            $state[$key] = ($state[$key] ?? 0) + 1;
        }

        $match->rules_state = $state;
        $match->save();

        return [
            'serving_side' => $match->serving_side,
            'sets_won_a' => $match->sets_won_a,
            'sets_won_b' => $match->sets_won_b,
            'current_set' => $match->current_period,
            'is_match_finished' => $match->status === 'finished',
        ];
    }

    public function cancelEvent(SportMatch $match, MatchEvent $event): void
    {
        // Rebuild sets and scores from remaining active events
        $activeEvents = $match->activeEvents;
        $currentSet = 1;
        $scoreA = 0;
        $scoreB = 0;
        $setsA = 0;
        $setsB = 0;

        foreach ($activeEvents as $ev) {
            $isPoint = in_array($ev->type, ['point', 'ace', 'attack_kill', 'block_point']);
            $isError = in_array($ev->type, ['service_error', 'attack_error', 'rotation_fault']);

            if ($isPoint || $isError) {
                $scoringSide = $isPoint ? $ev->team_side : (($ev->team_side === 'team_a') ? 'team_b' : 'team_a');
                if ($scoringSide === 'team_a') $scoreA++; else $scoreB++;

                $target = ($currentSet === 5) ? 15 : 25;
                if ($scoreA >= $target && ($scoreA - $scoreB) >= 2) {
                    $setsA++;
                    $currentSet++;
                    $scoreA = 0;
                    $scoreB = 0;
                } elseif ($scoreB >= $target && ($scoreB - $scoreA) >= 2) {
                    $setsB++;
                    $currentSet++;
                    $scoreA = 0;
                    $scoreB = 0;
                }
            }
        }

        $match->update([
            'score_team_a' => $scoreA,
            'score_team_b' => $scoreB,
            'sets_won_a' => $setsA,
            'sets_won_b' => $setsB,
            'current_period' => min(5, $currentSet),
            'status' => ($setsA < 3 && $setsB < 3) ? 'in_progress' : 'finished',
        ]);
    }

    public function calculateStatistics(SportMatch $match): array
    {
        $events = $match->activeEvents;
        $players = $match->matchPlayers()->with('user')->get();

        $teamA = $this->initTeamStats();
        $teamB = $this->initTeamStats();

        // Sets breakdown
        $sets = MatchSet::where('match_id', $match->id)->orderBy('set_number')->get();
        $setScores = [];
        foreach ($sets as $s) {
            $setScores[] = [
                'set_number' => $s->set_number,
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
                'position' => $p->position,
                'is_libero' => (bool)$p->is_libero,
                'team_side' => $p->team_side,
                'is_on_court' => (bool)$p->is_on_court,
                'total_points' => 0,
                'attack_kills' => 0,
                'attack_errors' => 0,
                'aces' => 0,
                'service_errors' => 0,
                'blocks' => 0,
                'digs' => 0,
                'receptions' => 0,
            ];
        }

        foreach ($events as $ev) {
            $side = $ev->team_side;
            $pid = $ev->player_id;
            $targetTeam = $side === 'team_a' ? $teamA : $teamB;

            if ($ev->type === 'ace') {
                $targetTeam['aces']++;
                $targetTeam['points']++;
                if ($pid && isset($playerStats[$pid])) {
                    $playerStats[$pid]['aces']++;
                    $playerStats[$pid]['total_points']++;
                }
            } elseif ($ev->type === 'attack_kill') {
                $targetTeam['attack_kills']++;
                $targetTeam['points']++;
                if ($pid && isset($playerStats[$pid])) {
                    $playerStats[$pid]['attack_kills']++;
                    $playerStats[$pid]['total_points']++;
                }
            } elseif ($ev->type === 'block_point') {
                $targetTeam['blocks']++;
                $targetTeam['points']++;
                if ($pid && isset($playerStats[$pid])) {
                    $playerStats[$pid]['blocks']++;
                    $playerStats[$pid]['total_points']++;
                }
            } elseif ($ev->type === 'service_error') {
                $targetTeam['service_errors']++;
                if ($pid && isset($playerStats[$pid])) $playerStats[$pid]['service_errors']++;
            } elseif ($ev->type === 'attack_error') {
                $targetTeam['attack_errors']++;
                if ($pid && isset($playerStats[$pid])) $playerStats[$pid]['attack_errors']++;
            } elseif ($ev->type === 'dig') {
                $targetTeam['digs']++;
                if ($pid && isset($playerStats[$pid])) $playerStats[$pid]['digs']++;
            } elseif ($ev->type === 'reception') {
                $targetTeam['receptions']++;
                if ($pid && isset($playerStats[$pid])) $playerStats[$pid]['receptions']++;
            }

            if ($side === 'team_a') $teamA = $targetTeam; else $teamB = $targetTeam;
        }

        return [
            'collective' => [
                'team_a' => $teamA,
                'team_b' => $teamB,
            ],
            'set_scores' => $setScores,
            'players' => [
                'team_a' => array_values(array_filter($playerStats, fn ($p) => $p['team_side'] === 'team_a')),
                'team_b' => array_values(array_filter($playerStats, fn ($p) => $p['team_side'] === 'team_b')),
                'all' => array_values($playerStats),
            ],
        ];
    }

    public function checkVictoryConditions(SportMatch $match): ?string
    {
        if ($match->sets_won_a >= 3) {
            return 'team_a';
        }
        if ($match->sets_won_b >= 3) {
            return 'team_b';
        }
        return null;
    }

    public function getScoreboardData(SportMatch $match): array
    {
        $state = $match->rules_state ?? [];
        return [
            'sport' => 'volleyball',
            'official_body' => 'FIVB',
            'sets_won_a' => $match->sets_won_a ?? 0,
            'sets_won_b' => $match->sets_won_b ?? 0,
            'current_set' => $match->current_period ?? 1,
            'current_set_score_a' => $match->score_team_a,
            'current_set_score_b' => $match->score_team_b,
            'serving_side' => $match->serving_side ?? 'team_a',
            'team_a_rotations' => $state['team_a_rotations'] ?? [1, 2, 3, 4, 5, 6],
            'team_b_rotations' => $state['team_b_rotations'] ?? [1, 2, 3, 4, 5, 6],
            'is_match_point_a' => $this->isMatchPoint($match, 'team_a'),
            'is_match_point_b' => $this->isMatchPoint($match, 'team_b'),
        ];
    }

    private function isMatchPoint(SportMatch $match, string $side): bool
    {
        $setsWon = ($side === 'team_a') ? $match->sets_won_a : $match->sets_won_b;
        if ($setsWon < 2) return false; // Needs 2 sets won already

        $target = ($match->current_period === 5) ? 15 : 25;
        $score = ($side === 'team_a') ? $match->score_team_a : $match->score_team_b;
        $opp = ($side === 'team_a') ? $match->score_team_b : $match->score_team_a;

        return ($score >= ($target - 1)) && (($score - $opp) >= 1);
    }

    private function initTeamStats(): array
    {
        return [
            'points' => 0,
            'attack_kills' => 0,
            'attack_errors' => 0,
            'aces' => 0,
            'service_errors' => 0,
            'blocks' => 0,
            'digs' => 0,
            'receptions' => 0,
        ];
    }
}
