<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Team;
use App\Models\TeamInvitation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    /**
     * GET /api/v1/teams
     * Liste les équipes de l'utilisateur ou recherche les équipes cherchant des adversaires.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Team::with(['sport', 'captain'])->withCount('members');

        if ($request->boolean('lookingForOpponent')) {
            $query->where('is_looking_for_opponent', true);

            if ($request->has('level')) {
                $query->where('level', $request->query('level'));
            }
            if ($request->has('city')) {
                $query->where('city', 'LIKE', '%' . $request->query('city') . '%');
            }
        } else {
            // Par défaut : Équipes dont l'utilisateur connecté est membre ou capitaine
            $query->whereHas('members', function ($q) use ($request) {
                $q->where('user_id', $request->user()->id);
            });
        }

        $teams = $query->get()->map(function (Team $team) use ($request) {
            $myMember = $team->members->firstWhere('id', $request->user()->id);
            return [
                'id'                      => $team->id,
                'name'                    => $team->name,
                'initials'                => $team->initials,
                'invite_code'             => $team->invite_code,
                'logo_path'               => $team->logo_path,
                'level'                   => $team->level,
                'city'                    => $team->city,
                'is_looking_for_opponent' => $team->is_looking_for_opponent,
                'max_members'             => $team->max_members,
                'members_count'           => $team->members_count,
                'sport'                   => $team->sport,
                'captain'                 => $team->captain,
                'my_role'                 => $myMember?->pivot?->role ?? 'none',
            ];
        });

        return response()->json($teams, 200);
    }

    /**
     * GET /api/v1/teams/{id}
     */
    public function show(int $id, Request $request): JsonResponse
    {
        $team = Team::with(['sport', 'captain', 'members'])->findOrFail($id);

        $formattedMembers = $team->members->map(function ($user) {
            return [
                'user' => [
                    'id'         => $user->id,
                    'username'   => $user->username,
                    'email'      => $user->email,
                    'photo_path' => $user->photo_path,
                    'city'       => $user->city,
                    'level'      => $user->level,
                ],
                'role'      => $user->pivot->role,
                'joined_at' => $user->pivot->joined_at,
            ];
        });

        return response()->json([
            'id'                      => $team->id,
            'name'                    => $team->name,
            'initials'                => $team->initials,
            'invite_code'             => $team->invite_code,
            'logo_path'               => $team->logo_path,
            'level'                   => $team->level,
            'city'                    => $team->city,
            'is_looking_for_opponent' => $team->is_looking_for_opponent,
            'max_members'             => $team->max_members,
            'members_count'           => $team->members->count(),
            'sport'                   => $team->sport,
            'captain'                 => $team->captain,
            'members'                 => $formattedMembers,
        ], 200);
    }

    /**
     * POST /api/v1/teams
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'                    => 'required|string|max:80',
            'sport_id'                => 'required|exists:sports,id',
            'organization_type'       => 'nullable|in:enterprise,club,association,school_university,administration,independent_group',
            'organization_name'       => 'nullable|string|max:191',
            'level'                   => 'nullable|in:beginner,intermediate,advanced',
            'city'                    => 'nullable|string|max:100',
            'is_looking_for_opponent' => 'nullable|boolean',
        ]);

        $user = $request->user();

        $team = Team::create([
            'name'                    => $validated['name'],
            'sport_id'                => $validated['sport_id'],
            'captain_id'              => $user->id,
            'organization_type'       => $validated['organization_type'] ?? 'independent_group',
            'organization_name'       => $validated['organization_name'] ?? null,
            'level'                   => $validated['level'] ?? 'intermediate',
            'city'                    => $validated['city'] ?? $user->city,
            'is_looking_for_opponent' => $validated['is_looking_for_opponent'] ?? false,
        ]);

        $team->members()->attach($user->id, ['role' => 'captain']);

        $team->load(['sport', 'captain', 'members']);

        return response()->json([
            'id'                      => $team->id,
            'name'                    => $team->name,
            'initials'                => $team->initials,
            'logo_path'               => $team->logo_path,
            'organization_type'       => $team->organization_type,
            'organization_name'       => $team->organization_name,
            'level'                   => $team->level,
            'city'                    => $team->city,
            'is_looking_for_opponent' => $team->is_looking_for_opponent,
            'max_members'             => $team->max_members,
            'members_count'           => 1,
            'sport'                   => $team->sport,
            'captain'                 => $team->captain,
        ], 201);
    }

    /**
     * PUT /api/v1/teams/{id}/opponent-status
     */
    public function updateOpponentStatus(int $id, Request $request): JsonResponse
    {
        $team = Team::findOrFail($id);

        if ($team->captain_id !== $request->user()->id) {
            return response()->json(['message' => 'Seul le capitaine peut modifier le statut de l\'équipe.'], 403);
        }

        $validated = $request->validate([
            'is_looking_for_opponent' => 'required|boolean',
            'level'                   => 'nullable|in:beginner,intermediate,advanced',
            'city'                    => 'nullable|string|max:100',
        ]);

        $team->update($validated);

        return response()->json([
            'message' => 'Statut de recherche mis à jour.',
            'team'    => $team,
        ], 200);
    }

    /**
     * POST /api/v1/teams/{id}/invitations
     * Invite un joueur à rejoindre l'équipe (par ID, pseudo ou email).
     */
    public function inviteMember(int $id, Request $request): JsonResponse
    {
        $team = Team::findOrFail($id);

        if ($team->captain_id !== $request->user()->id) {
            return response()->json(['message' => 'Seul le capitaine peut inviter des membres.'], 403);
        }

        $validated = $request->validate([
            'user_id'  => 'nullable|exists:users,id',
            'username' => 'nullable|string',
            'email'    => 'nullable|email',
        ]);

        $userId = $validated['user_id'] ?? null;
        if (!$userId && !empty($validated['username'])) {
            $found = User::where('username', $validated['username'])->first();
            $userId = $found?->id;
        }
        if (!$userId && !empty($validated['email'])) {
            $found = User::where('email', $validated['email'])->first();
            $userId = $found?->id;
        }

        if (!$userId) {
            return response()->json(['message' => 'Joueur introuvable. Veuillez vérifier l\'identifiant, le nom ou l\'email.'], 404);
        }

        if ($team->members()->where('user_id', $userId)->exists()) {
            return response()->json(['message' => 'Ce joueur est déjà dans l\'équipe.'], 409);
        }

        $invitation = TeamInvitation::firstOrCreate(
            ['team_id' => $team->id, 'user_id' => $userId],
            ['invited_by' => $request->user()->id, 'status' => 'pending']
        );

        $targetUser = User::find($userId);
        if ($targetUser) {
            app(\App\Services\NotificationService::class)->sendToUser(
                $targetUser,
                'team_invitation',
                'Invitation d\'équipe',
                "{$request->user()->username} vous a invité à rejoindre l'équipe {$team->name}.",
                null,
                null,
                ['team_id' => (string) $team->id, 'invitation_id' => (string) $invitation->id]
            );
        }

        return response()->json([
            'message'    => "Invitation envoyée avec succès à {$targetUser?->username}.",
            'invitation' => $invitation->load(['user', 'team']),
        ], 201);
    }

    /**
     * GET /api/v1/teams/invitations/my
     * Récupère la liste des invitations en attente reçues par l'utilisateur connecté.
     */
    public function myInvitations(Request $request): JsonResponse
    {
        $invitations = TeamInvitation::with(['team.sport', 'inviter'])
            ->where('user_id', $request->user()->id)
            ->where('status', 'pending')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($invitations, 200);
    }

    /**
     * POST /api/v1/teams/invitations/{id}/respond
     * Répond à une invitation d'équipe (accepter ou refuser).
     */
    public function respondInvitation(int $id, Request $request): JsonResponse
    {
        $invitation = TeamInvitation::findOrFail($id);

        if ($invitation->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $validated = $request->validate([
            'action' => 'required|in:accept,decline',
        ]);

        if ($validated['action'] === 'accept') {
            $invitation->update(['status' => 'accepted']);
            $invitation->team->members()->attach($request->user()->id, ['role' => 'member']);
            $msg = 'Invitation acceptée, vous avez rejoint l\'équipe !';
        } else {
            $invitation->update(['status' => 'declined']);
            $msg = 'Invitation refusée.';
        }

        return response()->json(['message' => $msg], 200);
    }

    /**
     * POST /api/v1/teams/{id}/members
     */
    public function addMember(int $id, Request $request): JsonResponse
    {
        $team = Team::findOrFail($id);

        if ($team->captain_id !== $request->user()->id) {
            return response()->json(['message' => 'Seul le capitaine peut ajouter des membres.'], 403);
        }

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        if ($team->members()->where('user_id', $validated['user_id'])->exists()) {
            return response()->json(['message' => 'Ce joueur est déjà dans l\'équipe.'], 409);
        }

        $team->members()->attach($validated['user_id'], ['role' => 'member']);

        $user = User::findOrFail($validated['user_id']);

        return response()->json([
            'user'      => $user->only(['id', 'username', 'email', 'photo_path', 'city', 'level']),
            'role'      => 'member',
            'joined_at' => now()->toDateTimeString(),
        ], 201);
    }

    /**
     * POST /api/v1/teams/{id}/logo
     */
    public function uploadLogo(int $id, Request $request): JsonResponse
    {
        $team = Team::findOrFail($id);

        if ($team->captain_id !== $request->user()->id) {
            return response()->json(['message' => 'Seul le capitaine peut modifier le logo.'], 403);
        }

        $request->validate([
            'logo' => ['required', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
        ]);

        $file = $request->file('logo');

        if ($team->logo_path && !str_starts_with($team->logo_path, 'http')) {
            try {
                \Illuminate\Support\Facades\Storage::disk(config('filesystems.default'))->delete($team->logo_path);
            } catch (\Throwable) {
            }
        }

        $disk = config('filesystems.default');
        $path = $file->store('teams/logos', $disk);
        $url = \Illuminate\Support\Facades\Storage::disk($disk)->url($path);

        $team->update(['logo_path' => $path]);

        return response()->json([
            'message'   => 'Logo de l\'équipe mis à jour avec succès.',
            'logo_path' => $path,
            'logo_url'  => $url,
            'team'      => $team->fresh(['sport', 'captain', 'members']),
        ], 200);
    }

    /**
     * POST /api/v1/teams/join-by-code
     * Rejoindre une équipe via son code d'invitation (ex: SP-A1B2C3).
     */
    public function joinByCode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|max:32',
        ]);

        $code = strtoupper(trim($validated['code']));

        // Recherche par invite_code ou fallback basé sur CRC32
        $team = Team::where('invite_code', $code)->first();

        if (!$team) {
            $allTeams = Team::all();
            $team = $allTeams->first(fn ($t) => strtoupper($t->invite_code) === $code);
        }

        if (!$team) {
            return response()->json(['message' => 'Code d\'équipe invalide ou expiré.'], 404);
        }

        $user = $request->user();

        if ($team->members()->where('user_id', $user->id)->exists()) {
            return response()->json([
                'message' => 'Vous êtes déjà membre de cette équipe !',
                'team'    => $team->load(['sport', 'captain', 'members']),
            ], 200);
        }

        if ($team->members()->count() >= $team->max_members) {
            return response()->json(['message' => 'Cette équipe a atteint sa capacité maximale de membres.'], 422);
        }

        $team->members()->attach($user->id, [
            'role'      => 'member',
            'joined_at' => now(),
        ]);

        // Notifier le capitaine
        if ($team->captain_id && $team->captain_id !== $user->id) {
            $captain = User::find($team->captain_id);
            if ($captain) {
                app(\App\Services\NotificationService::class)->sendToUser(
                    $captain,
                    'team_member_joined',
                    'Nouveau membre dans l\'équipe',
                    "{$user->username} a rejoint l'équipe {$team->name} via le code d'invitation !",
                    null,
                    null,
                    ['team_id' => (string) $team->id]
                );
            }
        }

        return response()->json([
            'message' => "Félicitations ! Vous avez rejoint l'équipe {$team->name}.",
            'team'    => $team->fresh(['sport', 'captain', 'members']),
        ], 200);
    }

    /**
     * PUT /api/v1/teams/{id}
     * Modifie les informations de l'équipe (nom, niveau, ville, statut adversaire).
     * Réservé au capitaine de l'équipe.
     */
    public function update(int $id, Request $request): JsonResponse
    {
        $team = Team::findOrFail($id);

        if ($team->captain_id !== $request->user()->id) {
            return response()->json(['message' => 'Seul le capitaine peut modifier l\'équipe.'], 403);
        }

        $validated = $request->validate([
            'name'                    => 'sometimes|string|max:80',
            'level'                   => 'sometimes|nullable|in:beginner,intermediate,advanced',
            'city'                    => 'sometimes|nullable|string|max:100',
            'is_looking_for_opponent' => 'sometimes|boolean',
            'organization_type'       => 'sometimes|nullable|in:enterprise,club,association,school_university,administration,independent_group',
            'organization_name'       => 'sometimes|nullable|string|max:191',
            'max_members'             => 'sometimes|integer|min:2|max:50',
        ]);

        $team->update($validated);
        $team->load(['sport', 'captain', 'members']);

        return response()->json([
            'message' => 'Équipe mise à jour avec succès.',
            'team'    => [
                'id'                      => $team->id,
                'name'                    => $team->name,
                'initials'                => $team->initials,
                'invite_code'             => $team->invite_code,
                'logo_path'               => $team->logo_path,
                'level'                   => $team->level,
                'city'                    => $team->city,
                'is_looking_for_opponent' => $team->is_looking_for_opponent,
                'max_members'             => $team->max_members,
                'members_count'           => $team->members->count(),
                'sport'                   => $team->sport,
                'captain'                 => $team->captain,
            ],
        ], 200);
    }

    /**
     * DELETE /api/v1/teams/{id}
     * Supprime une équipe et notifie tous ses membres.
     * Réservé au capitaine de l'équipe.
     */
    public function destroy(int $id, Request $request): JsonResponse
    {
        $team = Team::with('members')->findOrFail($id);

        if ($team->captain_id !== $request->user()->id) {
            return response()->json(['message' => 'Seul le capitaine peut supprimer l\'équipe.'], 403);
        }

        $teamName = $team->name;

        // Notifier tous les membres (sauf le capitaine) avant suppression
        $members = $team->members->filter(fn ($m) => $m->id !== $request->user()->id);
        if ($members->isNotEmpty()) {
            app(\App\Services\NotificationService::class)->sendToUsers(
                $members,
                'team_dissolved',
                'Équipe dissoute',
                "L'équipe {$teamName} a été dissoute par son capitaine.",
                null,
                null,
                ['team_id' => (string) $team->id]
            );
        }

        $team->delete();

        return response()->json(['message' => "L'équipe {$teamName} a été supprimée avec succès."], 200);
    }

    /**
     * GET /api/v1/teams/by-code/{code}
     * Récupère les détails d'une équipe via son code d'invitation (deep link WhatsApp).
     */
    public function showByCode(string $code, Request $request): JsonResponse
    {
        $code = strtoupper(trim($code));

        $team = Team::where('invite_code', $code)->first();

        if (!$team) {
            $allTeams = Team::all();
            $team = $allTeams->first(fn ($t) => strtoupper($t->invite_code) === $code);
        }

        if (!$team) {
            return response()->json(['message' => 'Équipe introuvable pour ce code d\'invitation.'], 404);
        }

        return $this->show($team->id, $request);
    }
}
