<?php

namespace Tests\Feature;

use App\Models\Sport;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeamApiTest extends TestCase
{
    use RefreshDatabase;

    private User $captain;
    private Sport $sport;

    protected function setUp(): void
    {
        parent::setUp();
        $this->captain = User::factory()->create();
        $this->sport   = Sport::factory()->create();
    }

    // ── Création d'équipe ──────────────────────────────────────────────────

    public function test_captain_can_create_team(): void
    {
        $response = $this->actingAs($this->captain, 'sanctum')
            ->postJson('/api/v1/teams', [
                'name'     => 'Les Lions',
                'sport_id' => $this->sport->id,
                'level'    => 'intermediate',
                'city'     => 'Antananarivo',
            ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Les Lions']);

        $this->assertDatabaseHas('teams', [
            'name'       => 'Les Lions',
            'captain_id' => $this->captain->id,
        ]);
    }

    public function test_create_team_requires_name_and_sport(): void
    {
        $response = $this->actingAs($this->captain, 'sanctum')
            ->postJson('/api/v1/teams', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'sport_id']);
    }

    // ── Liste et détail ───────────────────────────────────────────────────

    public function test_user_can_list_their_teams(): void
    {
        // Créer une équipe dont le captain est notre user
        $team = Team::factory()->create([
            'sport_id'   => $this->sport->id,
            'captain_id' => $this->captain->id,
        ]);
        $team->members()->attach($this->captain->id, ['role' => 'captain']);

        $response = $this->actingAs($this->captain, 'sanctum')
            ->getJson('/api/v1/teams');

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => $team->name]);
    }

    public function test_user_can_get_team_details(): void
    {
        $team = Team::factory()->create([
            'sport_id'   => $this->sport->id,
            'captain_id' => $this->captain->id,
        ]);
        $team->members()->attach($this->captain->id, ['role' => 'captain']);

        $response = $this->actingAs($this->captain, 'sanctum')
            ->getJson("/api/v1/teams/{$team->id}");

        $response->assertStatus(200)
            ->assertJsonStructure(['id', 'name', 'sport', 'captain', 'members']);
    }

    // ── Invitations ───────────────────────────────────────────────────────

    public function test_captain_can_invite_member_by_username(): void
    {
        $team = Team::factory()->create([
            'sport_id'   => $this->sport->id,
            'captain_id' => $this->captain->id,
        ]);
        $team->members()->attach($this->captain->id, ['role' => 'captain']);

        $newPlayer = User::factory()->create(['username' => 'joueur_test_xyz']);

        $response = $this->actingAs($this->captain, 'sanctum')
            ->postJson("/api/v1/teams/{$team->id}/invitations", [
                'username' => 'joueur_test_xyz',
            ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['message' => "Invitation envoyée avec succès à {$newPlayer->username}."]);

        $this->assertDatabaseHas('team_invitations', [
            'team_id' => $team->id,
            'user_id' => $newPlayer->id,
            'status'  => 'pending',
        ]);
    }

    public function test_non_captain_cannot_invite_member(): void
    {
        $team = Team::factory()->create([
            'sport_id'   => $this->sport->id,
            'captain_id' => $this->captain->id,
        ]);

        $other = User::factory()->create();

        $response = $this->actingAs($other, 'sanctum')
            ->postJson("/api/v1/teams/{$team->id}/invitations", [
                'username' => 'quelqu_un',
            ]);

        $response->assertStatus(403);
    }

    public function test_player_can_accept_team_invitation(): void
    {
        $team = Team::factory()->create([
            'sport_id'   => $this->sport->id,
            'captain_id' => $this->captain->id,
        ]);
        $team->members()->attach($this->captain->id, ['role' => 'captain']);

        $player = User::factory()->create();

        $invitation = \App\Models\TeamInvitation::create([
            'team_id'    => $team->id,
            'user_id'    => $player->id,
            'invited_by' => $this->captain->id,
            'status'     => 'pending',
        ]);

        $response = $this->actingAs($player, 'sanctum')
            ->postJson("/api/v1/teams/invitations/{$invitation->id}/respond", [
                'action' => 'accept',
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('team_members', [
            'team_id' => $team->id,
            'user_id' => $player->id,
        ]);
    }

    public function test_player_can_decline_team_invitation(): void
    {
        $team   = Team::factory()->create(['sport_id' => $this->sport->id, 'captain_id' => $this->captain->id]);
        $player = User::factory()->create();

        $invitation = \App\Models\TeamInvitation::create([
            'team_id'    => $team->id,
            'user_id'    => $player->id,
            'invited_by' => $this->captain->id,
            'status'     => 'pending',
        ]);

        $response = $this->actingAs($player, 'sanctum')
            ->postJson("/api/v1/teams/invitations/{$invitation->id}/respond", [
                'action' => 'decline',
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('team_invitations', [
            'id'     => $invitation->id,
            'status' => 'declined',
        ]);
    }

    // ── Statut adversaire ─────────────────────────────────────────────────

    public function test_captain_can_toggle_opponent_status(): void
    {
        $team = Team::factory()->create([
            'sport_id'                => $this->sport->id,
            'captain_id'              => $this->captain->id,
            'is_looking_for_opponent' => false,
        ]);

        $response = $this->actingAs($this->captain, 'sanctum')
            ->putJson("/api/v1/teams/{$team->id}/opponent-status", [
                'is_looking_for_opponent' => true,
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('teams', [
            'id'                      => $team->id,
            'is_looking_for_opponent' => true,
        ]);
    }

    public function test_non_captain_cannot_toggle_opponent_status(): void
    {
        $team  = Team::factory()->create(['sport_id' => $this->sport->id, 'captain_id' => $this->captain->id]);
        $other = User::factory()->create();

        $response = $this->actingAs($other, 'sanctum')
            ->putJson("/api/v1/teams/{$team->id}/opponent-status", [
                'is_looking_for_opponent' => true,
            ]);

        $response->assertStatus(403);
    }
}
