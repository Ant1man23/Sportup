<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Device;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class DeviceController extends Controller
{
    /**
     * POST /api/v1/devices
     * Enregistre ou met à jour le token FCM de l'appareil pour les notifications push.
     */
    public function store(Request $request): Response|JsonResponse
    {
        $validated = $request->validate([
            'fcm_token' => 'nullable|string|max:191',
            'fcmToken'  => 'nullable|string|max:191',
            'platform'  => 'nullable|in:ios,android',
        ]);

        $token = $validated['fcm_token'] ?? $validated['fcmToken'] ?? null;
        if (!$token) {
            return response()->json(['message' => 'Token FCM manquant.'], 422);
        }

        Device::updateOrCreate(
            ['fcm_token' => $token],
            [
                'user_id'  => $request->user()->id,
                'platform' => $validated['platform'] ?? 'android',
            ]
        );

        return response()->noContent(204);
    }

    /**
     * DELETE /api/v1/devices
     * Supprime le token FCM de l'appareil lors de la déconnexion de l'utilisateur.
     */
    public function destroy(Request $request): Response|JsonResponse
    {
        $validated = $request->validate([
            'fcm_token' => 'nullable|string|max:191',
            'fcmToken'  => 'nullable|string|max:191',
        ]);

        $token = $validated['fcm_token'] ?? $validated['fcmToken'] ?? null;
        if ($token) {
            Device::where('fcm_token', $token)
                ->where('user_id', $request->user()->id)
                ->delete();
        }

        return response()->noContent(204);
    }
}
