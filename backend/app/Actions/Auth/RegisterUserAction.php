<?php

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Validation\ValidationException;

class RegisterUserAction
{
    public function execute(array $data): array
    {
        // La validation (unique:users) est déjà faite dans le controller.
        // On gère ici uniquement la race condition (deux inscriptions simultanées).
        try {
            $user = User::create([
                'username' => $data['username'],
                'email' => $data['email'],
                'password' => $data['password'], // auto-hashé via cast 'hashed'
                'city' => $data['city'] ?? 'Antananarivo',
                'level' => $data['level'] ?? 'intermediate',
            ]);
        } catch (UniqueConstraintViolationException $e) {
            // Détermine quelle colonne est en doublon
            $message = str_contains($e->getMessage(), 'username')
                ? ['username' => ['Ce nom d\'utilisateur est déjà pris.']]
                : ['email' => ['L\'adresse email est déjà utilisée.']];

            throw ValidationException::withMessages($message);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return [
            'token' => $token,
            'user' => $user,
        ];
    }
}
