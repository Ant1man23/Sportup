<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Tournament;
use App\Models\TournamentStanding;
use App\Models\SportMatch;
use App\Models\Team;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TournamentController extends Controller
{
    /**
     * GET /api/v1/tournaments
     * Récupère la liste des tournois avec filtrage optionnel par discipline sportive et statut.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Tournament::with(['sport', 'organizer'])
            ->withCount('teams');

        if ($request->has('sport_id')) {
            $query->where('sport_id', $request->query('sport_id'));
        }

        if ($request->has('status') && $request->query('status') !== 'all') {
            $query->where('status', $request->query('status'));
        }

        $tournaments = $query
            ->orderByDesc('is_featured')
            ->orderBy('start_date')
            ->get()
            ->map(fn($t) => $this->format($t));

        return response()->json($tournaments, 200);
    }

    /**
     * GET /api/v1/tournaments/{id}
     * Affiche les détails complets d'un tournoi, ses équipes participantes et son classement.
     */
    public function show(int $id): JsonResponse
    {
        $tournament = Tournament::with(['sport', 'organizer', 'teams.sport', 'standings.team'])
            ->withCount('teams')
            ->findOrFail($id);

        $data = $this->format($tournament);
        $data['teams'] = $tournament->teams->map(fn($team) => [
            'id'           => $team->id,
            'name'         => $team->name,
            'initials'     => $team->initials ?? substr($team->name, 0, 2),
            'logo_path'    => $team->logo_path,
            'group_label'  => $team->pivot->group_label,
            'seed'         => $team->pivot->seed,
            'pivot_status' => $team->pivot->status,
        ]);

        return response()->json($data, 200);
    }

    /**
     * POST /api/v1/tournaments
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:120',
            'sport_id'    => 'required|exists:sports,id',
            'format'      => 'nullable|in:groups,knockout,groups_then_knockout',
            'start_date'  => 'required|date|after_or_equal:today',
            'end_date'    => 'nullable|date|after_or_equal:start_date',
            'location'    => 'nullable|string|max:120',
            'city'        => 'nullable|string|max:80',
            'max_teams'   => 'required|integer|min:2|max:64',
            'prize_pool'  => 'nullable|string|max:60',
            'description' => 'nullable|string|max:1000',
        ]);

        $tournament = Tournament::create([
            ...$validated,
            'format'       => $validated['format'] ?? 'knockout',
            'starts_on'    => $validated['start_date'],
            'organizer_id' => $request->user()->id,
        ]);

        $tournament->load(['sport', 'organizer']);

        return response()->json($this->format($tournament), 201);
    }

    /**
     * POST /api/v1/tournaments/{id}/register
     */
    public function register(int $id, Request $request): JsonResponse
    {
        $tournament = Tournament::findOrFail($id);

        if ($tournament->status !== 'open' && $tournament->status !== 'draft') {
            return response()->json(['message' => 'Les inscriptions sont closes pour ce tournoi.'], 422);
        }

        $validated = $request->validate([
            'team_id' => 'required|exists:teams,id',
        ]);

        $team = Team::findOrFail($validated['team_id']);
        if ($team->captain_id !== $request->user()->id) {
            return response()->json(['message' => 'Seul le capitaine peut inscrire l\'équipe.'], 403);
        }

        if ($tournament->teams()->where('team_id', $team->id)->exists()) {
            return response()->json(['message' => 'Cette équipe est déjà inscrite à ce tournoi.'], 409);
        }

        if ($tournament->teams()->count() >= $tournament->max_teams) {
            return response()->json(['message' => 'Le tournoi est complet.'], 422);
        }

        $tournament->teams()->attach($team->id, ['status' => 'accepted']);

        // Initialize standings row for this team
        TournamentStanding::firstOrCreate([
            'tournament_id' => $tournament->id,
            'team_id'       => $team->id,
        ]);

        // Notifier l'organisateur du tournoi
        if ($tournament->organizer_id && $tournament->organizer_id !== $request->user()->id) {
            $organizer = User::find($tournament->organizer_id);
            if ($organizer) {
                app(NotificationService::class)->sendToUser(
                    $organizer,
                    'tournament_registration',
                    'Nouvelle équipe inscrite ! 🏆',
                    "L'équipe {$team->name} s'est inscrite au tournoi {$tournament->name}.",
                    null,
                    null,
                    [
                        'tournament_id' => (string) $tournament->id,
                        'team_id'       => (string) $team->id,
                        'type'          => 'tournament_registration',
                    ]
                );
            }
        }

        // Notifier tous les membres de l'équipe
        $teamMembers = $team->members;
        if ($teamMembers->isNotEmpty()) {
            app(NotificationService::class)->sendToUsers(
                $teamMembers,
                'tournament_registration',
                'Inscription au tournoi validée ! 🏆',
                "Votre équipe {$team->name} est officiellement inscrite au tournoi {$tournament->name} !",
                null,
                null,
                [
                    'tournament_id' => (string) $tournament->id,
                    'team_id'       => (string) $team->id,
                    'type'          => 'tournament_registration',
                ]
            );
        }

        $tournament->loadCount('teams');

        return response()->json([
            'message'     => 'Équipe inscrite avec succès.',
            'teams_count' => $tournament->teams_count,
        ], 201);
    }

    /**
     * POST /api/v1/tournaments/{id}/draw
     * Organizer triggers the draw for groups or bracket creation.
     */
    public function draw(int $id, Request $request): JsonResponse
    {
        $tournament = Tournament::with('teams')->findOrFail($id);

        if ($tournament->organizer_id !== $request->user()->id) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $teams = $tournament->teams->shuffle();
        if ($teams->count() < 2) {
            return response()->json(['message' => 'Il faut au moins 2 équipes pour faire le tirage.'], 422);
        }

        DB::transaction(function () use ($tournament, $teams) {
            $format = $tournament->format;

            if ($format === 'groups' || $format === 'groups_then_knockout') {
                $groupLabels = ['A', 'B', 'C', 'D'];
                $teamIndex = 0;
                foreach ($teams as $team) {
                    $group = $groupLabels[$teamIndex % count($groupLabels)];
                    $tournament->teams()->updateExistingPivot($team->id, ['group_label' => $group]);
                    $teamIndex++;
                }
            } else {
                $seed = 1;
                foreach ($teams as $team) {
                    $tournament->teams()->updateExistingPivot($team->id, ['seed' => $seed++]);
                }
            }

            // Generate initial round of matches
            for ($i = 0; $i < $teams->count() - 1; $i += 2) {
                if (isset($teams[$i + 1])) {
                    SportMatch::create([
                        'tournament_id'          => $tournament->id,
                        'team_a_id'              => $teams[$i]->id,
                        'team_b_id'              => $teams[$i + 1]->id,
                        'stage'                  => $format === 'knockout' ? 'quarter' : 'group',
                        'round_number'           => 1,
                        'status'                 => 'pending',
                        'score_team_a'           => 0,
                        'score_team_b'           => 0,
                        'current_period'         => 1,
                        'total_periods'          => 2,
                        'period_duration_seconds'=> 1200,
                    ]);
                }
            }

            $tournament->update(['status' => 'in_progress']);

            // Notifier tous les capitaines des équipes participantes
            foreach ($teams as $participatingTeam) {
                if ($participatingTeam->captain) {
                    app(NotificationService::class)->sendToUser(
                        $participatingTeam->captain,
                        'tournament_draw',
                        'Tirage au sort effectué ! 🎯',
                        "L'arbre des matchs du tournoi {$tournament->name} est prêt. Vos adversaires sont désignés !",
                        null,
                        null,
                        [
                            'tournament_id' => (string) $tournament->id,
                            'type'          => 'tournament_draw',
                        ]
                    );
                }
            }
        });

        return response()->json(['message' => 'Tirage au sort effectué avec succès.'], 200);
    }

    /**
     * POST /api/v1/tournaments/{id}/invite-team
     * Permet à l'organisateur du tournoi d'inviter une équipe à participer.
     */
    public function inviteTeam(int $id, Request $request): JsonResponse
    {
        $tournament = Tournament::findOrFail($id);

        if ($tournament->organizer_id !== $request->user()->id) {
            return response()->json(['message' => 'Seul l\'organisateur peut inviter des équipes.'], 403);
        }

        if ($tournament->status !== 'open' && $tournament->status !== 'draft') {
            return response()->json(['message' => 'Les inscriptions sont closes pour ce tournoi.'], 422);
        }

        $validated = $request->validate([
            'team_id' => 'required|exists:teams,id',
        ]);

        $team = Team::with('captain')->findOrFail($validated['team_id']);

        if ($tournament->teams()->where('team_id', $team->id)->exists()) {
            return response()->json(['message' => 'Cette équipe est déjà inscrite ou invitée à ce tournoi.'], 409);
        }

        $tournament->teams()->attach($team->id, ['status' => 'pending']);

        // Notifier le capitaine de l'équipe
        if ($team->captain) {
            app(NotificationService::class)->sendToUser(
                $team->captain,
                'tournament_invitation',
                'Invitation à un Tournoi ! 🏆',
                "L'organisateur du tournoi {$tournament->name} a invité votre équipe {$team->name} à y participer.",
                null,
                null,
                [
                    'tournament_id' => (string) $tournament->id,
                    'team_id'       => (string) $team->id,
                    'type'          => 'tournament_invitation',
                ]
            );
        }

        return response()->json([
            'message' => "Invitation envoyée avec succès à l'équipe {$team->name}.",
        ], 200);
    }

    /**
     * GET /api/v1/tournaments/{id}/standings
     * Tableau de classement officiel des équipes du tournoi (points, victoires, différence de buts/points).
     */
    public function standings(int $id): JsonResponse
    {
        $standings = TournamentStanding::with('team')
            ->where('tournament_id', $id)
            ->orderByDesc('points')
            ->orderByDesc('points_for')
            ->get()
            ->map(fn($s) => [
                'team_id'       => $s->team_id,
                'team_name'     => $s->team ? $s->team->name : 'Équipe',
                'team_logo'     => $s->team ? $s->team->logo_url : null,
                'played'        => $s->played,
                'wins'          => $s->wins,
                'draws'         => $s->draws,
                'losses'        => $s->losses,
                'points_for'    => $s->points_for,
                'points_against'=> $s->points_against,
                'goal_diff'     => $s->points_for - $s->points_against,
                'points'        => $s->points,
            ]);

        return response()->json($standings, 200);
    }

    /**
     * GET /api/v1/tournaments/{id}/bracket
     * Arbre interactif des matchs à élimination directe (huitièmes, quarts, demies, finale).
     */
    public function bracket(int $id): JsonResponse
    {
        $matches = SportMatch::with(['teamA', 'teamB'])
            ->where('tournament_id', $id)
            ->whereIn('stage', ['round_of_16', 'quarter', 'semi', 'final', 'third_place'])
            ->orderBy('round_number')
            ->get()
            ->map(fn($m) => [
                'id'           => $m->id,
                'stage'        => $m->stage,
                'round_number' => $m->round_number,
                'status'       => $m->status,
                'score_team_a' => $m->score_team_a,
                'score_team_b' => $m->score_team_b,
                'team_a'       => $m->teamA ? ['id' => $m->teamA->id, 'name' => $m->teamA->name] : null,
                'team_b'       => $m->teamB ? ['id' => $m->teamB->id, 'name' => $m->teamB->name] : null,
            ]);

        return response()->json($matches, 200);
    }

    /**
     * GET /api/v1/tournaments/{id}/matches
     * Liste exhaustive de l'ensemble des matchs programmés et joués du tournoi.
     */
    public function matches(int $id): JsonResponse
    {
        $matches = SportMatch::with(['teamA', 'teamB'])
            ->where('tournament_id', $id)
            ->get()
            ->map(fn($m) => [
                'id'           => $m->id,
                'stage'        => $m->stage,
                'round_number' => $m->round_number,
                'status'       => $m->status,
                'score_team_a' => $m->score_team_a,
                'score_team_b' => $m->score_team_b,
                'team_a'       => $m->teamA ? ['id' => $m->teamA->id, 'name' => $m->teamA->name] : null,
                'team_b'       => $m->teamB ? ['id' => $m->teamB->id, 'name' => $m->teamB->name] : null,
            ]);

        return response()->json($matches, 200);
    }

    private function format(Tournament $t): array
    {
        $teamsCount = $t->teams_count ?? $t->teams()->count();
        return [
            'id'          => $t->id,
            'name'        => $t->name,
            'format'      => $t->format ?? 'knockout',
            'sport'       => $t->sport ? [
                'id'        => $t->sport->id,
                'name'      => $t->sport->name,
                'slug'      => $t->sport->slug,
                'color_hex' => $t->sport->color_hex ?? null,
            ] : null,
            'organizer'   => $t->organizer ? [
                'id'       => $t->organizer->id,
                'username' => $t->organizer->username,
            ] : null,
            'starts_on'   => $t->starts_on?->format('Y-m-d') ?? $t->start_date?->format('Y-m-d'),
            'start_date'  => $t->start_date?->format('Y-m-d'),
            'end_date'    => $t->end_date?->format('Y-m-d'),
            'location'    => $t->location,
            'city'        => $t->city,
            'max_teams'   => $t->max_teams,
            'teams_count' => $teamsCount,
            'prize_pool'  => $t->prize_pool,
            'status'      => $t->status,
            'is_featured' => $t->is_featured,
            'description' => $t->description,
        ];
    }
}
