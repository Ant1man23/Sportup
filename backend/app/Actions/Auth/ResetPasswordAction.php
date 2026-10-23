<?php

namespace App\Actions\Auth;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ResetPasswordAction
{
    public function execute(array $data): array
    {
        $email = strtolower(trim($data['email']));
        $code = trim((string)($data['code'] ?? $data['token'] ?? ''));
        $newPassword = $data['password'];

        $record = DB::table('password_reset_tokens')->where('email', $email)->first();

        if (! $record) {
            throw ValidationException::withMessages([
                'code' => ['Aucune demande de réinitialisation trouvée pour cet email.'],
            ]);
        }

        // Vérifier l'expiration (valide 30 minutes)
        $createdAt = Carbon::parse($record->created_at);
        if ($createdAt->copy()->addMinutes(30)->isPast()) {
            DB::table('password_reset_tokens')->where('email', $email)->delete();
            throw ValidationException::withMessages([
                'code' => ['Ce code de réinitialisation a expiré. Veuillez en demander un nouveau.'],
            ]);
        }

        // Vérifier la correspondance du code
        if (trim($record->token) !== $code) {
            throw ValidationException::withMessages([
                'code' => ['Le code de réinitialisation à 6 chiffres est incorrect.'],
            ]);
        }

        $user = User::where('email', $email)->first();
        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['Utilisateur introuvable.'],
            ]);
        }

        // Mettre à jour le mot de passe
        $user->password = Hash::make($newPassword);
        $user->save();

        // Révoquer les tokens existants si besoin ou supprimer la ligne de reset
        DB::table('password_reset_tokens')->where('email', $email)->delete();

        return [
            'message' => 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
        ];
    }
}
