<?php

namespace Tests\Feature;

use App\Models\Sport;
use App\Models\Team;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TournamentApiTest extends TestCase
{
    use RefreshDatabase;

    private User $organizer;
    private Sport $sport;

    protected function setUp(): void
    {
        parent::setUp();
        $this->organizer = User::factory()->create(['role' => 'organizer']);
        $this->sport     = Sport::factory()->create();
    }

    // ── Création ──────────────────────────────────────────────────────────

    public function test_organizer_can_create_tournament(): void
    {
        $response = $this->actingAs($this->organizer, 'sanctum')
            ->postJson('/api/v1/tournaments', [
                'name'       => 'Coupe de Tana 2026',
                'sport_id'   => $this->sport->id,
                'format'     => 'knockout',
                'start_date' => now()->addDays(7)->format('Y-m-d'),
                'max_teams'  => 8,
            ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Coupe de Tana 2026']);

        $this->assertDatabaseHas('tournaments', [
            'name'         => 'Coupe de Tana 2026',
            'organizer_id' => $this->organizer->id,
        ]);
    }

    public function test_create_tournament_requires_name_sport_dates(): void
    {
        $response = $this->actingAs($this->organizer, 'sanctum')
            ->postJson('/api/v1/tournaments', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'sport_id', 'start_date', 'max_teams']);
    }

    // ── Liste et détail ───────────────────────────────────────────────────

    public function test_anyone_can_list_tournaments(): void
    {
        Tournament::factory()->count(3)->create([
            'sport_id'     => $this->sport->id,
            'organizer_id' => $this->organizer->id,
        ]);

        $player = User::factory()->create();

        $response = $this->actingAs($player, 'sanctum')
            ->getJson('/api/v1/tournaments');

        $response->assertStatus(200)
            ->assertJsonIsArray();

        $this->assertGreaterThanOrEqual(3, count($response->json()));
    }

    public function test_user_can_get_tournament_detail(): void
    {
        $tournament = Tournament::factory()->create([
            'sport_id'     => $this->sport->id,
            'organizer_id' => $this->organizer->id,
        ]);

        $response = $this->actingAs($this->organizer, 'sanctum')
            ->getJson("/api/v1/tournaments/{$tournament->id}");

        $response->assertStatus(200)
            ->assertJsonStructure(['id', 'name', 'sport', 'format', 'status']);
    }

    // ── Inscription ───────────────────────────────────────────────────────

    public function test_user_can_register_for_tournament(): void
    {
        $tournament = Tournament::factory()->create([
            'sport_id'     => $this->sport->id,
            'organizer_id' => $this->organizer->id,
            'status'       => 'open',
            'max_teams'    => 8,
        ]);

        $player = User::factory()->create();
        $team = Team::factory()->create([
            'captain_id' => $player->id,
            'sport_id'   => $this->sport->id,
        ]);

        $response = $this->actingAs($player, 'sanctum')
            ->postJson("/api/v1/tournaments/{$tournament->id}/register", [
                'team_id' => $team->id,
            ]);

        $response->assertStatus(201);
    }

    // ── Standings & Bracket ───────────────────────────────────────────────

    public function test_user_can_get_tournament_standings(): void
    {
        $tournament = Tournament::factory()->create([
            'sport_id'     => $this->sport->id,
            'organizer_id' => $this->organizer->id,
        ]);

        $response = $this->actingAs($this->organizer, 'sanctum')
            ->getJson("/api/v1/tournaments/{$tournament->id}/standings");

        $response->assertStatus(200)
            ->assertJsonIsArray();
    }

    public function test_user_can_get_tournament_bracket(): void
    {
        $tournament = Tournament::factory()->create([
            'sport_id'     => $this->sport->id,
            'organizer_id' => $this->organizer->id,
        ]);

        $response = $this->actingAs($this->organizer, 'sanctum')
            ->getJson("/api/v1/tournaments/{$tournament->id}/bracket");

        $response->assertStatus(200)
            ->assertJsonIsArray();
    }
}
