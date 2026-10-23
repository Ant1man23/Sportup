<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Models\User;
use Illuminate\Support\Collection;

class NotificationService
{
    public function __construct(
        protected FcmService $fcmService
    ) {}

    /**
     * Send notification to a single user (DB record + FCM push).
     */
    public function sendToUser(
        User $user,
        string $type,
        string $title,
        string $body,
        ?int $sessionId = null,
        ?int $matchId = null,
        array $extraData = []
    ): ?Notification {
        $dataPayload = array_merge($extraData, array_filter([
            'session_id' => $sessionId,
            'match_id'   => $matchId,
        ]));

        // 1. Create in-app Notification record
        $notification = Notification::create([
            'user_id' => $user->id,
            'type'    => $type,
            'title'   => $title,
            'body'    => $body,
            'is_read' => false,
            'data'    => !empty($dataPayload) ? $dataPayload : null,
        ]);

        // 2. Check user's notification preferences
        $pref = NotificationPreference::where('user_id', $user->id)
            ->where('type', $type)
            ->first();

        // If user explicitly disabled push for this type, don't send FCM
        if ($pref && !$pref->push_enabled) {
            return $notification;
        }

        // 3. Collect active device tokens
        $tokens = $user->devices()->pluck('fcm_token')->toArray();

        if (!empty($tokens)) {
            $data = array_merge($extraData, [
                'type'               => $type,
                'notification_id'    => (string) $notification->id,
                'related_session_id' => $sessionId ? (string) $sessionId : '',
                'related_match_id'   => $matchId ? (string) $matchId : '',
            ]);

            \App\Jobs\SendPushNotificationJob::dispatch($tokens, $title, $body, $data);
        }

        return $notification;
    }

    /**
     * Send notification to multiple users.
     */
    public function sendToUsers(
        Collection|array $users,
        string $type,
        string $title,
        string $body,
        ?int $sessionId = null,
        ?int $matchId = null,
        array $extraData = []
    ): array {
        $created = [];
        foreach ($users as $user) {
            if ($user instanceof User) {
                $created[] = $this->sendToUser($user, $type, $title, $body, $sessionId, $matchId, $extraData);
            }
        }
        return $created;
    }
}
