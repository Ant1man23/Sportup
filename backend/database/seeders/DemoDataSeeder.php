<?php

namespace Database\Seeders;

use App\Models\MatchEvent;
use App\Models\Sport;
use App\Models\SportMatch;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\User;
use App\Models\UserSportStatistics;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create Demo Users in Madagascar
        $users = [
            [
                'username' => 'karim_benali',
                'email' => 'karim@sportup.app',
                'password' => Hash::make('Password123!'),
                'city' => 'Antananarivo',
                'level' => 'advanced',
            ],
            [
                'username' => 'mehdi_k',
                'email' => 'mehdi@sportup.app',
                'password' => Hash::make('Password123!'),
                'city' => 'Antananarivo',
                'level' => 'intermediate',
            ],
            [
                'username' => 'mialy_r',
                'email' => 'mialy@sportup.app',
                'password' => Hash::make('Password123!'),
                'city' => 'Toamasina',
                'level' => 'intermediate',
            ],
            [
                'username' => 'tojo_a',
                'email' => 'tojo@sportup.app',
                'password' => Hash::make('Password123!'),
                'city' => 'Antsirabe',
                'level' => 'advanced',
            ],
            [
                'username' => 'hery_n',
                'email' => 'hery@sportup.app',
                'password' => Hash::make('Password123!'),
                'city' => 'Fianarantsoa',
                'level' => 'beginner',
            ],
        ];

        $createdUsers = [];
        foreach ($users as $u) {
            $createdUsers[] = User::updateOrCreate(['email' => $u['email']], $u);
        }

        $football = Sport::where('slug', 'football')->first();
        $basketball = Sport::where('slug', 'basketball')->first();

        // Attach favorite sports
        $createdUsers[0]->favoriteSports()->sync([$football->id, $basketball->id]);
        $createdUsers[1]->favoriteSports()->sync([$football->id, $basketball->id]);
        $createdUsers[2]->favoriteSports()->sync([$football->id]);
        $createdUsers[3]->favoriteSports()->sync([$football->id, $basketball->id]);
        $createdUsers[4]->favoriteSports()->sync([$basketball->id]);

        // 2. Demo Sessions in Madagascar
        $sessions = [
            [
                'organizer_id' => $createdUsers[1]->id,
                'sport_id' => $football->id,
                'type' => 'free_match',
                'format' => '5v5',
                'session_date' => now()->subDay()->format('Y-m-d'),
                'start_time' => '18:00',
                'latitude' => -18.8792,
                'longitude' => 47.5079,
                'address' => 'Stade Municipal de Mahamasina',
                'city' => 'Antananarivo',
                'region' => 'Analamanga',
                'country' => 'MG',
                'level' => 'intermediate',
                'max_participants' => 10,
                'current_participants' => 8,
                'description' => 'Five à Mahamasina. Ambiance conviviale, niveau intermédiaire !',
                'status' => 'open',
            ],
            [
                'organizer_id' => $createdUsers[0]->id,
                'sport_id' => $basketball->id,
                'type' => 'find_players',
                'format' => '3v3',
                'session_date' => now()->addDays(2)->format('Y-m-d'),
                'start_time' => '10:30',
                'latitude' => -18.9100,
                'longitude' => 47.5250,
                'address' => 'Playground Ampefiloha',
                'city' => 'Antananarivo',
                'region' => 'Analamanga',
                'country' => 'MG',
                'level' => 'advanced',
                'max_participants' => 6,
                'current_participants' => 5,
                'description' => 'Run 3v3 Basket du dimanche matin. On cherche un 6e joueur !',
                'status' => 'open',
            ],
            [
                'organizer_id' => $createdUsers[2]->id,
                'sport_id' => $football->id,
                'type' => 'find_opponent',
                'format' => '11v11',
                'session_date' => now()->addDays(3)->format('Y-m-d'),
                'start_time' => '15:30',
                'latitude' => -18.1492,
                'longitude' => 49.4023,
                'address' => 'Stade Municipal de Toamasina',
                'city' => 'Toamasina',
                'region' => 'Atsinanana',
                'country' => 'MG',
                'level' => 'intermediate',
                'max_participants' => 22,
                'current_participants' => 18,
                'description' => 'Recherche d\'équipe adversaire pour match 11v11 à Toamasina.',
                'status' => 'open',
            ],
        ];

        $createdSessions = [];
        foreach ($sessions as $sData) {
            $sess = SportSession::create($sData);
            $sess->participants()->attach($sData['organizer_id']);
            $createdSessions[] = $sess;
        }

        // Attach Karim & Mehdi to session 0 so Karim has this match in his history
        $createdSessions[0]->participants()->syncWithoutDetaching([
            $createdUsers[0]->id, // Karim
            $createdUsers[1]->id, // Mehdi
            $createdUsers[3]->id, // Tojo
            $createdUsers[4]->id, // Hery
        ]);

        // 3. Demo Match for Session 0 (Finished with score & events)
        $match = SportMatch::create([
            'session_id' => $createdSessions[0]->id,
            'status' => 'finished',
            'score_team_a' => 5,
            'score_team_b' => 3,
            'current_period' => 2,
            'total_periods' => 2,
            'period_duration_seconds' => 1500,
            'elapsed_seconds' => 3000,
            'started_at' => now()->subDay()->setTime(18, 0),
            'finished_at' => now()->subDay()->setTime(19, 0),
        ]);

        MatchEvent::create([
            'match_id' => $match->id,
            'type' => 'goal',
            'team_side' => 'team_a',
            'player_id' => $createdUsers[0]->id, // Karim
            'minute' => 14,
        ]);

        MatchEvent::create([
            'match_id' => $match->id,
            'type' => 'goal',
            'team_side' => 'team_a',
            'player_id' => $createdUsers[0]->id, // Karim
            'minute' => 32,
        ]);

        MatchEvent::create([
            'match_id' => $match->id,
            'type' => 'goal',
            'team_side' => 'team_b',
            'player_id' => $createdUsers[1]->id, // Mehdi
            'minute' => 40,
        ]);

        // 4. Demo Teams
        // --- Team 1 : Antananarivo Falcons (Football) — capitaine : Karim
        $team1 = Team::create([
            'name' => 'Antananarivo Falcons',
            'sport_id' => $football->id,
            'captain_id' => $createdUsers[0]->id,
            'max_members' => 11,
        ]);

        $team1->members()->attach([
            $createdUsers[0]->id => ['role' => 'captain'],
            $createdUsers[1]->id => ['role' => 'member'],
            $createdUsers[3]->id => ['role' => 'member'],
            $createdUsers[4]->id => ['role' => 'member'],
        ]);

        // --- Team 2 : Tana Ballers (Basketball) — capitaine : Mehdi
        $team2 = Team::create([
            'name' => 'Tana Ballers',
            'sport_id' => $basketball->id,
            'captain_id' => $createdUsers[1]->id,
            'max_members' => 12,
        ]);

        $team2->members()->attach([
            $createdUsers[1]->id => ['role' => 'captain'],
            $createdUsers[0]->id => ['role' => 'member'],
            $createdUsers[2]->id => ['role' => 'member'],
        ]);

        // 5. User Sport Statistics (Karim, Mehdi, Tojo)
        // Karim : Football
        UserSportStatistics::updateOrCreate(
            ['user_id' => $createdUsers[0]->id, 'sport_id' => $football->id],
            [
                'matches_played' => 24,
                'wins' => 18,
                'losses' => 4,
                'draws' => 2,
                'goals_scored' => 15,
                'points_scored' => 0,
                'mvp_count' => 5,
            ]
        );

        // Karim : Basketball
        UserSportStatistics::updateOrCreate(
            ['user_id' => $createdUsers[0]->id, 'sport_id' => $basketball->id],
            [
                'matches_played' => 8,
                'wins' => 5,
                'losses' => 3,
                'draws' => 0,
                'goals_scored' => 0,
                'points_scored' => 42,
                'mvp_count' => 2,
            ]
        );

        // Mehdi : Football
        UserSportStatistics::updateOrCreate(
            ['user_id' => $createdUsers[1]->id, 'sport_id' => $football->id],
            [
                'matches_played' => 14,
                'wins' => 8,
                'losses' => 4,
                'draws' => 2,
                'goals_scored' => 7,
                'points_scored' => 0,
                'mvp_count' => 2,
            ]
        );

        // Mehdi : Basketball
        UserSportStatistics::updateOrCreate(
            ['user_id' => $createdUsers[1]->id, 'sport_id' => $basketball->id],
            [
                'matches_played' => 19,
                'wins' => 13,
                'losses' => 5,
                'draws' => 1,
                'goals_scored' => 0,
                'points_scored' => 85,
                'mvp_count' => 4,
            ]
        );
    }
}
