<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\SportSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    /**
     * GET /api/v1/sessions/{sessionId}/conversation
     * Récupère ou initialise la conversation d'une session sportive.
     */
    public function getSessionConversation(int $sessionId, Request $request): JsonResponse
    {
        $session = SportSession::with('participants')->findOrFail($sessionId);

        // Vérifie si l'utilisateur courant est un participant inscrit ou l'organisateur de la session
        $isParticipant = $session->participants->contains('id', $request->user()->id) || $session->organizer_id === $request->user()->id;
        if (!$isParticipant) {
            return response()->json(['message' => 'Accès au chat réservé aux participants.'], 403);
        }

        $conversation = Conversation::firstOrCreate([
            'type'       => 'session',
            'session_id' => $session->id,
        ]);

        return response()->json($conversation->load(['messages.sender']), 200);
    }

    /**
     * GET /api/v1/conversations/{id}/messages
     * Liste chronologique des messages échangés au sein d'une conversation.
     */
    public function index(int $id, Request $request): JsonResponse
    {
        $conversation = Conversation::findOrFail($id);

        $messages = Message::with('sender')
            ->where('conversation_id', $conversation->id)
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(fn($m) => [
                'id'         => $m->id,
                'body'       => $m->body,
                'image_url'  => $m->image_url,
                'sender_id'  => $m->sender_id,
                'sender'     => [
                    'id'         => $m->sender->id,
                    'username'   => $m->sender->username,
                    'photo_path' => $m->sender->photo_path,
                ],
                'created_at' => $m->created_at?->toIso8601String(),
            ]);

        return response()->json($messages, 200);
    }

    /**
     * POST /api/v1/conversations/{id}/messages
     * Envoie un nouveau message texte ou image, déclenche les notifications push et diffuse via WebSocket.
     */
    public function store(int $id, Request $request): JsonResponse
    {
        $conversation = Conversation::findOrFail($id);

        $validated = $request->validate([
            'body'  => 'nullable|string|max:2000',
            'image' => 'nullable|file|image|max:10240',
        ]);

        if (empty($validated['body']) && !$request->hasFile('image')) {
            return response()->json(['message' => 'Le message doit contenir du texte ou une photo.'], 422);
        }

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('chat/messages', 'public');
        }

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id'       => $request->user()->id,
            'body'            => $validated['body'] ?? '',
            'image_path'      => $imagePath,
        ]);

        $message->load('sender');

        $notificationText = !empty($message->body)
            ? "{$request->user()->username}: {$message->body}"
            : "{$request->user()->username} a partagé une photo 📷";

        if ($conversation->type === 'session' && $conversation->session) {
            $session = $conversation->session;
            $recipients = $session->participants->where('id', '!=', $request->user()->id);
            if ($session->organizer_id !== $request->user()->id && $session->organizer) {
                $recipients = $recipients->push($session->organizer)->unique('id');
            }
            app(\App\Services\NotificationService::class)->sendToUsers(
                $recipients,
                'new_message',
                'Nouveau message',
                $notificationText,
                $session->id,
                null,
                ['conversation_id' => (string) $conversation->id]
            );
        } elseif ($conversation->type === 'team' && $conversation->team) {
            $team = $conversation->team;
            $recipients = $team->members->where('id', '!=', $request->user()->id);
            if ($team->captain_id !== $request->user()->id && $team->captain) {
                $recipients = $recipients->push($team->captain)->unique('id');
            }
            app(\App\Services\NotificationService::class)->sendToUsers(
                $recipients,
                'new_message',
                "Message de l'équipe {$team->name}",
                $notificationText,
                null,
                null,
                ['conversation_id' => (string) $conversation->id, 'team_id' => (string) $team->id]
            );
        }

        // Diffusion en temps réel aux abonnés WebSocket du canal
        event(new \App\Events\ChatMessageSent($message));

        return response()->json([
            'id'         => $message->id,
            'body'       => $message->body,
            'image_url'  => $message->image_url,
            'sender_id'  => $message->sender_id,
            'sender'     => [
                'id'         => $message->sender->id,
                'username'   => $message->sender->username,
                'photo_path' => $message->sender->photo_path,
            ],
            'created_at' => $message->created_at?->toIso8601String(),
        ], 201);
    }

    /**
     * GET /api/v1/teams/{teamId}/conversation
     * Récupère ou initialise la conversation d'équipe.
     */
    public function getTeamConversation(int $teamId, Request $request): JsonResponse
    {
        $team = \App\Models\Team::with('members')->findOrFail($teamId);

        $isMember = $team->members->contains('id', $request->user()->id) || $team->captain_id === $request->user()->id;
        if (!$isMember) {
            return response()->json(['message' => 'Accès au chat réservé aux membres de l\'équipe.'], 403);
        }

        $conversation = Conversation::firstOrCreate([
            'type'    => 'team',
            'team_id' => $team->id,
        ]);

        return response()->json($conversation->load(['messages.sender']), 200);
    }

    /**
     * GET /api/v1/conversations
     * Liste toutes les conversations de l'utilisateur (sessions sportives et équipes).
     */
    public function userConversations(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $sessionConversations = Conversation::where('type', 'session')
            ->where(function ($q) use ($userId) {
                $q->whereHas('session.participants', function ($sub) use ($userId) {
                    $sub->where('users.id', $userId);
                })->orWhereHas('session', function ($sub) use ($userId) {
                    $sub->where('organizer_id', $userId);
                });
            })
            ->with(['session.sport', 'messages.sender'])
            ->get();

        $teamConversations = Conversation::where('type', 'team')
            ->where(function ($q) use ($userId) {
                $q->whereHas('team.members', function ($sub) use ($userId) {
                    $sub->where('users.id', $userId);
                })->orWhereHas('team', function ($sub) use ($userId) {
                    $sub->where('captain_id', $userId);
                });
            })
            ->with(['team.sport', 'messages.sender'])
            ->get();

        $all = $sessionConversations->concat($teamConversations)->map(function ($c) {
            $lastMessage = $c->messages->last();
            $title = $c->type === 'session'
                ? ($c->session?->description ?: "Match {$c->session?->sport?->name}")
                : "Équipe {$c->team?->name}";
            $subtitle = $c->type === 'session'
                ? ($c->session?->city ?: 'Antananarivo')
                : ($c->team?->sport?->name ?: 'Sport');

            return [
                'id' => $c->id,
                'type' => $c->type,
                'title' => $title,
                'subtitle' => $subtitle,
                'session_id' => $c->session_id,
                'team_id' => $c->team_id,
                'last_message' => $lastMessage ? [
                    'body' => $lastMessage->body,
                    'sender' => $lastMessage->sender?->username,
                    'created_at' => $lastMessage->created_at?->toIso8601String(),
                ] : null,
                'messages_count' => $c->messages->count(),
            ];
        })->sortByDesc(fn($c) => $c['last_message']['created_at'] ?? '2000-01-01')->values();

        return response()->json($all, 200);
    }
}
