<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Matches\AddMatchEventAction;
use App\Actions\Matches\CalculateMatchStatisticsAction;
use App\Actions\Matches\CancelMatchEventAction;
use App\Actions\Matches\FinishMatchAction;
use App\Actions\Matches\NextPeriodAction;
use App\Actions\Matches\PauseMatchAction;
use App\Actions\Matches\ResumeMatchAction;
use App\Actions\Matches\StartMatchAction;
use App\Http\Controllers\Controller;
use App\Models\MatchPlayer;
use App\Models\SportMatch;
use App\Models\SportSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MatchController extends Controller
{
    /**
     * Get full match details
     */
    public function show(int $id): JsonResponse
    {
        $match = SportMatch::with([
            'session.organizer',
            'session.sport',
            'session.participants',
            'events.player',
            'events.subInPlayer',
            'events.subOutPlayer',
            'events.relatedPlayer',
            'matchPlayers.user',
        ])
        ->where('id', $id)
        ->orWhere('session_id', $id)
        ->first();

        if (!$match) {
            $session = SportSession::with('sport')->find($id);
            if ($session) {
                $sportSlug = $session->sport?->slug;
                $defaults = \App\Services\SportRulesService::getDefaultConfig($sportSlug);

                $match = SportMatch::create([
                    'session_id' => $session->id,
                    'status' => 'in_progress',
                    'score_team_a' => 0,
                    'score_team_b' => 0,
                    'current_period' => 1,
                    'total_periods' => $defaults['total_periods'],
                    'period_duration_seconds' => $defaults['period_duration_seconds'],
                    'target_score' => $defaults['target_score'] ?? null,
                    'shot_clock_seconds' => $defaults['shot_clock_seconds'] ?? null,
                    'rules_profile' => $defaults['rules_profile'] ?? null,
                    'elapsed_seconds' => 0,
                    'period_elapsed_seconds' => 0,
                    'started_at' => now(),
                    'period_started_at' => now(),
                    'last_resumed_at' => now(),
                ]);
                $session->update(['status' => 'in_progress']);
                $match->load([
                    'session.organizer',
                    'session.sport',
                    'session.participants',
                    'events.player',
                    'events.subInPlayer',
                    'events.subOutPlayer',
                    'events.relatedPlayer',
                    'matchPlayers.user',
                ]);
            }
        }

        if (!$match) {
            return response()->json(['message' => 'Match introuvable.'], 404);
        }

        // Auto-seed match players if empty
        if ($match->matchPlayers->isEmpty() && $match->session) {
            $participants = $match->session->participants ?? collect();
            $knownSides = [];
            foreach ($match->events as $ev) {
                if ($ev->player_id && !isset($knownSides[$ev->player_id])) {
                    $knownSides[$ev->player_id] = $ev->team_side;
                }
            }
            foreach ($participants as $idx => $p) {
                $side = $knownSides[$p->id] ?? (($idx % 2 === 0) ? 'team_a' : 'team_b');
                $match->matchPlayers()->create([
                    'user_id' => $p->id,
                    'team_side' => $side,
                    'jersey_number' => $idx + 1,
                    'is_starter' => true,
                    'is_on_court' => true,
                    'seconds_played' => 0,
                ]);
            }
            $match->load('matchPlayers.user');
        }

        $teamAPlayers = [];
        $teamBPlayers = [];
        foreach ($match->matchPlayers as $mp) {
            $pData = [
                'id' => $mp->user_id,
                'username' => $mp->user->username ?? 'Joueur',
                'jersey_number' => $mp->jersey_number,
                'position' => $mp->position,
                'is_starter' => (bool)$mp->is_starter,
                'is_on_court' => (bool)$mp->is_on_court,
                'seconds_played' => (int)$mp->seconds_played,
            ];
            if ($mp->team_side === 'team_a') {
                $teamAPlayers[] = $pData;
            } else {
                $teamBPlayers[] = $pData;
            }
        }

        $matchData = $match->toArray();
        $matchData['team_a_players'] = $teamAPlayers;
        $matchData['team_b_players'] = $teamBPlayers;
        $matchData['team_a_name'] = $match->team_a_name ?: ($match->session?->team_a?->name ?: 'Équipe A');
        $matchData['team_b_name'] = $match->team_b_name ?: ($match->session?->team_b?->name ?: 'Équipe B');
        $matchData['remaining_period_seconds'] = $match->remaining_period_seconds;

        // Add set score data if it's a set-based sport
        $sportSlug = $match->session?->sport?->slug ?? '';
        if (\App\Services\SportRulesService::isSetSport($sportSlug)) {
            $sets = \App\Models\MatchSet::where('match_id', $match->id)
                ->orderBy('set_number')
                ->get();

            $setsWonA = 0;
            $setsWonB = 0;
            $setScores = [];

            foreach ($sets as $set) {
                $setScores[] = [
                    'setNumber' => $set->set_number,
                    'scoreA'    => $set->score_team_a,
                    'scoreB'    => $set->score_team_b,
                ];
                if ($set->score_team_a > $set->score_team_b) {
                    $setsWonA++;
                } elseif ($set->score_team_b > $set->score_team_a) {
                    $setsWonB++;
                }
            }

            $matchData['sets_won_a'] = $setsWonA;
            $matchData['sets_won_b'] = $setsWonB;
            $matchData['set_scores'] = $setScores;
        }

        return response()->json($matchData, 200);
    }

    /**
     * Ultra-fast synchronized live state for real-time scoreboard & spectator polling fallback
     */
    public function live(int $id, CalculateMatchStatisticsAction $calcAction): JsonResponse
    {
        $match = SportMatch::with(['session.sport', 'session.organizer'])->findOrFail($id);
        $stats = $calcAction->execute($match);

        $teamAName = $match->team_a_name ?: ($match->session?->team_a?->name ?: 'Équipe A');
        $teamBName = $match->team_b_name ?: ($match->session?->team_b?->name ?: 'Équipe B');

        $lastEvent = $match->events()->where('is_cancelled', false)->latest('id')->first();

        return response()->json([
            'match_id' => $match->id,
            'status' => $match->status,
            'score_team_a' => $match->score_team_a,
            'score_team_b' => $match->score_team_b,
            'current_period' => $match->current_period,
            'total_periods' => $match->total_periods,
            'period_duration_seconds' => $match->period_duration_seconds,
            'period_elapsed_seconds' => $match->period_elapsed_seconds,
            'remaining_period_seconds' => $match->remaining_period_seconds,
            'is_paused' => $match->status === 'paused',
            'last_resumed_at' => $match->last_resumed_at?->toIso8601String(),
            'server_timestamp' => now()->toIso8601String(),
            'team_a' => [
                'name' => $teamAName,
                'logo' => $match->team_a_logo,
                'color' => $match->team_a_color ?: '#1456D9',
                'score' => $match->score_team_a,
                'fouls' => $match->team_a_fouls,
                'timeouts' => $match->team_a_timeouts,
            ],
            'team_b' => [
                'name' => $teamBName,
                'logo' => $match->team_b_logo,
                'color' => $match->team_b_color ?: '#F28B2E',
                'score' => $match->score_team_b,
                'fouls' => $match->team_b_fouls,
                'timeouts' => $match->team_b_timeouts,
            ],
            'collective_stats' => $stats['collective'],
            'period_scores' => $stats['period_scores'],
            'sets_won_a' => $match->sets_won_a ?? 0,
            'sets_won_b' => $match->sets_won_b ?? 0,
            'set_scores' => \App\Services\SportRulesService::isSetSport($match->session?->sport?->slug ?? '')
                ? \App\Models\MatchSet::where('match_id', $match->id)->orderBy('set_number')->get()->map(fn($s) => [
                    'setNumber' => $s->set_number,
                    'scoreA' => $s->score_team_a,
                    'scoreB' => $s->score_team_b,
                ])->toArray()
                : [],
            'last_event' => $lastEvent ? [
                'id' => $lastEvent->id,
                'type' => $lastEvent->type,
                'team_side' => $lastEvent->team_side,
                'player_id' => $lastEvent->player_id,
                'points' => $lastEvent->points,
                'minute' => $lastEvent->minute,
                'period' => $lastEvent->period,
                'created_at' => $lastEvent->created_at?->toIso8601String(),
            ] : null,
        ], 200);
    }

    /**
     * Get detailed collective and individual basketball statistics
     */
    public function statistics(int $id, CalculateMatchStatisticsAction $calcAction): JsonResponse
    {
        $match = SportMatch::findOrFail($id);
        $stats = $calcAction->execute($match);

        return response()->json($stats, 200);
    }

    /**
     * Start the match (Organizer only)
     */
    public function start(int $sessionId, Request $request, StartMatchAction $action): JsonResponse
    {
        $session = SportSession::findOrFail($sessionId);
        $user = $request->user();
        $isOrganizer = $session->organizer_id === $user->id;
        $isReferee = $session->referee_id && $session->referee_id === $user->id;

        if (!$isOrganizer && !$isReferee && !$user->isAdmin()) {
            return response()->json(['message' => 'Seul l\'organisateur ou l\'arbitre désigné peut démarrer le match.'], 403);
        }

        $validated = $request->validate([
            'total_periods' => 'nullable|integer|min:1|max:6',
            'period_duration_seconds' => 'nullable|integer|min:60|max:5400',
        ]);

        $match = $action->execute($session, $validated);

        return response()->json($match, 201);
    }

    /**
     * Pause match timer (Organizer only)
     */
    public function pause(int $matchId, Request $request, PauseMatchAction $action): JsonResponse
    {
        $match = SportMatch::findOrFail($matchId);
        $this->authorizeOrganizer($match, $request);

        $updatedMatch = $action->execute($match, $request->user()->id);

        return response()->json($updatedMatch, 200);
    }

    /**
     * Resume match timer (Organizer only)
     */
    public function resume(int $matchId, Request $request, ResumeMatchAction $action): JsonResponse
    {
        $match = SportMatch::findOrFail($matchId);
        $this->authorizeOrganizer($match, $request);

        $updatedMatch = $action->execute($match, $request->user()->id);

        return response()->json($updatedMatch, 200);
    }

    /**
     * Advance to next period (Organizer only)
     */
    public function nextPeriod(int $matchId, Request $request, NextPeriodAction $action): JsonResponse
    {
        $match = SportMatch::findOrFail($matchId);
        $this->authorizeOrganizer($match, $request);

        $updatedMatch = $action->execute($match, $request->user()->id);

        return response()->json($updatedMatch, 200);
    }

    /**
     * Record a match event (Organizer only)
     */
    public function addEvent(int $matchId, Request $request, AddMatchEventAction $action): JsonResponse
    {
        $match = SportMatch::findOrFail($matchId);
        $this->authorizeOrganizer($match, $request);

        $validated = $request->validate([
            'type'               => 'required|string|max:32',
            'team_side'          => 'required|in:team_a,team_b',
            'player_id'          => 'nullable|exists:users,id',
            'sub_in_player_id'   => 'nullable|exists:users,id',
            'sub_out_player_id'  => 'nullable|exists:users,id',
            'related_player_id'  => 'nullable|exists:users,id',
            'points'             => 'nullable|integer|min:0|max:10',
            'shot_type'          => 'nullable|string|max:32',
            'shot_result'        => 'nullable|string|max:32',
            'rebound_type'       => 'nullable|string|max:32',
            'foul_type'          => 'nullable|string|max:32',
            'period'             => 'nullable|integer|min:1|max:10',
            'minute'             => 'nullable|integer|min:0|max:200',
            'match_time_seconds' => 'nullable|integer|min:0|max:3600',
            'idempotency_key'    => 'nullable|string|max:64',
            'metadata'           => 'nullable|array',
        ]);

        $event = $action->execute($match, $validated, $request->user()->id);

        return response()->json($event, 201);
    }

    /**
     * Cancel or undo an event (Organizer only)
     */
    public function cancelEvent(int $matchId, int $eventId, Request $request, CancelMatchEventAction $action): JsonResponse
    {
        $match = SportMatch::findOrFail($matchId);
        $this->authorizeOrganizer($match, $request);

        $updatedMatch = $action->execute($match, $eventId);

        // Load events with player info so the frontend can update the play-by-play list
        $updatedMatch->load([
            'events.player',
            'events.subInPlayer',
            'events.subOutPlayer',
            'events.relatedPlayer',
            'matchPlayers.user',
        ]);

        $matchData = $updatedMatch->toArray();

        // Rebuild flat team players arrays
        $teamAPlayers = [];
        $teamBPlayers = [];
        foreach ($updatedMatch->matchPlayers as $mp) {
            $pData = [
                'id'             => $mp->user_id,
                'username'       => $mp->user->username ?? 'Joueur',
                'jersey_number'  => $mp->jersey_number,
                'position'       => $mp->position,
                'is_starter'     => (bool)$mp->is_starter,
                'is_on_court'    => (bool)$mp->is_on_court,
                'seconds_played' => (int)$mp->seconds_played,
            ];
            if ($mp->team_side === 'team_a') {
                $teamAPlayers[] = $pData;
            } else {
                $teamBPlayers[] = $pData;
            }
        }
        $matchData['team_a_players'] = $teamAPlayers;
        $matchData['team_b_players'] = $teamBPlayers;
        $matchData['team_a_name']    = $updatedMatch->team_a_name ?: ($updatedMatch->session?->team_a?->name ?: 'Équipe A');
        $matchData['team_b_name']    = $updatedMatch->team_b_name ?: ($updatedMatch->session?->team_b?->name ?: 'Équipe B');

        // Append set scores for set-based sports
        $sportSlug = $updatedMatch->session?->sport?->slug ?? '';
        if (\App\Services\SportRulesService::isSetSport($sportSlug)) {
            $sets = \App\Models\MatchSet::where('match_id', $updatedMatch->id)->orderBy('set_number')->get();
            $matchData['set_scores'] = $sets->map(fn($s) => [
                'setNumber' => $s->set_number,
                'scoreA'    => $s->score_team_a,
                'scoreB'    => $s->score_team_b,
            ])->toArray();
            $matchData['sets_won_a'] = $updatedMatch->sets_won_a ?? 0;
            $matchData['sets_won_b'] = $updatedMatch->sets_won_b ?? 0;
        }

        return response()->json([
            'message' => 'Événement annulé avec succès.',
            'match'   => $matchData,
        ], 200);
    }

    /**
     * Finish match (Organizer only)
     */
    public function finish(int $matchId, Request $request, FinishMatchAction $action): JsonResponse
    {
        $match = SportMatch::findOrFail($matchId);
        $this->authorizeOrganizer($match, $request);

        $finishedMatch = $action->execute($match, $request->user()->id);

        return response()->json($finishedMatch, 200);
    }

    /**
     * Update match players roster / jersey numbers (Organizer only)
     */
    public function updatePlayers(int $matchId, Request $request): JsonResponse
    {
        $match = SportMatch::findOrFail($matchId);
        $this->authorizeOrganizer($match, $request);

        $validated = $request->validate([
            'players' => 'required|array',
            'players.*.user_id' => 'required|exists:users,id',
            'players.*.team_side' => 'required|in:team_a,team_b',
            'players.*.jersey_number' => 'nullable|integer|min:0|max:99',
            'players.*.position' => 'nullable|string|max:30',
            'players.*.is_starter' => 'nullable|boolean',
            'players.*.is_on_court' => 'nullable|boolean',
        ]);

        foreach ($validated['players'] as $p) {
            MatchPlayer::updateOrCreate(
                ['match_id' => $match->id, 'user_id' => $p['user_id']],
                [
                    'team_side' => $p['team_side'],
                    'jersey_number' => $p['jersey_number'] ?? null,
                    'position' => $p['position'] ?? null,
                    'is_starter' => $p['is_starter'] ?? true,
                    'is_on_court' => $p['is_on_court'] ?? true,
                ]
            );
        }

        return response()->json(['message' => 'Compositions mises à jour.'], 200);
    }

    /**
     * GET /api/v1/matches/{id}/sheet
     * Official printable match sheet (HTML5 / PDF print view or JSON data)
     */
    public function matchSheet(Request $request, int $id, CalculateMatchStatisticsAction $calcAction)
    {
        $match = SportMatch::with([
            'session.sport',
            'session.organizer',
            'matchPlayers.user',
            'events',
        ])->findOrFail($id);

        $stats = $calcAction->execute($match);

        $sportName = $match->session?->sport?->name ?? 'Discipline sportive';
        $sportSlug = $match->session?->sport?->slug ?? 'basketball';
        $isSetSport = \App\Services\SportRulesService::isSetSport($sportSlug);

        $teamAName = $match->team_a_name ?: ($match->session?->team_a?->name ?: 'Équipe A');
        $teamBName = $match->team_b_name ?: ($match->session?->team_b?->name ?: 'Équipe B');

        $sets = [];
        if ($isSetSport) {
            $sets = \App\Models\MatchSet::where('match_id', $match->id)->orderBy('set_number')->get();
        }

        if ($request->query('format') === 'json' || $request->wantsJson()) {
            return response()->json([
                'match' => $match,
                'stats' => $stats,
                'sets'  => $sets,
            ], 200);
        }

        $html = view('matches.sheet', compact(
            'match',
            'stats',
            'sets',
            'sportName',
            'sportSlug',
            'isSetSport',
            'teamAName',
            'teamBName'
        ))->render();

        return response($html, 200)->header('Content-Type', 'text/html; charset=UTF-8');
    }

    private function authorizeOrganizer(SportMatch $match, Request $request): void
    {
        $user = $request->user();
        if ($user && $user->isAdmin()) {
            return;
        }

        $session = $match->session;
        $isOrganizer = $session && $session->organizer_id === $user->id;
        $isReferee = $session && $session->referee_id && $session->referee_id === $user->id;

        if (!$isOrganizer && !$isReferee) {
            abort(403, 'Seul l\'organisateur ou l\'arbitre officiel désigné peut contrôler le score de ce match.');
        }
    }
}
