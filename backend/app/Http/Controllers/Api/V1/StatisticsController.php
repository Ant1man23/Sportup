<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Users\CalculateUserBadgesAction;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserSportStatistics;
use App\Models\UserStatisticsHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StatisticsController extends Controller
{
    public function showUserStats(int $userId, Request $request, CalculateUserBadgesAction $badgeAction): JsonResponse
    {
        $user = User::findOrFail($userId);

        $query = UserSportStatistics::with('sport')->where('user_id', $user->id);

        if ($request->has('sport_id')) {
            $query->where('sport_id', $request->query('sport_id'));
        }

        $stats = $query->get();

        $totalPlayed = $stats->sum('matches_played');
        $totalWins = $stats->sum('wins');
        $totalLosses = $stats->sum('losses');
        $totalDraws = $stats->sum('draws');
        $totalGoals = $stats->sum('goals_scored');
        $totalPoints = $stats->sum('points_scored');
        $totalAssists = $stats->sum('assists');
        $totalRebounds = $stats->sum('rebounds');
        $totalBlocks = $stats->sum('blocks');
        $totalSteals = $stats->sum('steals');
        $totalMvp = $stats->sum('mvp_count');
        $winRate = $totalPlayed > 0 ? round(($totalWins / $totalPlayed) * 100, 1) : 0;

        $recentPerf = [];
        $allStats = $stats->sortByDesc('updated_at')->take(6)->values();
        foreach ($allStats as $i => $s) {
            $rate = $s->matches_played > 0
                ? round(($s->wins / $s->matches_played) * 100, 1)
                : 0;
            $result = $s->wins > $s->losses ? 'win' : ($s->losses > $s->wins ? 'loss' : 'draw');
            $recentPerf[] = [
                'match_index' => $i + 1,
                'win_rate'    => $rate,
                'result'      => $result,
            ];
        }

        return response()->json([
            'user' => [
                'id'       => $user->id,
                'username' => $user->username,
                'city'     => $user->city,
                'level'    => $user->level,
            ],
            'summary' => [
                'matches_played' => $totalPlayed,
                'wins'           => $totalWins,
                'losses'         => $totalLosses,
                'draws'          => $totalDraws,
                'win_rate'       => $winRate,
                'goals_scored'   => $totalGoals,
                'points_scored'  => $totalPoints,
                'assists'        => $totalAssists,
                'rebounds'       => $totalRebounds,
                'blocks'         => $totalBlocks,
                'steals'         => $totalSteals,
                'mvp_count'      => $totalMvp,
            ],
            'by_sport'           => $stats,
            'recent_performance' => $recentPerf,
            'gamification'       => $badgeAction->execute($user),
        ], 200);
    }

    public function history(int $userId, Request $request): JsonResponse
    {
        $user = User::findOrFail($userId);

        $query = UserStatisticsHistory::where('user_id', $user->id);

        if ($request->has('sport_id')) {
            $query->where('sport_id', $request->query('sport_id'));
        }

        $history = $query->orderBy('played_at', 'asc')->get();

        return response()->json($history, 200);
    }
}
