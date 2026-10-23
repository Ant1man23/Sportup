<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Sessions\CreateSessionAction;
use App\Actions\Sessions\JoinSessionAction;
use App\Actions\Sessions\LeaveSessionAction;
use App\Http\Controllers\Controller;
use App\Models\SportSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class SessionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = SportSession::with(['organizer', 'sport', 'participants', 'match']);

        if ($request->has('sport_id') && !empty($request->query('sport_id'))) {
            $query->where('sport_id', $request->query('sport_id'));
        }

        if ($request->has('level') && $request->query('level') !== 'all') {
            $query->where('level', $request->query('level'));
        }

        if ($request->has('type') && !empty($request->query('type'))) {
            $query->where('type', $request->query('type'));
        }

        if ($request->has('competition_type') && !empty($request->query('competition_type'))) {
            $query->where('competition_type', $request->query('competition_type'));
        }

        if ($request->has('participation_mode') && !empty($request->query('participation_mode'))) {
            $query->where('participation_mode', $request->query('participation_mode'));
        }

        if ($request->has('spectator_access') && !empty($request->query('spectator_access'))) {
            $query->where('spectator_access', $request->query('spectator_access'));
        }

        if ($request->has('from_date')) {
            $query->whereDate('session_date', '>=', $request->query('from_date'));
        }

        if ($request->has('to_date')) {
            $query->whereDate('session_date', '<=', $request->query('to_date'));
        }

        if ($request->has('status') && $request->query('status') !== 'all') {
            $query->where('status', $request->query('status'));
        } elseif (!$request->has('status')) {
            $query->whereIn('status', ['open', 'full', 'in_progress', 'scheduled']);
        }

        // Bounding Box search (viewport rectangle from Google Maps)
        if ($request->has(['north', 'south', 'east', 'west'])) {
            $north = (float) $request->query('north');
            $south = (float) $request->query('south');
            $east = (float) $request->query('east');
            $west = (float) $request->query('west');

            $minLat = min($north, $south);
            $maxLat = max($north, $south);
            $minLng = min($east, $west);
            $maxLng = max($east, $west);

            $query->whereNotNull('latitude')
                  ->whereNotNull('longitude')
                  ->whereBetween('latitude', [$minLat, $maxLat])
                  ->whereBetween('longitude', [$minLng, $maxLng]);
        }

        $hasCoordinates = $request->has(['lat', 'lng']) && is_numeric($request->query('lat')) && is_numeric($request->query('lng'));
        $hasCity = $request->has('city') && trim($request->query('city')) !== '';
        $cityName = $hasCity ? trim($request->query('city')) : null;

        if ($hasCoordinates) {
            $lat = (float) $request->query('lat');
            $lng = (float) $request->query('lng');
            $radiusKm = (float) $request->query('radius', 35);

            if (DB::connection()->getDriverName() === 'sqlite') {
                $allSessions = $query->orderBy('session_date', 'asc')->orderBy('start_time', 'asc')->get();

                $filtered = $allSessions->map(function ($s) use ($lat, $lng) {
                    if ($s->latitude !== null && $s->longitude !== null) {
                        $earthRadius = 6371; // km
                        $dLat = deg2rad($s->latitude - $lat);
                        $dLng = deg2rad($s->longitude - $lng);
                        $a = sin($dLat / 2) * sin($dLat / 2) +
                             cos(deg2rad($lat)) * cos(deg2rad($s->latitude)) *
                             sin($dLng / 2) * sin($dLng / 2);
                        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
                        $s->distance_km = round($earthRadius * $c, 2);
                    } else {
                        $s->distance_km = null;
                    }
                    return $s;
                })->filter(function ($s) use ($radiusKm, $hasCity, $cityName) {
                    $inRadius = $s->distance_km !== null && $s->distance_km <= $radiusKm;
                    $matchesCity = $hasCity && (
                        stripos((string) $s->city, $cityName) !== false ||
                        stripos((string) $s->address, $cityName) !== false ||
                        stripos((string) $s->region, $cityName) !== false
                    );
                    return $inRadius || $matchesCity;
                })->sortBy(function ($s) {
                    return $s->distance_km ?? 99999;
                })->values();

                if ($request->boolean('all') || (int) $request->query('per_page') > 100) {
                    return response()->json([
                        'data' => $filtered,
                        'total' => $filtered->count(),
                    ], 200);
                }

                $page = (int) $request->query('page', 1);
                $perPage = (int) $request->query('per_page', 25);
                $paginated = new LengthAwarePaginator(
                    $filtered->forPage($page, $perPage)->values(),
                    $filtered->count(),
                    $perPage,
                    $page,
                    ['path' => $request->url(), 'query' => $request->query()]
                );

                return response()->json($paginated, 200);
            } else {
                // MySQL driver with safe point handling
                $query->select('sport_sessions.*')
                    ->selectRaw(
                        'CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN (ST_Distance_Sphere(point(longitude, latitude), point(?, ?)) / 1000) ELSE NULL END AS distance_km',
                        [$lng, $lat]
                    );

                if ($hasCity) {
                    // Match either within radius or matching the city name
                    $query->where(function ($q) use ($cityName, $lng, $lat, $radiusKm) {
                        $q->where('city', 'like', '%' . $cityName . '%')
                          ->orWhere('address', 'like', '%' . $cityName . '%')
                          ->orWhere('region', 'like', '%' . $cityName . '%')
                          ->orWhereRaw('(latitude IS NOT NULL AND longitude IS NOT NULL AND (ST_Distance_Sphere(point(longitude, latitude), point(?, ?)) / 1000) <= ?)', [$lng, $lat, $radiusKm]);
                    });
                } else {
                    $query->having('distance_km', '<=', $radiusKm);
                }

                $query->orderByRaw('distance_km IS NULL, distance_km ASC')
                      ->orderBy('session_date', 'asc')
                      ->orderBy('start_time', 'asc');
            }
        } elseif ($hasCity) {
            $query->where(function ($q) use ($cityName) {
                $q->where('city', 'like', '%' . $cityName . '%')
                  ->orWhere('address', 'like', '%' . $cityName . '%')
                  ->orWhere('region', 'like', '%' . $cityName . '%');
            })->orderBy('session_date', 'asc')->orderBy('start_time', 'asc');
        } else {
            $query->orderBy('session_date', 'asc')->orderBy('start_time', 'asc');
        }

        if ($request->boolean('all') || (int) $request->query('per_page') > 100) {
            $limit = min((int) $request->query('per_page', 150), 200);
            $items = $query->take($limit)->get();
            return response()->json([
                'data' => $items,
                'total' => $items->count(),
            ], 200);
        }

        $perPage = min((int) $request->query('per_page', 25), 100);
        $sessions = $query->paginate($perPage);

        return response()->json($sessions, 200);
    }

    public function show(int $id): JsonResponse
    {
        $session = SportSession::with(['organizer', 'sport', 'participants', 'match.events'])->findOrFail($id);

        return response()->json($session, 200);
    }

    public function store(Request $request, CreateSessionAction $action): JsonResponse
    {
        $validated = $request->validate([
            'sport_id' => 'required|exists:sports,id',
            'type' => 'nullable|in:find_players,find_opponent,free_match',
            'competition_type' => 'nullable|in:friendly,corporate,tournament,championship,school_university,official,community',
            'participation_mode' => 'nullable|in:open,invitation,teams_assigned,approval_required',
            'spectator_access' => 'nullable|in:free,paid,private,online_only',
            'referee_id' => 'nullable|exists:users,id',
            'format' => 'required|string|max:20',
            'session_date' => 'required|date|after_or_equal:today',
            'registration_deadline' => 'nullable|date',
            'start_time' => 'required',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'address' => 'nullable|string|max:255',
            'location_details' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:100',
            'level' => 'nullable|in:beginner,intermediate,advanced,all',
            'max_participants' => 'required|integer|min:2|max:30',
            'description' => 'nullable|string|max:500',
        ]);

        $session = $action->execute($request->user(), $validated);

        return response()->json($session, 201);
    }

    public function join(Request $request, int $id, JoinSessionAction $action): JsonResponse
    {
        $session = $action->execute($request->user(), $id);

        return response()->json($session, 200);
    }

    public function leave(Request $request, int $id, LeaveSessionAction $action): JsonResponse
    {
        $session = $action->execute($request->user(), $id);

        return response()->json($session, 200);
    }

    public function calendar(Request $request): JsonResponse
    {
        $query = SportSession::with(['organizer', 'sport', 'participants', 'match'])
            ->whereNotIn('status', ['cancelled']);

        if ($request->has('sport_id')) {
            $query->where('sport_id', $request->query('sport_id'));
        }

        if ($request->has('competition_type')) {
            $query->where('competition_type', $request->query('competition_type'));
        }

        if ($request->has('month')) {
            $month = $request->query('month');
            $query->where('session_date', 'like', "{$month}%");
        } elseif ($request->has(['from_date', 'to_date'])) {
            $query->whereBetween('session_date', [$request->query('from_date'), $request->query('to_date')]);
        } else {
            $query->where('session_date', '>=', now()->toDateString())
                ->where('session_date', '<=', now()->addDays(45)->toDateString());
        }

        $sessions = $query->orderBy('session_date', 'asc')
            ->orderBy('start_time', 'asc')
            ->get();

        return response()->json($sessions, 200);
    }

    /**
     * POST /api/v1/sessions/{id}/invite
     * Invite a player to a session.
     */
    public function invitePlayer(int $id, Request $request): JsonResponse
    {
        $session = SportSession::with(['organizer', 'sport', 'participants'])->findOrFail($id);

        $validated = $request->validate([
            'user_id'  => 'nullable|exists:users,id',
            'username' => 'nullable|string',
            'email'    => 'nullable|email',
        ]);

        $userId = $validated['user_id'] ?? null;
        if (!$userId && !empty($validated['username'])) {
            $found = \App\Models\User::where('username', $validated['username'])->first();
            $userId = $found?->id;
        }
        if (!$userId && !empty($validated['email'])) {
            $found = \App\Models\User::where('email', $validated['email'])->first();
            $userId = $found?->id;
        }

        if (!$userId) {
            return response()->json(['message' => 'Joueur introuvable.'], 404);
        }

        if ($session->participants->contains('id', $userId)) {
            return response()->json(['message' => 'Ce joueur participe déjà à cette session.'], 409);
        }

        $targetUser = \App\Models\User::find($userId);
        if ($targetUser) {
            app(\App\Services\NotificationService::class)->sendToUser(
                $targetUser,
                'session_invitation',
                'Invitation à une rencontre sportive',
                "{$request->user()->username} vous invite à rejoindre le match de {$session->sport->name} ({$session->city}) le {$session->session_date}.",
                $session->id,
                null,
                ['session_id' => (string) $session->id]
            );
        }

        return response()->json([
            'message' => "Invitation envoyée à {$targetUser->username} avec succès.",
            'user'    => $targetUser->only(['id', 'username', 'email']),
        ], 200);
    }
}
