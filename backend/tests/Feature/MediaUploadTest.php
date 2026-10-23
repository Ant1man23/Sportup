<?php

namespace Tests\Feature;

use App\Models\Sport;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MediaUploadTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_upload_avatar(): void
    {
        $disk = config('filesystems.default');
        Storage::fake($disk);

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $pngData = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
        $file = UploadedFile::fake()->createWithContent('avatar.png', $pngData);

        $response = $this->postJson('/api/v1/profile/avatar', [
            'avatar' => $file,
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'photo_path',
                'photo_url',
                'user',
            ]);

        $this->assertNotNull($user->fresh()->photo_path);
        Storage::disk($disk)->assertExists($user->fresh()->photo_path);
    }

    public function test_captain_can_upload_team_logo(): void
    {
        $disk = config('filesystems.default');
        Storage::fake($disk);

        $captain = User::factory()->create();
        $sport = Sport::firstOrCreate(
            ['slug' => 'football'],
            [
                'name' => 'Football',
                'icon' => 'football',
                'color_hex' => '#10B981',
                'is_active' => true,
            ]
        );

        $team = Team::create([
            'name' => 'Antananarivo FC ' . uniqid(),
            'sport_id' => $sport->id,
            'captain_id' => $captain->id,
        ]);

        Sanctum::actingAs($captain);

        $pngData = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
        $file = UploadedFile::fake()->createWithContent('logo.png', $pngData);

        $response = $this->postJson("/api/v1/teams/{$team->id}/logo", [
            'logo' => $file,
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'logo_path',
                'logo_url',
                'team',
            ]);

        $this->assertNotNull($team->fresh()->logo_path);
        Storage::disk($disk)->assertExists($team->fresh()->logo_path);
    }

    public function test_non_captain_cannot_upload_team_logo(): void
    {
        $disk = config('filesystems.default');
        Storage::fake($disk);

        $captain = User::factory()->create();
        $otherUser = User::factory()->create();
        $sport = Sport::firstOrCreate(
            ['slug' => 'basket'],
            [
                'name' => 'Basket',
                'icon' => 'basketball',
                'color_hex' => '#FF7A29',
                'is_active' => true,
            ]
        );

        $team = Team::create([
            'name' => 'Hoopers ' . uniqid(),
            'sport_id' => $sport->id,
            'captain_id' => $captain->id,
        ]);

        Sanctum::actingAs($otherUser);

        $file = UploadedFile::fake()->create('logo.png', 300, 300);

        $response = $this->postJson("/api/v1/teams/{$team->id}/logo", [
            'logo' => $file,
        ]);

        $response->assertStatus(403);
    }
}
