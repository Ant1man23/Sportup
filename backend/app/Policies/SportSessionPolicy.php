<?php

namespace App\Policies;

use App\Models\SportSession;
use App\Models\User;

class SportSessionPolicy
{
    /**
     * Determine whether the user can modify or cancel the session.
     */
    public function update(User $user, SportSession $session): bool
    {
        return $user->isAdmin() || $session->organizer_id === $user->id;
    }

    /**
     * Determine whether the user can designate a referee.
     */
    public function assignReferee(User $user, SportSession $session): bool
    {
        return $user->isAdmin() || $session->organizer_id === $user->id;
    }
}
