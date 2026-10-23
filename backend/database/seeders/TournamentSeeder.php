<?php

namespace Database\Seeders;

use App\Models\Sport;
use App\Models\SportMatch;
use App\Models\Team;
use App\Models\Tournament;
use App\Models\TournamentStanding;
use App\Models\User;
use Illuminate\Database\Seeder;

class TournamentSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();
        if (!$user) return;

        $football = Sport::where('slug', 'like', 'football%')->first();
        $basket   = Sport::where('slug', 'like', 'basketball%')->first();

        if ($football) {
            Tournament::firstOrCreate(
                ['name' => 'Coupe SportUp Antananarivo'],
                [
                    'sport_id'    => $football->id,
                    'organizer_id'=> $user->id,
                    'start_date'  => now()->addDays(17)->format('Y-m-d'),
                    'end_date'    => now()->addDays(17)->format('Y-m-d'),
                    'location'    => 'Stade Municipal de Mahamasina',
                    'city'        => 'Antananarivo',
                    'max_teams'   => 16,
                    'prize_pool'  => '1 500 000 Ar',
                    'status'      => 'open',
                    'is_featured' => true,
                    'description' => 'Le tournoi officiel SportUp. 16 équipes, format élimination directe. Inscriptions ouvertes jusqu\'au 18 octobre.',
                ]
            );

            $tInProgress = Tournament::firstOrCreate(
                ['name' => 'Five League — Automne 2026'],
                [
                    'sport_id'    => $football->id,
                    'organizer_id'=> $user->id,
                    'start_date'  => now()->subDays(5)->format('Y-m-d'),
                    'city'        => 'Antananarivo',
                    'max_teams'   => 8,
                    'status'      => 'in_progress',
                    'is_featured' => false,
                    'description' => 'Ligue de Football 5 — Saison Automne 2026.',
                ]
            );

            // Seed Teams for Five League
            $teamsData = [
                ['name' => 'FC Tanà', 'invite_code' => 'SP-TANA', 'level' => 'advanced'],
                ['name' => 'Ajesaia Juniors', 'invite_code' => 'SP-AJES', 'level' => 'intermediate'],
                ['name' => 'Barea Academy', 'invite_code' => 'SP-BARE', 'level' => 'advanced'],
                ['name' => 'Red Dragons MG', 'invite_code' => 'SP-RDRA', 'level' => 'intermediate'],
            ];

            $seededTeams = [];
            foreach ($teamsData as $td) {
                $seededTeams[] = Team::firstOrCreate(
                    ['name' => $td['name']],
                    [
                        'sport_id' => $football->id,
                        'captain_id' => $user->id,
                        'invite_code' => $td['invite_code'],
                        'city' => 'Antananarivo',
                        'level' => $td['level'],
                        'max_members' => 12,
                    ]
                );
            }

            // Attach teams to tournament if not attached
            foreach ($seededTeams as $idx => $team) {
                if (!$tInProgress->teams()->where('team_id', $team->id)->exists()) {
                    $tInProgress->teams()->attach($team->id, [
                        'status' => 'accepted',
                        'seed' => $idx + 1,
                        'group_label' => $idx < 2 ? 'A' : 'B',
                    ]);
                }

                TournamentStanding::firstOrCreate(
                    ['tournament_id' => $tInProgress->id, 'team_id' => $team->id],
                    [
                        'played' => 3,
                        'wins' => $idx === 0 ? 3 : ($idx === 2 ? 2 : 1),
                        'draws' => 0,
                        'losses' => $idx === 0 ? 0 : ($idx === 2 ? 1 : 2),
                        'points_for' => 8 - $idx * 2,
                        'points_against' => 2 + $idx,
                        'points' => $idx === 0 ? 9 : ($idx === 2 ? 6 : 3),
                    ]
                );
            }

            // Seed Bracket Knockout Matches
            // Semi 1: FC Tanà vs Ajesaia Juniors (Finished)
            SportMatch::firstOrCreate(
                [
                    'tournament_id' => $tInProgress->id,
                    'stage' => 'semi',
                    'round_number' => 1,
                    'team_a_id' => $seededTeams[0]->id,
                    'team_b_id' => $seededTeams[1]->id,
                ],
                [
                    'status' => 'finished',
                    'score_team_a' => 4,
                    'score_team_b' => 2,
                    'current_period' => 2,
                    'total_periods' => 2,
                    'period_duration_seconds' => 1200,
                    'elapsed_seconds' => 2400,
                    'started_at' => now()->subDays(2),
                    'finished_at' => now()->subDays(2)->addHours(1),
                ]
            );

            // Semi 2: Barea Academy vs Red Dragons MG (Finished)
            SportMatch::firstOrCreate(
                [
                    'tournament_id' => $tInProgress->id,
                    'stage' => 'semi',
                    'round_number' => 1,
                    'team_a_id' => $seededTeams[2]->id,
                    'team_b_id' => $seededTeams[3]->id,
                ],
                [
                    'status' => 'finished',
                    'score_team_a' => 3,
                    'score_team_b' => 1,
                    'current_period' => 2,
                    'total_periods' => 2,
                    'period_duration_seconds' => 1200,
                    'elapsed_seconds' => 2400,
                    'started_at' => now()->subDays(2),
                    'finished_at' => now()->subDays(2)->addHours(1),
                ]
            );

            // Final: FC Tanà vs Barea Academy (Finished -> FC Tanà is Champion!)
            SportMatch::firstOrCreate(
                [
                    'tournament_id' => $tInProgress->id,
                    'stage' => 'final',
                    'round_number' => 2,
                    'team_a_id' => $seededTeams[0]->id,
                    'team_b_id' => $seededTeams[2]->id,
                ],
                [
                    'status' => 'finished',
                    'score_team_a' => 3,
                    'score_team_b' => 2,
                    'current_period' => 2,
                    'total_periods' => 2,
                    'period_duration_seconds' => 1200,
                    'elapsed_seconds' => 2400,
                    'started_at' => now()->subDay(),
                    'finished_at' => now()->subDay()->addHours(1),
                ]
            );
        }

        if ($basket) {
            Tournament::firstOrCreate(
                ['name' => 'Urban Hoops 3x3 Challenge'],
                [
                    'sport_id'    => $basket->id,
                    'organizer_id'=> $user->id,
                    'start_date'  => now()->addDays(24)->format('Y-m-d'),
                    'location'    => 'Terrain Ampefiloha',
                    'city'        => 'Antananarivo',
                    'max_teams'   => 12,
                    'prize_pool'  => '800 000 Ar',
                    'status'      => 'open',
                    'is_featured' => false,
                    'description' => 'Tournoi 3x3 streetball en plein air. Format rapide, ambiance garantie.',
                ]
            );
        }
    }
}
