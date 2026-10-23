<?php

namespace App\Actions\Auth;

use App\Mail\ResetPasswordCodeMail;
use App\Models\User;
use App\Services\SmsService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class ForgotPasswordAction
{
    public function execute(array $data): array
    {
        $input = trim($data['email']);
        $isEmail = filter_var($input, FILTER_VALIDATE_EMAIL);

        if ($isEmail) {
            $email = strtolower($input);
            $user = User::where('email', $email)->first();
        } else {
            // Check by phone number or username
            $user = User::where('username', $input)->first();
            $email = $user?->email;
        }

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['Aucun compte n\'est associé à ces identifiants.'],
            ]);
        }

        // Génération d'un code de sécurité à 6 chiffres
        $code = sprintf('%06d', random_int(100000, 999999));

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $email],
            [
                'token'      => $code,
                'created_at' => now(),
            ]
        );

        // 1. Dispatch real email via queueable Mailable
        try {
            Mail::to($email)->queue(new ResetPasswordCodeMail($code, $user->username));
        } catch (\Throwable $e) {
            // Fallback gracefully without breaking if mailer is misconfigured
            logger()->warning('Failed to queue ResetPasswordCodeMail: ' . $e->getMessage());
        }

        // 2. Dispatch SMS if phone was provided
        if (!empty($data['phone'])) {
            try {
                app(SmsService::class)->send(
                    $data['phone'],
                    "SportUp: Votre code de réinitialisation est {$code}. Valide pendant 15 min."
                );
            } catch (\Throwable $e) {
                logger()->warning('Failed to send Reset Password SMS: ' . $e->getMessage());
            }
        }

        $response = [
            'message' => 'Un code de réinitialisation à 6 chiffres vous a été envoyé par email ou SMS.',
        ];

        // En environnement local ou de test, on expose le code pour faciliter les tests
        if (config('app.debug') || app()->environment('local', 'testing')) {
            $response['debug_code'] = $code;
        }

        return $response;
    }
}
