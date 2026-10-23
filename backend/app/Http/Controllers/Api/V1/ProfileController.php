<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SportSession;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    /**
     * Show public profile for a user with favorite sports, teams, and recent match performance.
     */
    public function show(int $id): JsonResponse
    {
        $user = User::with(['favoriteSports', 'teams.sport', 'statistics.sport'])->findOrFail($id);

        // Recent finished matches (last 5)
        $recentSessions = SportSession::whereHas('participants', function ($query) use ($id) {
            $query->where('users.id', $id);
        })
            ->whereHas('match', function ($query) {
                $query->where('status', 'finished');
            })
            ->with(['sport', 'match.events'])
            ->latest('session_date')
            ->take(5)
            ->get();

        $recentMatchesData = [];
        foreach ($recentSessions as $session) {
            if (!$session->match) continue;
            $match = $session->match;
            $userGoals = $match->events->where('player_id', $id)->where('type', 'goal')->count();
            $userPoints = $match->events->where('player_id', $id)->where('type', 'basket')->sum('points');
            $userEvent = $match->events->firstWhere('player_id', $id);
            $userSide = $userEvent ? $userEvent->team_side : 'team_a';
            $isWinner = ($userSide === 'team_a' && $match->score_team_a > $match->score_team_b) ||
                        ($userSide === 'team_b' && $match->score_team_b > $match->score_team_a);
            $recentMatchesData[] = [
                'session_title' => ($session->address ?: 'Session').' ('.($session->city ?: 'Antananarivo').')',
                'sport_name' => $session->sport ? $session->sport->name : 'Sport',
                'date' => $session->session_date,
                'score_team_a' => $match->score_team_a,
                'score_team_b' => $match->score_team_b,
                'is_winner' => $isWinner,
                'user_goals' => $userGoals,
                'user_points' => $userPoints,
            ];
        }

        // Rank: position of user by win_rate among all users with stats
        $stats = \App\Models\UserSportStatistics::where('user_id', $id)->get();
        $totalPlayed = $stats->sum('matches_played');
        $totalWins = $stats->sum('wins');
        $totalMvp = $stats->sum('mvp_count');
        $userWinRate = $totalPlayed > 0 ? ($totalWins / $totalPlayed) : 0;

        $rank = \App\Models\UserSportStatistics::selectRaw('user_id, SUM(wins) as tw, SUM(matches_played) as tp')
            ->groupBy('user_id')
            ->havingRaw('tp > 0')
            ->get()
            ->filter(fn($r) => ($r->tw / $r->tp) > $userWinRate)
            ->count() + 1;

        return response()->json([
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'email' => $user->email,
                'city' => $user->city,
                'level' => $user->level,
                'photo_path' => $user->photo_path,
                'photo_url' => $user->photo_path
                    ? (str_starts_with($user->photo_path, 'http')
                        ? $user->photo_path
                        : \Illuminate\Support\Facades\Storage::url($user->photo_path))
                    : null,
                'created_at' => $user->created_at,
            ],
            'rank' => $rank,
            'mvp_count' => (int) $totalMvp,
            'favorite_sports' => $user->favoriteSports,
            'teams' => $user->teams,
            'recent_match' => count($recentMatchesData) > 0 ? $recentMatchesData[0] : null,
            'recent_matches' => $recentMatchesData,
            'gamification' => app(\App\Actions\Users\CalculateUserBadgesAction::class)->execute($user),
        ], 200);
    }

    /**
     * Update authenticated user's profile.
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'username' => ['sometimes', 'string', 'max:50', Rule::unique('users', 'username')->ignore($user->id)],
            'city' => ['nullable', 'string', 'max:100'],
            'level' => ['nullable', 'in:beginner,intermediate,advanced,all'],
            'photo_path' => ['nullable', 'string'],
            'avatar_base64' => ['nullable', 'string'],
            'favorite_sport_ids' => ['nullable', 'array'],
            'favorite_sport_ids.*' => ['integer', 'exists:sports,id'],
        ]);

        if (!empty($validated['avatar_base64'])) {
            $base64Data = preg_replace('#^data:image/\w+;base64,#i', '', $validated['avatar_base64']);
            $decoded = base64_decode($base64Data);
            if ($decoded !== false) {
                $filename = 'avatars/user_' . $user->id . '_' . time() . '.jpg';
                \Illuminate\Support\Facades\Storage::disk('local')->put($filename, $decoded);
                $user->photo_path = $filename;
            }
        }

        $user->fill(collect($validated)->only(['username', 'city', 'level'])->toArray());
        $user->save();

        if (isset($validated['favorite_sport_ids'])) {
            $user->favoriteSports()->sync($validated['favorite_sport_ids']);
        }

        return response()->json($user->load('favoriteSports'), 200);
    }

    /**
     * Upload an avatar to storage (supports multipart file or base64).
     */
    public function uploadAvatar(Request $request): JsonResponse
    {
        $user = $request->user();
        $path = null;

        if ($request->hasFile('avatar')) {
            $request->validate([
                'avatar' => ['image', 'mimes:jpeg,png,jpg,webp', 'max:10240'],
            ]);
            $file = $request->file('avatar');
            $disk = config('filesystems.default', 'public');
            $path = $file->store('avatars', $disk);
        } elseif ($request->filled('avatar_base64') || $request->filled('avatar')) {
            $raw = $request->input('avatar_base64') ?: $request->input('avatar');
            $base64Data = preg_replace('#^data:image/\w+;base64,#i', '', $raw);
            $decoded = base64_decode($base64Data);
            if ($decoded !== false) {
                $disk = config('filesystems.default', 'public');
                $filename = 'avatars/user_' . $user->id . '_' . time() . '.jpg';
                \Illuminate\Support\Facades\Storage::disk($disk)->put($filename, $decoded);
                $path = $filename;
            }
        }

        if (!$path) {
            return response()->json(['message' => 'Aucune image valide fournie.'], 422);
        }

        // Delete old avatar if exists
        if ($user->photo_path && !str_starts_with($user->photo_path, 'http') && $user->photo_path !== $path) {
            try {
                \Illuminate\Support\Facades\Storage::disk(config('filesystems.default', 'public'))->delete($user->photo_path);
            } catch (\Throwable) {
                // Ignore
            }
        }

        $user->update(['photo_path' => $path]);
        $updatedUser = $user->fresh(['favoriteSports']);

        return response()->json([
            'message' => 'Avatar mis à jour avec succès.',
            'photo_path' => $path,
            'photo_url' => $updatedUser->photo_url,
            'user' => $updatedUser,
        ], 200);
    }

    /**
     * Search players by username, email, or city.
     */
    public function search(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        if (strlen($q) < 2) {
            return response()->json([], 200);
        }

        $users = User::where('id', '!=', $request->user()->id)
            ->where(function ($query) use ($q) {
                $query->where('username', 'like', "%{$q}%")
                      ->orWhere('email', 'like', "%{$q}%")
                      ->orWhere('city', 'like', "%{$q}%");
            })
            ->select('id', 'username', 'email', 'city', 'level', 'role', 'photo_path')
            ->take(20)
            ->get();

        return response()->json($users, 200);
    }
}

