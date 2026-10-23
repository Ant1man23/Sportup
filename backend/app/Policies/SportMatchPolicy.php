<?php

namespace App\Policies;

use App\Models\SportMatch;
use App\Models\User;

class SportMatchPolicy
{
    /**
     * Determine whether the user can manage the live match and score (timer, events, period, finish).
     * Authorized: Session Organizer, Assigned Referee, or System Admin.
     */
    public function manageScore(User $user, SportMatch $match): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        $session = $match->session;
        if (!$session) {
            return false;
        }

        // Organisateur de la rencontre
        if ($session->organizer_id === $user->id) {
            return true;
        }

        // Arbitre / Officiel officiellement désigné
        if ($session->referee_id && $session->referee_id === $user->id) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can view the match.
     * Spectators and players can always view live matches and results (read-only).
     */
    public function view(User $user, SportMatch $match): bool
    {
        return true;
    }
}
