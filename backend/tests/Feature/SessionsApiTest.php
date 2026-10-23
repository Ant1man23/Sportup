<?php

namespace Tests\Feature;

use App\Models\Sport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SessionsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_sports_list(): void
    {
        Sport::firstOrCreate(['slug' => 'football'], ['name' => 'Football', 'icon' => '⚽', 'is_active' => true]);

        $response = $this->getJson('/api/v1/sports');

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'Football']);
    }

    public function test_authenticated_user_can_fetch_sessions(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/sessions');

        $response->assertStatus(200);
    }

    public function test_user_can_create_session_with_competition_and_location(): void
    {
        $organizer = User::factory()->create(['role' => 'organizer']);
        $sport = Sport::firstOrCreate(['slug' => 'futsal'], ['name' => 'Futsal', 'icon' => '⚽', 'is_active' => true]);

        $response = $this->actingAs($organizer, 'sanctum')
            ->postJson('/api/v1/sessions', [
                'sport_id' => $sport->id,
                'competition_type' => 'corporate',
                'participation_mode' => 'approval_required',
                'spectator_access' => 'free',
                'format' => '5v5',
                'session_date' => now()->addDays(2)->toDateString(),
                'start_time' => '18:30:00',
                'address' => 'Gymnase Mahamasina',
                'location_details' => 'Porte B, Terrain couvert près du Palais des Sports',
                'city' => 'Antananarivo',
                'max_participants' => 12,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('competition_type', 'corporate')
            ->assertJsonPath('participation_mode', 'approval_required')
            ->assertJsonPath('location_details', 'Porte B, Terrain couvert près du Palais des Sports');

        $this->assertDatabaseHas('sport_sessions', [
            'competition_type' => 'corporate',
            'city' => 'Antananarivo',
        ]);
    }

    public function test_calendar_endpoint_returns_scheduled_sessions(): void
    {
        $user = User::factory()->create();
        $sport = Sport::firstOrCreate(['slug' => 'basketball-5x5'], [
            'name' => 'Basket 5x5',
            'icon' => '🏀',
            'is_active' => true,
        ]);

        \App\Models\SportSession::create([
            'organizer_id' => $user->id,
            'sport_id' => $sport->id,
            'type' => 'free_match',
            'competition_type' => 'tournament',
            'participation_mode' => 'open',
            'spectator_access' => 'free',
            'format' => '5v5',
            'session_date' => now()->addDays(5)->toDateString(),
            'start_time' => '15:00:00',
            'latitude' => -18.8792,
            'longitude' => 47.5079,
            'city' => 'Antananarivo',
            'max_participants' => 10,
            'current_participants' => 1,
            'status' => 'open',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/calendar');

        $response->assertStatus(200)
            ->assertJsonStructure([
                '*' => ['id', 'session_date', 'start_time', 'sport', 'organizer']
            ]);
    }

    public function test_spectator_cannot_start_match(): void
    {
        $organizer = User::factory()->create(['role' => 'organizer']);
        $spectator = User::factory()->create(['role' => 'spectator']);
        $sport = Sport::firstOrCreate(['slug' => 'volleyball'], [
            'name' => 'Volley',
            'icon' => '🏐',
            'is_active' => true,
        ]);

        $session = \App\Models\SportSession::create([
            'organizer_id' => $organizer->id,
            'sport_id' => $sport->id,
            'type' => 'find_players',
            'competition_type' => 'friendly',
            'format' => '6v6',
            'session_date' => now()->toDateString(),
            'start_time' => '17:00:00',
            'latitude' => -18.8792,
            'longitude' => 47.5079,
            'city' => 'Antananarivo',
            'max_participants' => 12,
            'current_participants' => 1,
            'status' => 'open',
        ]);

        $response = $this->actingAs($spectator, 'sanctum')
            ->postJson("/api/v1/sessions/{$session->id}/match/start");

        $response->assertStatus(403);
    }
}

