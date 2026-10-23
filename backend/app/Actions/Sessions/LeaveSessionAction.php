<?php

namespace App\Actions\Sessions;

use App\Models\SportSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class LeaveSessionAction
{
    public function execute(User $user, int $sessionId): SportSession
    {
        return DB::transaction(function () use ($user, $sessionId) {
            /** @var SportSession $session */
            $session = SportSession::lockForUpdate()->findOrFail($sessionId);

            if (! $session->participants()->where('user_id', $user->id)->exists()) {
                throw new ConflictHttpException('Vous n\'êtes pas inscrit à cette session.');
            }

            if ($session->organizer_id === $user->id) {
                throw new ConflictHttpException('L\'organisateur ne peut pas quitter sa propre session. Annulez-la si nécessaire.');
            }

            $session->participants()->detach($user->id);
            $session->decrement('current_participants');

            if ($session->status === 'full' && $session->current_participants < $session->max_participants) {
                $session->update(['status' => 'open']);
            }

            if ($session->organizer_id !== $user->id && $session->organizer) {
                app(\App\Services\NotificationService::class)->sendToUser(
                    $session->organizer,
                    'session_participant_left',
                    'Désistement',
                    "{$user->username} a quitté votre session.",
                    $session->id
                );
            }

            return $session->load(['organizer', 'sport', 'participants']);
        });
    }
}
