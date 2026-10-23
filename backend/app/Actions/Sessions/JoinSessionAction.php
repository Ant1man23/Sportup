<?php

namespace App\Actions\Sessions;

use App\Models\SportSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class JoinSessionAction
{
    public function execute(User $user, int $sessionId): SportSession
    {
        return DB::transaction(function () use ($user, $sessionId) {
            /** @var SportSession $session */
            $session = SportSession::lockForUpdate()->findOrFail($sessionId);

            if ($session->status === 'cancelled') {
                throw new ConflictHttpException('Cette session a été annulée.');
            }

            if ($session->status === 'full' || $session->current_participants >= $session->max_participants) {
                throw new ConflictHttpException('Cette session est déjà complète.');
            }

            if ($session->participants()->where('user_id', $user->id)->exists()) {
                throw new ConflictHttpException('Vous êtes déjà inscrit à cette session.');
            }

            $session->participants()->attach($user->id, [
                'joined_at' => now(),
            ]);

            $session->increment('current_participants');

            if ($session->current_participants >= $session->max_participants) {
                $session->update(['status' => 'full']);
            }

            if ($session->organizer_id !== $user->id && $session->organizer) {
                app(\App\Services\NotificationService::class)->sendToUser(
                    $session->organizer,
                    'session_participant_joined',
                    'Nouveau participant',
                    "{$user->username} a rejoint votre session sportive.",
                    $session->id
                );

                if ($session->status === 'full') {
                    app(\App\Services\NotificationService::class)->sendToUser(
                        $session->organizer,
                        'session_full',
                        'Session complète !',
                        "Votre session est désormais complète ({$session->max_participants}/{$session->max_participants}).",
                        $session->id
                    );
                }
            }

            return $session->load(['organizer', 'sport', 'participants']);
        });
    }
}
