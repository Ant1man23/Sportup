<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * GET /api/v1/notifications
     * Récupère la liste des notifications de l'utilisateur connecté (triées par date décroissante).
     */
    public function index(Request $request): JsonResponse
    {
        $notifications = Notification::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->take(50)
            ->get()
            ->map(fn($n) => [
                'id'       => $n->id,
                'type'     => $n->type,
                'title'    => $n->title,
                'body'     => $n->body,
                'data'     => $n->data,
                'is_read'  => $n->is_read,
                'time_ago' => $n->created_at->diffForHumans(),
            ]);

        $unreadCount = Notification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'data'         => $notifications,
            'unread_count' => $unreadCount,
        ], 200);
    }

    /**
     * POST /api/v1/notifications/read-all
     * Marque toutes les notifications de l'utilisateur comme lues.
     */
    public function markAllRead(Request $request): JsonResponse
    {
        Notification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json(['message' => 'Toutes les notifications ont été lues.'], 200);
    }

    /**
     * DELETE /api/v1/notifications/{id}
     * Supprime une notification spécifique appartenant à l'utilisateur.
     */
    public function destroy(int $id, Request $request): JsonResponse
    {
        $notification = Notification::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $notification->delete();

        return response()->json(null, 204);
    }
}
