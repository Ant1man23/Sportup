<?php

namespace App\Actions\Matches;

use App\Models\SportMatch;
use App\Models\SportSession;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class StartMatchAction
{
    public function execute(SportSession $session, array $data): SportMatch
    {
        return DB::transaction(function () use ($session, $data) {
            if ($session->match()->exists()) {
                return $session->match->load(['session', 'events']);
            }

            $sportSlug = $session->sport?->slug;
            $defaults = \App\Services\SportRulesService::getDefaultConfig($sportSlug);

            $match = SportMatch::create([
                'session_id' => $session->id,
                'status' => 'in_progress',
                'score_team_a' => 0,
                'score_team_b' => 0,
                'current_period' => 1,
                'total_periods' => $data['total_periods'] ?? $defaults['total_periods'],
                'period_duration_seconds' => $data['period_duration_seconds'] ?? $defaults['period_duration_seconds'],
                'target_score' => $defaults['target_score'] ?? null,
                'shot_clock_seconds' => $defaults['shot_clock_seconds'] ?? null,
                'rules_profile' => $defaults['rules_profile'] ?? null,
                'elapsed_seconds' => 0,
                'started_at' => now(),
                'period_started_at' => now(),
                'last_resumed_at' => now(),
            ]);

            $session->update(['status' => 'in_progress']);

            return $match->load(['session.sport', 'session.organizer', 'events']);
        });
    }
}
