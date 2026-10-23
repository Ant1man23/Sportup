<?php

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels — SportUp
|--------------------------------------------------------------------------
*/

// Canal privé pour un utilisateur (notifications, invitations directes)
Broadcast::channel('user.{id}', function (User $user, $id) {
    return (int) $user->id === (int) $id;
});

// Canal privé pour une conversation (Session ou Team)
Broadcast::channel('conversation.{id}', function (User $user, $id) {
    $conversation = Conversation::find($id);
    if (!$conversation) {
        return false;
    }

    if ($conversation->session_id) {
        return $conversation->session->participants()->where('user_id', $user->id)->exists()
            || $conversation->session->organizer_id === $user->id;
    }

    if ($conversation->team_id) {
        return $conversation->team->members()->where('user_id', $user->id)->exists()
            || $conversation->team->captain_id === $user->id;
    }

    return false;
});
