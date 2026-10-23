<?php

namespace Tests\Feature;

use App\Events\MatchLiveUpdated;
use App\Models\MatchEvent;
use App\Models\MatchPlayer;
use App\Models\Sport;
use App\Models\SportMatch;
use App\Models\SportSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LiveScoreboardAndStatisticsTest extends TestCase
{
    use RefreshDatabase;

    private User $organizer;
    private User $playerA1;
    private User $playerA2;
    private User $playerB1;
    private User $playerB2;
    private User $spectator;
    private Sport $basketball;
    private SportSession $session;
    private SportMatch $match;

    protected function setUp(): void
    {
        parent::setUp();

        Event::fake([MatchLiveUpdated::class]);

        $this->basketball = Sport::firstOrCreate(['slug' => 'basketball'], [
            'name' => 'Basketball',
            'icon' => 'basketball',
            'color_hex' => '#F97316',
            'is_active' => true,
        ]);

        $this->organizer = User::factory()->create();
        $this->playerA1 = User::factory()->create();
        $this->playerA2 = User::factory()->create();
        $this->playerB1 = User::factory()->create();
        $this->playerB2 = User::factory()->create();
        $this->spectator = User::factory()->create();

        $this->session = SportSession::create([
            'organizer_id' => $this->organizer->id,
            'sport_id' => $this->basketball->id,
            'type' => 'free_match',
            'format' => '5v5',
            'session_date' => now()->toDateString(),
            'start_time' => '18:00',
            'latitude' => -18.8792,
            'longitude' => 47.5079,
            'max_participants' => 10,
            'current_participants' => 5,
            'status' => 'in_progress',
        ]);

        $this->session->participants()->attach([
            $this->organizer->id,
            $this->playerA1->id,
            $this->playerA2->id,
            $this->playerB1->id,
            $this->playerB2->id,
        ]);

        $this->match = SportMatch::create([
            'session_id' => $this->session->id,
            'status' => 'in_progress',
            'score_team_a' => 0,
            'score_team_b' => 0,
            'current_period' => 1,
            'total_periods' => 4,
            'period_duration_seconds' => 600,
            'elapsed_seconds' => 0,
            'period_elapsed_seconds' => 0,
            'started_at' => now(),
            'period_started_at' => now(),
            'last_resumed_at' => now(),
        ]);

        // Seed match players
        MatchPlayer::create([
            'match_id' => $this->match->id,
            'user_id' => $this->playerA1->id,
            'team_side' => 'team_a',
            'jersey_number' => 23,
            'position' => 'Ailier',
            'is_on_court' => true,
        ]);
        MatchPlayer::create([
            'match_id' => $this->match->id,
            'user_id' => $this->playerA2->id,
            'team_side' => 'team_a',
            'jersey_number' => 30,
            'position' => 'Meneur',
            'is_on_court' => true,
        ]);
        MatchPlayer::create([
            'match_id' => $this->match->id,
            'user_id' => $this->playerB1->id,
            'team_side' => 'team_b',
            'jersey_number' => 34,
            'position' => 'Ailier fort',
            'is_on_court' => true,
        ]);
        MatchPlayer::create([
            'match_id' => $this->match->id,
            'user_id' => $this->playerB2->id,
            'team_side' => 'team_b',
            'jersey_number' => 77,
            'position' => 'Arrière',
            'is_on_court' => true,
        ]);
    }

    /**
     * 1. Test scoring 1, 2, and 3 points baskets and score consistency
     */
    public function test_scoring_baskets_and_score_consistency(): void
    {
        Sanctum::actingAs($this->organizer);

        // Add 2PT basket for Team A by player A1
        $res1 = $this->postJson("/api/v1/matches/{$this->match->id}/events", [
            'type' => 'basket',
            'team_side' => 'team_a',
            'player_id' => $this->playerA1->id,
            'points' => 2,
            'minute' => 2,
        ]);
        $res1->assertStatus(201);

        // Add 3PT basket for Team A by player A2 with assist from A1
        $res2 = $this->postJson("/api/v1/matches/{$this->match->id}/events", [
            'type' => 'basket',
            'team_side' => 'team_a',
            'player_id' => $this->playerA2->id,
            'related_player_id' => $this->playerA1->id,
            'points' => 3,
            'minute' => 3,
        ]);
        $res2->assertStatus(201);

        // Add 1PT Free throw for Team B by player B1
        $res3 = $this->postJson("/api/v1/matches/{$this->match->id}/events", [
            'type' => 'free_throw',
            'team_side' => 'team_b',
            'player_id' => $this->playerB1->id,
            'shot_result' => 'made',
            'minute' => 4,
        ]);
        $res3->assertStatus(201);

        $this->match->refresh();
        $this->assertEquals(5, $this->match->score_team_a); // 2 + 3 = 5
        $this->assertEquals(1, $this->match->score_team_b); // 1

        Event::assertDispatched(MatchLiveUpdated::class);
    }

    /**
     * 2. Test percentage calculations and collective/individual stats
     */
    public function test_statistics_percentages_and_breakdown(): void
    {
        Sanctum::actingAs($this->organizer);

        // Team A: 2 made out of 3 two-pointers, 1 made out of 2 three-pointers, 2 made out of 2 FT
        // 2PT made
        $this->postJson("/api/v1/matches/{$this->match->id}/events", [
            'type' => 'basket', 'team_side' => 'team_a', 'player_id' => $this->playerA1->id, 'points' => 2,
        ]);
        $this->postJson("/api/v1/matches/{$this->match->id}/events", [
            'type' => 'basket', 'team_side' => 'team_a', 'player_id' => $this->playerA1->id, 'points' => 2,
        ]);
        // 2PT missed
        $this->postJson("/api/v1/matches/{$this->match->id}/events", [
            'type' => 'missed_shot', 'team_side' => 'team_a', 'player_id' => $this->playerA1->id, 'shot_type' => '2pt',
        ]);
        // 3PT made
        $this->postJson("/api/v1/matches/{$this->match->id}/events", [
            'type' => 'basket', 'team_side' => 'team_a', 'player_id' => $this->playerA2->id, 'points' => 3,
        ]);
        // 3PT missed
        $this->postJson("/api/v1/matches/{$this->match->id}/events", [
            'type' => 'missed_shot', 'team_side' => 'team_a', 'player_id' => $this->playerA2->id, 'shot_type' => '3pt',
        ]);
        // Rebound off & def
        $this->postJson("/api/v1/matches/{$this->match->id}/events", [
            'type' => 'rebound', 'team_side' => 'team_a', 'player_id' => $this->playerA1->id, 'rebound_type' => 'offensive',
        ]);
        $this->postJson("/api/v1/matches/{$this->match->id}/events", [
            'type' => 'rebound', 'team_side' => 'team_a', 'player_id' => $this->playerA2->id, 'rebound_type' => 'defensive',
        ]);

        // Query /statistics
        $statsResp = $this->getJson("/api/v1/matches/{$this->match->id}/statistics");
        $statsResp->assertStatus(200);

        $data = $statsResp->json();
        $teamAStats = $data['collective']['team_a'];

        $this->assertEquals(7, $teamAStats['points']); // 2+2+3 = 7
        $this->assertEquals(2, $teamAStats['two_pt_made']);
        $this->assertEquals(3, $teamAStats['two_pt_attempted']);
        $this->assertEquals(66.7, $teamAStats['two_pt_pct']); // 2/3 = 66.7%

        $this->assertEquals(1, $teamAStats['three_pt_made']);
        $this->assertEquals(2, $teamAStats['three_pt_attempted']);
        $this->assertEquals(50.0, $teamAStats['three_pt_pct']); // 1/2 = 50.0%

        $this->assertEquals(3, $teamAStats['fg_made']); // 2+1 = 3
        $this->assertEquals(5, $teamAStats['fg_attempted']); // 3+2 = 5
        $this->assertEquals(60.0, $teamAStats['fg_pct']); // 3/5 = 60.0%

        $this->assertEquals(1, $teamAStats['rebounds_offensive']);
        $this->assertEquals(1, $teamAStats['rebounds_defensive']);
        $this->assertEquals(2, $teamAStats['rebounds_total']);

        // Team B with 0 attempts should show 0.0% without error or division by zero
        $teamBStats = $data['collective']['team_b'];
        $this->assertEquals(0, $teamBStats['fg_attempted']);
        $this->assertEquals(0.0, $teamBStats['fg_pct']);

        // Individual player stats check
        $playerA1Stat = collect($data['players']['team_a'])->firstWhere('user_id', $this->playerA1->id);
        $this->assertNotNull($playerA1Stat);
        $this->assertEquals(4, $playerA1Stat['points']);
        $this->assertEquals(1, $playerA1Stat['rebounds_offensive']);
    }

    /**
     * 3. Test quarter changes and clock pause / resume
     */
    public function test_period_progression_and_timer_pause_resume(): void
    {
        Sanctum::actingAs($this->organizer);

        // Pause match
        $pauseResp = $this->postJson("/api/v1/matches/{$this->match->id}/pause");
        $pauseResp->assertStatus(200);
        $this->match->refresh();
        $this->assertEquals('paused', $this->match->status);

        // Resume match
        $resumeResp = $this->postJson("/api/v1/matches/{$this->match->id}/resume");
        $resumeResp->assertStatus(200);
        $this->match->refresh();
        $this->assertEquals('in_progress', $this->match->status);
        $this->assertNotNull($this->match->last_resumed_at);

        // Advance period: Q1 -> Q2
        $nextResp = $this->postJson("/api/v1/matches/{$this->match->id}/next-period");
        $nextResp->assertStatus(200);
        $this->match->refresh();
        $this->assertEquals(2, $this->match->current_period);
        $this->assertEquals(0, $this->match->period_elapsed_seconds);
        $this->assertEquals(0, $this->match->team_a_fouls);
    }

    /**
     * 4. Test event cancellation / undo and consistency
     */
    public function test_event_cancellation_and_score_recalculation(): void
    {
        Sanctum::actingAs($this->organizer);

        // Add 3PT basket
        $resp = $this->postJson("/api/v1/matches/{$this->match->id}/events", [
            'type' => 'basket', 'team_side' => 'team_a', 'player_id' => $this->playerA1->id, 'points' => 3,
        ]);
        $eventId = $resp->json('id');
        $this->match->refresh();
        $this->assertEquals(3, $this->match->score_team_a);

        // Cancel the event
        $cancelResp = $this->deleteJson("/api/v1/matches/{$this->match->id}/events/{$eventId}");
        $cancelResp->assertStatus(200);

        $this->match->refresh();
        $this->assertEquals(0, $this->match->score_team_a);

        $event = MatchEvent::find($eventId);
        $this->assertTrue($event->is_cancelled);
    }

    /**
     * 5. Test idempotency key prevents duplicate events on repeated clicks
     */
    public function test_idempotency_prevents_duplicate_increments(): void
    {
        Sanctum::actingAs($this->organizer);
        $key = 'client_uuid_abc_123';

        // First click
        $resp1 = $this->postJson("/api/v1/matches/{$this->match->id}/events", [
            'type' => 'basket',
            'team_side' => 'team_a',
            'points' => 2,
            'idempotency_key' => $key,
        ]);
        $resp1->assertStatus(201);
        $eventId1 = $resp1->json('id');

        // Repeated click with same idempotency key (e.g. latency / retry)
        $resp2 = $this->postJson("/api/v1/matches/{$this->match->id}/events", [
            'type' => 'basket',
            'team_side' => 'team_a',
            'points' => 2,
            'idempotency_key' => $key,
        ]);
        $resp2->assertStatus(201);
        $eventId2 = $resp2->json('id');

        $this->assertEquals($eventId1, $eventId2);
        $this->match->refresh();
        $this->assertEquals(2, $this->match->score_team_a); // NOT 4!
    }

    /**
     * 6. Test unauthorized spectator cannot modify match
     */
    public function test_spectator_cannot_modify_match(): void
    {
        Sanctum::actingAs($this->spectator);

        // Spectator attempts to score
        $resp = $this->postJson("/api/v1/matches/{$this->match->id}/events", [
            'type' => 'basket',
            'team_side' => 'team_a',
            'points' => 2,
        ]);
        $resp->assertStatus(403);

        // Spectator attempts to pause
        $this->postJson("/api/v1/matches/{$this->match->id}/pause")->assertStatus(403);

        // Spectator attempts to finish
        $this->postJson("/api/v1/matches/{$this->match->id}/finish")->assertStatus(403);

        // But spectator CAN consult live state
        $liveResp = $this->getJson("/api/v1/matches/{$this->match->id}/live");
        $liveResp->assertStatus(200)
            ->assertJsonPath('match_id', $this->match->id);
    }
}
