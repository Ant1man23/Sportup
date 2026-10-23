<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\Sport;
use App\Models\SportMatch;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\TeamInvitation;
use App\Models\Tournament;
use App\Models\User;
use App\Models\UserSportStatistics;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class V2FeaturesTest extends TestCase
{
    use RefreshDatabase;

    private Sport $football;
    private Sport $volleyball;
    private User $user1;
    private User $user2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->football = Sport::firstOrCreate(['slug' => 'football'], [
            'name' => 'Football',
            'icon' => 'football',
            'color_hex' => '#10B981',
            'is_active' => true,
        ]);

        $this->volleyball = Sport::firstOrCreate(['slug' => 'volleyball'], [
            'name' => 'Volleyball',
            'icon' => 'volleyball',
            'color_hex' => '#9C27B0',
            'is_active' => true,
        ]);

        $this->user1 = User::factory()->create([
            'city'  => 'Paris',
            'level' => 'intermediate',
        ]);

        $this->user2 = User::factory()->create([
            'city'  => 'Paris',
            'level' => 'advanced',
        ]);
    }

    public function test_tournament_lifecycle(): void
    {
        Sanctum::actingAs($this->user1);

        // 1. Create Tournament
        $resp = $this->postJson('/api/v1/tournaments', [
            'name' => 'Summer Cup 2026',
            'sport_id' => $this->football->id,
            'format' => 'knockout',
            'start_date' => now()->addDays(7)->toDateString(),
            'max_teams' => 8,
            'prize_pool' => '500 €',
        ]);

        $resp->assertStatus(201)
            ->assertJsonPath('name', 'Summer Cup 2026')
            ->assertJsonPath('format', 'knockout');

        $tournamentId = $resp->json('id');

        // Create 2 teams
        $team1 = Team::create([
            'name' => 'Team Alpha',
            'sport_id' => $this->football->id,
            'captain_id' => $this->user1->id,
        ]);
        $team1->members()->attach($this->user1->id, ['role' => 'captain']);

        $team2 = Team::create([
            'name' => 'Team Beta',
            'sport_id' => $this->football->id,
            'captain_id' => $this->user2->id,
        ]);
        $team2->members()->attach($this->user2->id, ['role' => 'captain']);

        // Register team 1
        $this->postJson("/api/v1/tournaments/{$tournamentId}/register", ['team_id' => $team1->id])
            ->assertStatus(201);

        // Register team 2 as user 2
        Sanctum::actingAs($this->user2);
        $this->postJson("/api/v1/tournaments/{$tournamentId}/register", ['team_id' => $team2->id])
            ->assertStatus(201);

        // Draw as organizer (user1)
        Sanctum::actingAs($this->user1);
        $this->postJson("/api/v1/tournaments/{$tournamentId}/draw")
            ->assertStatus(200);

        // Check standings & bracket
        $this->getJson("/api/v1/tournaments/{$tournamentId}/standings")
            ->assertStatus(200)
            ->assertJsonCount(2);

        $this->getJson("/api/v1/tournaments/{$tournamentId}/bracket")
            ->assertStatus(200);
    }

    public function test_teams_v2_opponent_search_and_invitations(): void
    {
        Sanctum::actingAs($this->user1);

        // Create team looking for opponent
        $team = Team::create([
            'name' => 'Red Devils',
            'sport_id' => $this->football->id,
            'captain_id' => $this->user1->id,
            'level' => 'intermediate',
            'city' => 'Paris',
            'is_looking_for_opponent' => true,
        ]);
        $team->members()->attach($this->user1->id, ['role' => 'captain']);

        // Search opponent
        $this->getJson('/api/v1/teams?lookingForOpponent=true&city=Paris')
            ->assertStatus(200)
            ->assertJsonFragment(['name' => 'Red Devils']);

        // Invite player two
        $inviteResp = $this->postJson("/api/v1/teams/{$team->id}/invitations", [
            'user_id' => $this->user2->id,
        ]);
        $inviteResp->assertStatus(201);
        $inviteId = $inviteResp->json('invitation.id');

        // Player two accepts invitation
        Sanctum::actingAs($this->user2);
        $this->getJson('/api/v1/teams/invitations/my')
            ->assertStatus(200)
            ->assertJsonCount(1);

        $this->postJson("/api/v1/teams/invitations/{$inviteId}/respond", ['action' => 'accept'])
            ->assertStatus(200);

        $this->assertDatabaseHas('team_members', [
            'team_id' => $team->id,
            'user_id' => $this->user2->id,
            'role' => 'member',
        ]);
    }

    public function test_match_events_v2(): void
    {
        Sanctum::actingAs($this->user1);

        $session = SportSession::create([
            'organizer_id' => $this->user1->id,
            'sport_id' => $this->football->id,
            'type' => 'find_players',
            'format' => '5v5',
            'session_date' => now()->toDateString(),
            'start_time' => '14:00',
            'latitude' => 48.8566,
            'longitude' => 2.3522,
            'address' => 'Stade de France',
            'city' => 'Paris',
            'max_participants' => 10,
            'status' => 'open',
        ]);

        // Start match
        $matchResp = $this->postJson("/api/v1/sessions/{$session->id}/match/start");
        $matchResp->assertStatus(201);
        $matchId = $matchResp->json('id');

        // Add 'point' event (V2 event type)
        $this->postJson("/api/v1/matches/{$matchId}/events", [
            'type' => 'point',
            'team_side' => 'team_a',
            'minute' => 12,
        ])->assertStatus(201);

        // Add 'assist' event (V2 event type)
        $this->postJson("/api/v1/matches/{$matchId}/events", [
            'type' => 'assist',
            'team_side' => 'team_a',
            'minute' => 15,
        ])->assertStatus(201);

        // Verify score incremented
        $this->assertDatabaseHas('matches', [
            'id' => $matchId,
            'score_team_a' => 1,
        ]);

        // Finish match
        $this->postJson("/api/v1/matches/{$matchId}/finish")
            ->assertStatus(200)
            ->assertJsonPath('status', 'finished');
    }

    public function test_chat_session_conversation(): void
    {
        Sanctum::actingAs($this->user1);

        $session = SportSession::create([
            'organizer_id' => $this->user1->id,
            'sport_id' => $this->football->id,
            'type' => 'find_players',
            'format' => '5v5',
            'session_date' => now()->toDateString(),
            'start_time' => '15:00',
            'latitude' => 48.8566,
            'longitude' => 2.3522,
            'address' => 'Stade de France',
            'city' => 'Paris',
            'max_participants' => 10,
            'status' => 'open',
        ]);

        // Organizer retrieves session conversation
        $convResp = $this->getJson("/api/v1/sessions/{$session->id}/conversation");
        $convResp->assertStatus(200);
        $convId = $convResp->json('id');

        // Send message
        $msgResp = $this->postJson("/api/v1/conversations/{$convId}/messages", [
            'body' => 'Bonjour l\'équipe !',
        ]);
        $msgResp->assertStatus(201)
            ->assertJsonPath('body', 'Bonjour l\'équipe !');

        // Fetch messages
        $this->getJson("/api/v1/conversations/{$convId}/messages")
            ->assertStatus(200)
            ->assertJsonCount(1);
    }

    public function test_user_statistics_v2(): void
    {
        Sanctum::actingAs($this->user1);

        UserSportStatistics::create([
            'user_id' => $this->user1->id,
            'sport_id' => $this->football->id,
            'matches_played' => 10,
            'wins' => 7,
            'losses' => 2,
            'draws' => 1,
            'goals_scored' => 15,
            'points_scored' => 0,
            'assists' => 8,
            'rebounds' => 0,
            'blocks' => 0,
            'steals' => 5,
            'mvp_count' => 3,
        ]);

        $resp = $this->getJson("/api/v1/users/{$this->user1->id}/statistics");
        $resp->assertStatus(200)
            ->assertJsonPath('summary.matches_played', 10)
            ->assertJsonPath('summary.wins', 7)
            ->assertJsonPath('summary.win_rate', 70)
            ->assertJsonPath('summary.assists', 8)
            ->assertJsonPath('summary.steals', 5);
    }

    public function test_notification_preferences_v2(): void
    {
        Sanctum::actingAs($this->user1);

        $this->getJson('/api/v1/notification-preferences')
            ->assertStatus(200)
            ->assertJsonPath('reminder_minutes_before', 60);

        $updateResp = $this->putJson('/api/v1/notification-preferences', [
            'reminder_minutes_before' => 30,
            'preferences' => [
                ['type' => 'match_reminder', 'push_enabled' => true],
                ['type' => 'team_invitation', 'push_enabled' => false],
            ],
        ]);

        $updateResp->assertStatus(200);

        $this->assertDatabaseHas('users', [
            'id' => $this->user1->id,
            'reminder_minutes_before' => 30,
        ]);

        $this->assertDatabaseHas('notification_preferences', [
            'user_id' => $this->user1->id,
            'type' => 'team_invitation',
            'push_enabled' => false,
        ]);
    }
}
