<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register(): void
    {
        $unique = uniqid();
        $response = $this->postJson('/api/v1/auth/register', [
            'username' => "alex_{$unique}",
            'email' => "alex_{$unique}@example.com",
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'level' => 'intermediate',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'token',
                'user' => ['id', 'username', 'email'],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => "alex_{$unique}@example.com",
            'username' => "alex_{$unique}",
        ]);
    }

    public function test_user_can_login(): void
    {
        $unique = uniqid();
        $email = "user_{$unique}@example.com";
        $user = User::factory()->create([
            'email' => $email,
            'password' => bcrypt('Secret123!'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $email,
            'password' => 'Secret123!',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'token',
                'user' => ['id', 'email'],
            ]);
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'wrong_' . uniqid() . '@example.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_forgot_password_generates_code_and_stores_in_database(): void
    {
        $email = 'joueur_' . uniqid() . '@sportup.com';
        $user = User::factory()->create([
            'email' => $email,
        ]);

        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => $email,
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['message']);

        $this->assertDatabaseHas('password_reset_tokens', [
            'email' => $email,
        ]);
    }

    public function test_forgot_password_fails_if_email_does_not_exist(): void
    {
        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'inexistant_' . uniqid() . '@sportup.com',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_reset_password_updates_user_password(): void
    {
        $email = 'joueur_' . uniqid() . '@sportup.com';
        $user = User::factory()->create([
            'email' => $email,
            'password' => bcrypt('AncienMdp123!'),
        ]);

        // Génération du code
        $this->postJson('/api/v1/auth/forgot-password', [
            'email' => $email,
        ]);

        $code = \Illuminate\Support\Facades\DB::table('password_reset_tokens')
            ->where('email', $email)
            ->value('token');

        $this->assertNotNull($code);

        // Réinitialisation avec le code
        $resetResponse = $this->postJson('/api/v1/auth/reset-password', [
            'email' => $email,
            'code' => $code,
            'password' => 'NouveauMdp123!',
            'password_confirmation' => 'NouveauMdp123!',
        ]);

        $resetResponse->assertStatus(200)
            ->assertJsonStructure(['message']);

        // Vérification de la suppression du token utilisé
        $this->assertDatabaseMissing('password_reset_tokens', [
            'email' => $email,
        ]);

        // Connexion avec le nouveau mot de passe
        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => $email,
            'password' => 'NouveauMdp123!',
        ]);

        $loginResponse->assertStatus(200)
            ->assertJsonStructure(['token']);
    }

    public function test_reset_password_fails_with_invalid_code(): void
    {
        $email = 'joueur_' . uniqid() . '@sportup.com';
        User::factory()->create([
            'email' => $email,
        ]);

        $this->postJson('/api/v1/auth/forgot-password', [
            'email' => $email,
        ]);

        $response = $this->postJson('/api/v1/auth/reset-password', [
            'email' => $email,
            'code' => '000000',
            'password' => 'NouveauMdp123!',
            'password_confirmation' => 'NouveauMdp123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['code']);
    }
}

