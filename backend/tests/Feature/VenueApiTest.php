<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Venue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VenueApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_venues_listing(): void
    {
        Venue::create([
            'name'           => 'Terrain Synthétique Galaxy',
            'slug'           => 'terrain-synthetique-galaxy',
            'district'       => 'Ankorondrano',
            'city'           => 'Antananarivo',
            'address'        => 'Près Galaxy Plaza',
            'sports'         => ['football', 'football5'],
            'surface_type'   => 'gazon_synthetique',
            'price_per_hour' => 45000,
            'is_active'      => true,
            'is_verified'    => true,
        ]);

        $response = $this->getJson('/api/v1/venues');

        $response->assertStatus(200)
            ->assertJsonStructure(['data', 'count'])
            ->assertJsonFragment(['name' => 'Terrain Synthétique Galaxy']);
    }

    public function test_authenticated_user_can_submit_venue_for_madagascar(): void
    {
        $user = User::factory()->create();

        $payload = [
            'name'               => 'Gymnase Couvert Mahamasina',
            'district'           => 'Mahamasina',
            'city'               => 'Antananarivo',
            'address'            => 'Face stade Barea',
            'sports'             => ['basketball', 'volleyball'],
            'surface_type'       => 'parquet',
            'capacity'           => 1200,
            'has_lighting'       => true,
            'has_changing_rooms' => true,
            'has_parking'        => true,
            'is_indoor'          => true,
            'price_per_hour'     => 60000,
            'phone_primary'      => '0340000001',
            'whatsapp_number'    => '+261340000001',
            'booking_notes'      => 'Réservation 48h à l\'avance',
        ];

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/venues', $payload);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Gymnase Couvert Mahamasina'])
            ->assertJsonPath('data.is_verified', false)
            ->assertJsonPath('data.submitted_by', $user->id);

        $this->assertDatabaseHas('venues', [
            'name'         => 'Gymnase Couvert Mahamasina',
            'city'         => 'Antananarivo',
            'submitted_by' => $user->id,
            'is_verified'  => false,
        ]);
    }

    public function test_unauthenticated_user_cannot_submit_venue(): void
    {
        $payload = [
            'name'     => 'Terrain Non Autorisé',
            'district' => 'Analakely',
            'city'     => 'Antananarivo',
            'address'  => 'Avenue de l\'Indépendance',
        ];

        $response = $this->postJson('/api/v1/venues', $payload);

        $response->assertStatus(401);
    }

    public function test_user_can_update_own_submitted_venue(): void
    {
        $user = User::factory()->create();

        $venue = Venue::create([
            'name'           => 'Terrain Initial',
            'slug'           => 'terrain-initial',
            'district'       => 'Itasy',
            'city'           => 'Miarinarivo',
            'address'        => 'Centre ville',
            'sports'         => ['football'],
            'submitted_by'   => $user->id,
            'is_active'      => true,
            'is_verified'    => false,
            'price_per_hour' => 30000,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->putJson("/api/v1/venues/{$venue->id}", [
                'name'           => 'Terrain Modifié & Amélioré',
                'price_per_hour' => 35000,
                'has_lighting'   => true,
            ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'Terrain Modifié & Amélioré'])
            ->assertJsonPath('data.price_per_hour', 35000)
            ->assertJsonPath('data.has_lighting', true);

        $this->assertDatabaseHas('venues', [
            'id'             => $venue->id,
            'name'           => 'Terrain Modifié & Amélioré',
            'price_per_hour' => 35000,
        ]);
    }

    public function test_user_cannot_update_another_users_venue(): void
    {
        $creator = User::factory()->create();
        $otherUser = User::factory()->create();

        $venue = Venue::create([
            'name'         => 'Terrain du Créateur',
            'slug'         => 'terrain-du-createur',
            'district'     => 'Ambohimanarina',
            'city'         => 'Antananarivo',
            'address'      => 'Près du marché',
            'submitted_by' => $creator->id,
            'is_active'    => true,
        ]);

        $response = $this->actingAs($otherUser, 'sanctum')
            ->putJson("/api/v1/venues/{$venue->id}", [
                'name' => 'Tentative de piratage du nom',
            ]);

        $response->assertStatus(403);
    }

    public function test_admin_can_update_any_venue(): void
    {
        $creator = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);

        $venue = Venue::create([
            'name'         => 'Terrain Soumis par Utilisateur',
            'slug'         => 'terrain-soumis-par-utilisateur',
            'district'     => 'Tamatave Port',
            'city'         => 'Toamasina',
            'address'      => 'Bord de la mer',
            'submitted_by' => $creator->id,
            'is_active'    => true,
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->putJson("/api/v1/venues/{$venue->id}", [
                'name' => 'Nom validé par Admin',
            ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'Nom validé par Admin']);
    }
}
