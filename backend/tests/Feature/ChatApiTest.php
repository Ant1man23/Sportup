<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatApiTest extends TestCase
{
    use RefreshDatabase;

    private User $organizer;
    private User $player;
    private Sport $sport;

    protected function setUp(): void
    {
        parent::setUp();
        $this->organizer = User::factory()->create();
        $this->player    = User::factory()->create();
        $this->sport     = Sport::factory()->create();
    }

    // ── Chat de session ───────────────────────────────────────────────────

    public function test_organizer_can_get_session_conversation(): void
    {
        $session = SportSession::factory()->create([
            'sport_id'     => $this->sport->id,
            'organizer_id' => $this->organizer->id,
        ]);

        $response = $this->actingAs($this->organizer, 'sanctum')
            ->getJson("/api/v1/sessions/{$session->id}/conversation");

        $response->assertStatus(200)
            ->assertJsonStructure(['id', 'type', 'messages']);

        $this->assertDatabaseHas('conversations', [
            'type'       => 'session',
            'session_id' => $session->id,
        ]);
    }

    public function test_participant_can_get_session_conversation(): void
    {
        $session = SportSession::factory()->create([
            'sport_id'     => $this->sport->id,
            'organizer_id' => $this->organizer->id,
        ]);
        $session->participants()->attach($this->player->id);

        $response = $this->actingAs($this->player, 'sanctum')
            ->getJson("/api/v1/sessions/{$session->id}/conversation");

        $response->assertStatus(200);
    }

    public function test_non_participant_cannot_access_session_chat(): void
    {
        $session  = SportSession::factory()->create([
            'sport_id'     => $this->sport->id,
            'organizer_id' => $this->organizer->id,
        ]);
        $stranger = User::factory()->create();

        $response = $this->actingAs($stranger, 'sanctum')
            ->getJson("/api/v1/sessions/{$session->id}/conversation");

        $response->assertStatus(403);
    }

    // ── Envoi de messages ─────────────────────────────────────────────────

    public function test_participant_can_send_message_in_session_chat(): void
    {
        $session = SportSession::factory()->create([
            'sport_id'     => $this->sport->id,
            'organizer_id' => $this->organizer->id,
        ]);
        $session->participants()->attach($this->player->id);

        $conv = Conversation::create([
            'type'       => 'session',
            'session_id' => $session->id,
        ]);

        $response = $this->actingAs($this->player, 'sanctum')
            ->postJson("/api/v1/conversations/{$conv->id}/messages", [
                'body' => 'Je serai là à 15h !',
            ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['body' => 'Je serai là à 15h !']);

        $this->assertDatabaseHas('messages', [
            'conversation_id' => $conv->id,
            'sender_id'       => $this->player->id,
            'body'            => 'Je serai là à 15h !',
        ]);
    }

    public function test_message_body_is_required(): void
    {
        $conv = Conversation::create([
            'type'       => 'session',
            'session_id' => null,
        ]);

        $response = $this->actingAs($this->organizer, 'sanctum')
            ->postJson("/api/v1/conversations/{$conv->id}/messages", [
                'body' => '',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['body']);
    }

    public function test_user_can_fetch_messages_from_conversation(): void
    {
        $conv = Conversation::create(['type' => 'session', 'session_id' => null]);

        \App\Models\Message::create([
            'conversation_id' => $conv->id,
            'sender_id'       => $this->organizer->id,
            'body'            => 'Premier message',
        ]);

        $response = $this->actingAs($this->organizer, 'sanctum')
            ->getJson("/api/v1/conversations/{$conv->id}/messages");

        $response->assertStatus(200)
            ->assertJsonFragment(['body' => 'Premier message']);
    }

    // ── Chat d'équipe ─────────────────────────────────────────────────────

    public function test_team_member_can_access_team_chat(): void
    {
        $team = Team::factory()->create([
            'sport_id'   => $this->sport->id,
            'captain_id' => $this->organizer->id,
        ]);
        $team->members()->attach($this->player->id, ['role' => 'member']);

        $response = $this->actingAs($this->player, 'sanctum')
            ->getJson("/api/v1/teams/{$team->id}/conversation");

        $response->assertStatus(200)
            ->assertJsonStructure(['id', 'type', 'messages']);
    }

    public function test_non_member_cannot_access_team_chat(): void
    {
        $team     = Team::factory()->create(['sport_id' => $this->sport->id, 'captain_id' => $this->organizer->id]);
        $stranger = User::factory()->create();

        $response = $this->actingAs($stranger, 'sanctum')
            ->getJson("/api/v1/teams/{$team->id}/conversation");

        $response->assertStatus(403);
    }

    // ── Liste des conversations ───────────────────────────────────────────

    public function test_user_can_list_their_conversations(): void
    {
        $session = SportSession::factory()->create([
            'sport_id'     => $this->sport->id,
            'organizer_id' => $this->organizer->id,
        ]);
        Conversation::create(['type' => 'session', 'session_id' => $session->id]);

        $response = $this->actingAs($this->organizer, 'sanctum')
            ->getJson('/api/v1/conversations');

        $response->assertStatus(200)
            ->assertJsonIsArray();
    }
}
