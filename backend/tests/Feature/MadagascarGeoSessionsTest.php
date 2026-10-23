<?php

namespace Tests\Feature;

use App\Models\Sport;
use App\Models\SportSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MadagascarGeoSessionsTest extends TestCase
{
    use RefreshDatabase;

    private User $organizer;
    private Sport $football;
    private Sport $basketball;

    protected function setUp(): void
    {
        parent::setUp();

        $this->organizer = User::factory()->create(['role' => 'organizer', 'city' => 'Antananarivo']);
        $this->football = Sport::firstOrCreate(['slug' => 'football-11'], ['name' => 'Football 11', 'icon' => '⚽', 'is_active' => true]);
        $this->basketball = Sport::firstOrCreate(['slug' => 'basketball-5x5'], ['name' => 'Basket 5x5', 'icon' => '🏀', 'is_active' => true]);

        // 1. Session à Antananarivo
        SportSession::create([
            'organizer_id' => $this->organizer->id,
            'sport_id' => $this->football->id,
            'type' => 'free_match',
            'competition_type' => 'friendly',
            'participation_mode' => 'open',
            'spectator_access' => 'free',
            'format' => '11v11',
            'session_date' => now()->addDays(2)->toDateString(),
            'start_time' => '15:00:00',
            'latitude' => -18.9189,
            'longitude' => 47.5256,
            'address' => 'Stade Municipal de Mahamasina',
            'city' => 'Antananarivo',
            'region' => 'Analamanga',
            'max_participants' => 22,
            'current_participants' => 10,
            'status' => 'open',
        ]);

        // 2. Session à Toamasina (Côte Est de Madagascar, ~220 km de Tana)
        SportSession::create([
            'organizer_id' => $this->organizer->id,
            'sport_id' => $this->football->id,
            'type' => 'find_opponent',
            'competition_type' => 'friendly',
            'participation_mode' => 'open',
            'spectator_access' => 'free',
            'format' => '11v11',
            'session_date' => now()->addDays(3)->toDateString(),
            'start_time' => '16:00:00',
            'latitude' => -18.1492,
            'longitude' => 49.4023,
            'address' => 'Stade Municipal de Toamasina',
            'city' => 'Toamasina',
            'region' => 'Atsinanana',
            'max_participants' => 22,
            'current_participants' => 18,
            'status' => 'open',
        ]);

        // 3. Session à Fianarantsoa (Sud des Hautes Terres, ~290 km de Tana)
        SportSession::create([
            'organizer_id' => $this->organizer->id,
            'sport_id' => $this->basketball->id,
            'type' => 'free_match',
            'competition_type' => 'school_university',
            'participation_mode' => 'open',
            'spectator_access' => 'free',
            'format' => '5v5',
            'session_date' => now()->addDays(4)->toDateString(),
            'start_time' => '14:30:00',
            'latitude' => -21.4506,
            'longitude' => 47.0826,
            'address' => "Gymnase d'Ambatomena",
            'city' => 'Fianarantsoa',
            'region' => 'Haute Matsiatra',
            'max_participants' => 10,
            'current_participants' => 4,
            'status' => 'open',
        ]);
    }

    /**
     * Test 1: Recherche par coordonnées et nom de Toamasina
     */
    public function test_can_search_sessions_in_toamasina(): void
    {
        $response = $this->actingAs($this->organizer, 'sanctum')
            ->getJson('/api/v1/sessions?city=Toamasina&lat=-18.1492&lng=49.4023&radius=35');

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertCount(1, $data);
        $this->assertEquals('Toamasina', $data[0]['city']);
        $this->assertEquals(-18.1492, $data[0]['latitude']);
        $this->assertEquals(49.4023, $data[0]['longitude']);
        $this->assertEquals('Stade Municipal de Toamasina', $data[0]['address']);
    }

    /**
     * Test 2: Recherche par coordonnées et nom de Fianarantsoa
     */
    public function test_can_search_sessions_in_fianarantsoa(): void
    {
        $response = $this->actingAs($this->organizer, 'sanctum')
            ->getJson('/api/v1/sessions?city=Fianarantsoa&lat=-21.4506&lng=47.0826&radius=35');

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertGreaterThanOrEqual(1, count($data));
        $cities = array_column($data, 'city');
        foreach ($cities as $c) {
            $this->assertEquals('Fianarantsoa', $c);
        }
    }

    /**
     * Test 3: Recherche sur Mahajanga (ville sans session)
     */
    public function test_search_in_city_without_sessions_returns_empty_without_error(): void
    {
        $response = $this->actingAs($this->organizer, 'sanctum')
            ->getJson('/api/v1/sessions?city=Mahajanga&lat=-15.7167&lng=46.3167&radius=35');

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertCount(0, $data, 'Mahajanga ne doit pas retourner de sessions fictives');
    }

    /**
     * Test 4: Recherche nationale sans filtre de ville retourne toutes les sessions de l\'île
     */
    public function test_search_all_madagascar_returns_all_sessions(): void
    {
        $response = $this->actingAs($this->organizer, 'sanctum')
            ->getJson('/api/v1/sessions?all=1');

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertGreaterThanOrEqual(3, count($data), 'Doit retourner toutes les sessions réparties sur Madagascar');
    }

    /**
     * Test 5: Création d\'une session dans une province avec enregistrement MySQL des coordonnées GPS
     */
    public function test_organizer_can_create_session_in_another_city_with_coordinates(): void
    {
        $response = $this->actingAs($this->organizer, 'sanctum')
            ->postJson('/api/v1/sessions', [
                'sport_id' => $this->football->id,
                'type' => 'free_match',
                'competition_type' => 'tournament',
                'participation_mode' => 'open',
                'spectator_access' => 'free',
                'format' => '7v7',
                'session_date' => now()->addDays(7)->toDateString(),
                'start_time' => '17:00:00',
                'city' => 'Mahajanga',
                'address' => 'Stade Rabemananjara, Boulevard Poincaré',
                'latitude' => -15.7212,
                'longitude' => 46.3195,
                'max_participants' => 14,
                'description' => 'Tournoi de beach soccer & 7v7 à Majunga',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('city', 'Mahajanga')
            ->assertJsonPath('region', 'Boeny')
            ->assertJsonPath('latitude', -15.7212)
            ->assertJsonPath('longitude', 46.3195);

        // Vérification de la persistance en base de données
        $this->assertDatabaseHas('sport_sessions', [
            'city' => 'Mahajanga',
            'region' => 'Boeny',
            'latitude' => -15.7212,
            'longitude' => 46.3195,
            'address' => 'Stade Rabemananjara, Boulevard Poincaré',
        ]);
    }
}
