<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsService
{
    /**
     * Send an SMS message to a phone number.
     *
     * @param string $phone Malagasy (+261...) or international number
     * @param string $message Text content
     * @return array Status result ['success' => bool, 'driver' => string, 'message' => string]
     */
    public function send(string $phone, string $message): array
    {
        $normalized = $this->normalizePhone($phone);
        $driver = config('services.sms.driver', env('SMS_DRIVER', 'log'));

        return match ($driver) {
            'orange_mg' => $this->sendViaOrangeMadagascar($normalized, $message),
            'twilio'    => $this->sendViaTwilio($normalized, $message),
            default     => $this->sendViaLog($normalized, $message),
        };
    }

    /**
     * Normalize local Madagascar numbers (034, 032, 033, 038, 037) to +261...
     */
    public function normalizePhone(string $phone): string
    {
        $cleaned = preg_replace('/[^\d+]/', '', trim($phone));
        if (str_starts_with($cleaned, '03')) {
            return '+261' . substr($cleaned, 1);
        }
        if (str_starts_with($cleaned, '261')) {
            return '+' . $cleaned;
        }
        return $cleaned;
    }

    protected function sendViaLog(string $phone, string $message): array
    {
        Log::info("SMS (Driver: Log) sent to {$phone}: {$message}");

        return [
            'success' => true,
            'driver'  => 'log',
            'phone'   => $phone,
            'message' => 'SMS consigné dans les logs.',
        ];
    }

    protected function sendViaOrangeMadagascar(string $phone, string $message): array
    {
        $clientId = config('services.orange.client_id', env('ORANGE_SMS_CLIENT_ID'));
        $clientSecret = config('services.orange.client_secret', env('ORANGE_SMS_CLIENT_SECRET'));
        $senderNumber = config('services.orange.sender', env('ORANGE_SMS_SENDER', 'SportUp'));

        if (!$clientId || !$clientSecret) {
            Log::warning("Orange Madagascar SMS credentials missing. Fallback to log.");
            return $this->sendViaLog($phone, $message);
        }

        try {
            // 1. Get OAuth token
            $authRes = Http::asForm()
                ->withHeaders(['Authorization' => 'Basic ' . base64_encode("{$clientId}:{$clientSecret}")])
                ->post('https://api.orange.com/oauth/v3/token', [
                    'grant_type' => 'client_credentials',
                ]);

            if (!$authRes->successful()) {
                throw new \RuntimeException('Orange OAuth failed: ' . $authRes->body());
            }

            $token = $authRes->json('access_token');

            // 2. Send SMS
            $smsRes = Http::withToken($token)->post('https://api.orange.com/smsmessaging/v1/outbound/tel:+261/requests', [
                'outboundSMSMessageRequest' => [
                    'address' => 'tel:' . $phone,
                    'senderAddress' => 'tel:+' . preg_replace('/[^\d]/', '', $senderNumber),
                    'outboundSMSTextMessage' => [
                        'message' => $message,
                    ],
                ],
            ]);

            return [
                'success' => $smsRes->successful(),
                'driver'  => 'orange_mg',
                'phone'   => $phone,
                'message' => $smsRes->successful() ? 'SMS envoyé via Orange Madagascar.' : 'Échec envoi Orange SMS.',
            ];
        } catch (\Throwable $e) {
            Log::error("Orange SMS error: {$e->getMessage()}");
            return [
                'success' => false,
                'driver'  => 'orange_mg',
                'phone'   => $phone,
                'message' => $e->getMessage(),
            ];
        }
    }

    protected function sendViaTwilio(string $phone, string $message): array
    {
        $sid = config('services.twilio.sid', env('TWILIO_SID'));
        $token = config('services.twilio.token', env('TWILIO_TOKEN'));
        $from = config('services.twilio.from', env('TWILIO_FROM'));

        if (!$sid || !$token || !$from) {
            Log::warning("Twilio credentials missing. Fallback to log.");
            return $this->sendViaLog($phone, $message);
        }

        try {
            $res = Http::withBasicAuth($sid, $token)
                ->asForm()
                ->post("https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json", [
                    'From' => $from,
                    'To'   => $phone,
                    'Body' => $message,
                ]);

            return [
                'success' => $res->successful(),
                'driver'  => 'twilio',
                'phone'   => $phone,
                'message' => $res->successful() ? 'SMS envoyé via Twilio.' : 'Échec envoi Twilio.',
            ];
        } catch (\Throwable $e) {
            Log::error("Twilio SMS error: {$e->getMessage()}");
            return [
                'success' => false,
                'driver'  => 'twilio',
                'phone'   => $phone,
                'message' => $e->getMessage(),
            ];
        }
    }
}
