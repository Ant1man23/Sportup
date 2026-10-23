<?php

namespace App\Services;

use App\Models\Device;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FcmService
{
    /**
     * Send push notification to multiple FCM tokens.
     */
    public function sendToTokens(array $tokens, string $title, string $body, array $data = []): array
    {
        if (empty($tokens)) {
            return ['success' => 0, 'failure' => 0];
        }

        $serverKey = config('services.firebase.server_key', env('FCM_SERVER_KEY'));
        $credentialsPath = config('services.firebase.credentials_path', env('FIREBASE_CREDENTIALS'));
        if ($credentialsPath && !file_exists($credentialsPath) && file_exists(base_path($credentialsPath))) {
            $credentialsPath = base_path($credentialsPath);
        }

        // If credentials file is provided, check if it exists
        if (!$serverKey && $credentialsPath && file_exists($credentialsPath)) {
            return $this->sendViaServiceAccount($credentialsPath, $tokens, $title, $body, $data);
        }

        if ($serverKey) {
            return $this->sendViaServerKey($serverKey, $tokens, $title, $body, $data);
        }

        // Graceful log when Firebase is not configured yet
        Log::info("FCM dispatch simulated (no server key / google-services.json configured):", [
            'tokens_count' => count($tokens),
            'title'        => $title,
            'body'         => $body,
            'data'         => $data,
        ]);

        return ['success' => count($tokens), 'failure' => 0, 'simulated' => true];
    }

    /**
     * Send via FCM Legacy / Server Key HTTP API.
     */
    protected function sendViaServerKey(string $serverKey, array $tokens, string $title, string $body, array $data): array
    {
        $success = 0;
        $failure = 0;

        foreach (array_chunk($tokens, 500) as $chunk) {
            try {
                $response = Http::withHeaders([
                    'Authorization' => 'key=' . $serverKey,
                    'Content-Type'  => 'application/json',
                ])->post('https://fcm.googleapis.com/fcm/send', [
                    'registration_ids' => $chunk,
                    'notification'     => [
                        'title' => $title,
                        'body'  => $body,
                        'sound' => 'default',
                    ],
                    'data'             => array_map('strval', $data),
                    'priority'         => 'high',
                ]);

                if ($response->successful()) {
                    $json = $response->json();
                    $success += $json['success'] ?? 0;
                    $failure += $json['failure'] ?? 0;

                    // Clean up invalid / unregistered tokens
                    if (!empty($json['results'])) {
                        foreach ($json['results'] as $index => $result) {
                            if (isset($result['error']) && in_array($result['error'], ['NotRegistered', 'InvalidRegistration'])) {
                                if (isset($chunk[$index])) {
                                    Device::where('fcm_token', $chunk[$index])->delete();
                                }
                            }
                        }
                    }
                } else {
                    $failure += count($chunk);
                    Log::error('FCM HTTP error', ['status' => $response->status(), 'response' => $response->body()]);
                }
            } catch (\Throwable $e) {
                $failure += count($chunk);
                Log::error('FCM dispatch exception: ' . $e->getMessage());
            }
        }

        return ['success' => $success, 'failure' => $failure];
    }

    /**
     * Send via Google Service Account (HTTP v1).
     */
    protected function sendViaServiceAccount(string $credentialsPath, array $tokens, string $title, string $body, array $data): array
    {
        $json = json_decode(file_get_contents($credentialsPath), true);
        $projectId = $json['project_id'] ?? null;

        if (!$projectId) {
            Log::warning('FCM: Invalid service account file (missing project_id).');
            return ['success' => 0, 'failure' => count($tokens)];
        }

        $accessToken = $this->getOAuth2Token($json);
        if (!$accessToken) {
            return ['success' => 0, 'failure' => count($tokens)];
        }

        $success = 0;
        $failure = 0;

        $isLocal = app()->environment('local');

        foreach ($tokens as $token) {
            try {
                $req = $isLocal ? Http::withoutVerifying() : Http::newPendingRequest();
                $response = $req->withToken($accessToken)
                    ->post("https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send", [
                        'message' => [
                            'token'        => $token,
                            'notification' => [
                                'title' => $title,
                                'body'  => $body,
                            ],
                            'data'         => array_map('strval', $data),
                        ],
                    ]);

                if ($response->successful()) {
                    $success++;
                } else {
                    $failure++;
                    $res = $response->json();
                    if (isset($res['error']['details'][0]['errorCode']) && $res['error']['details'][0]['errorCode'] === 'UNREGISTERED') {
                        Device::where('fcm_token', $token)->delete();
                    }
                }
            } catch (\Throwable $e) {
                $failure++;
                Log::error('FCM v1 send exception: ' . $e->getMessage());
            }
        }

        return ['success' => $success, 'failure' => $failure];
    }

    /**
     * Helper to encode base64url without padding.
     */
    protected function base64UrlEncode(string $data): string
    {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
    }

    /**
     * Generate Google OAuth2 Token from Service Account.
     */
    protected function getOAuth2Token(array $json): ?string
    {
        try {
            $now = time();
            $header = $this->base64UrlEncode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
            $claim = $this->base64UrlEncode(json_encode([
                'iss'   => $json['client_email'],
                'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
                'aud'   => 'https://oauth2.googleapis.com/token',
                'exp'   => $now + 3600,
                'iat'   => $now,
            ]));

            $key = openssl_pkey_get_private($json['private_key']);
            if (!$key) {
                return null;
            }

            openssl_sign("$header.$claim", $signature, $key, 'sha256WithRSAEncryption');
            $jwt = "$header.$claim." . $this->base64UrlEncode($signature);

            $req = app()->environment('local') ? Http::withoutVerifying() : Http::asForm();
            $response = $req->asForm()->post('https://oauth2.googleapis.com/token', [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion'  => $jwt,
            ]);

            return $response->json('access_token');
        } catch (\Throwable $e) {
            Log::error('Failed to obtain Google OAuth2 token: ' . $e->getMessage());
            return null;
        }
    }
}
