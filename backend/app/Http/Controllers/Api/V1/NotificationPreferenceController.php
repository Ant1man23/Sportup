<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\NotificationPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationPreferenceController extends Controller
{
    /**
     * GET /api/v1/notification-preferences
     */
    public function index(Request $request): JsonResponse
    {
        $prefs = NotificationPreference::where('user_id', $request->user()->id)->get();
        $user = $request->user();

        return response()->json([
            'reminder_minutes_before' => $user->reminder_minutes_before ?? 60,
            'preferences'             => $prefs,
        ], 200);
    }

    /**
     * PUT /api/v1/notification-preferences
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reminder_minutes_before' => 'nullable|integer|min:5|max:1440',
            'preferences'             => 'nullable|array',
            'preferences.*.type'      => 'required|string',
            'preferences.*.push_enabled' => 'required|boolean',
        ]);

        $user = $request->user();

        if (isset($validated['reminder_minutes_before'])) {
            $user->update(['reminder_minutes_before' => $validated['reminder_minutes_before']]);
        }

        if (isset($validated['preferences'])) {
            foreach ($validated['preferences'] as $pref) {
                NotificationPreference::updateOrCreate(
                    ['user_id' => $user->id, 'type' => $pref['type']],
                    ['push_enabled' => $pref['push_enabled']]
                );
            }
        }

        return response()->json(['message' => 'Préférences mises à jour avec succès.'], 200);
    }
}
