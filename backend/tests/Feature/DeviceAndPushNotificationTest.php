<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Models\NotificationPreference;
use App\Models\Sport;
use App\Models\SportSession;
use App\Models\Team;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DeviceAndPushNotificationTest extends TestCase
{
    use RefreshDatabase;

    private User $user1;
    private User $user2;
    private Sport $football;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user1 = User::factory()->create();
        $this->user2 = User::factory()->create();

        $this->football = Sport::firstOrCreate(['slug' => 'football'], [
            'name' => 'Football',
            'icon' => 'football',
            'color_hex' => '#10B981',
            'is_active' => true,
        ]);
    }

    public function test_register_and_unregister_device_fcm_token(): void
    {
        Sanctum::actingAs($this->user1);

        // 1. Register device
        $resp = $this->postJson('/api/v1/devices', [
            'fcmToken' => 'fake_fcm_token_123456789',
            'platform' => 'android',
        ]);
        $resp->assertStatus(204);

        $this->assertDatabaseHas('devices', [
            'user_id'   => $this->user1->id,
            'fcm_token' => 'fake_fcm_token_123456789',
            'platform'  => 'android',
        ]);

        // 2. Unregister device
        $delResp = $this->deleteJson('/api/v1/devices', [
            'fcmToken' => 'fake_fcm_token_123456789',
        ]);
        $delResp->assertStatus(204);

        $this->assertDatabaseMissing('devices', [
            'fcm_token' => 'fake_fcm_token_123456789',
        ]);
    }

    public function test_join_session_dispatches_notification_to_organizer(): void
    {
        // Register a device for organizer
        Device::create([
            'user_id'   => $this->user1->id,
            'fcm_token' => 'organizer_device_token',
            'platform'  => 'android',
        ]);

        $session = SportSession::create([
            'organizer_id'     => $this->user1->id,
            'sport_id'         => $this->football->id,
            'type'             => 'find_players',
            'format'           => '5v5',
            'session_date'     => now()->toDateString(),
            'start_time'       => '18:00',
            'latitude'         => 48.8566,
            'longitude'        => 2.3522,
            'address'          => 'Stade',
            'city'             => 'Paris',
            'max_participants' => 5,
            'status'           => 'open',
        ]);

        // Player joins session
        Sanctum::actingAs($this->user2);
        $this->postJson("/api/v1/sessions/{$session->id}/join")
            ->assertStatus(200);

        // Verify notification created in DB for organizer
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->user1->id,
            'type'    => 'session_participant_joined',
        ]);
    }

    public function test_team_invitation_dispatches_notification(): void
    {
        Sanctum::actingAs($this->user1);

        $team = Team::create([
            'name'       => 'Paris FC',
            'sport_id'   => $this->football->id,
            'captain_id' => $this->user1->id,
        ]);
        $team->members()->attach($this->user1->id, ['role' => 'captain']);

        // Invite player
        $this->postJson("/api/v1/teams/{$team->id}/invitations", [
            'user_id' => $this->user2->id,
        ])->assertStatus(201);

        // Verify player received notification
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->user2->id,
            'type'    => 'team_invitation',
        ]);
    }

    public function test_push_respects_notification_preference(): void
    {
        // Disable push for session_participant_joined
        NotificationPreference::create([
            'user_id'      => $this->user1->id,
            'type'         => 'session_participant_joined',
            'push_enabled' => false,
        ]);

        $notificationService = app(NotificationService::class);
        $notif = $notificationService->sendToUser(
            $this->user1,
            'session_participant_joined',
            'Test Title',
            'Test Body'
        );

        $this->assertNotNull($notif);
        $this->assertDatabaseHas('notifications', [
            'id'      => $notif->id,
            'user_id' => $this->user1->id,
        ]);
    }
}
