<?php

namespace App\Actions\Matches;

use App\Events\MatchLiveUpdated;
use App\Models\MatchEvent;
use App\Models\MatchPlayer;
use App\Models\SportMatch;
use Illuminate\Support\Facades\DB;

class NextPeriodAction
{
    public function execute(SportMatch $match, ?int $userId = null): SportMatch
    {
        return DB::transaction(function () use ($match, $userId) {
            $now = now();
            $oldPeriod = $match->current_period;

            // 1. Record period_ended event
            $endEvent = MatchEvent::create([
                'match_id'           => $match->id,
                'type'               => 'period_ended',
                'team_side'          => 'team_a',
                'period'             => $oldPeriod,
                'minute'             => max(1, (int)ceil($match->elapsed_seconds / 60)),
                'match_time_seconds' => $match->period_duration_seconds ?: 600,
                'recorded_by'        => $userId,
                'created_at'         => $now,
            ]);

            // 2. Accrue playing time for on-court players in this period
            $duration = $match->period_duration_seconds ?: 600;
            $onCourtPlayers = MatchPlayer::where('match_id', $match->id)
                ->where('is_on_court', true)
                ->get();

            foreach ($onCourtPlayers as $mp) {
                $lastIn = $mp->last_subbed_in_at ?: 0;
                $segment = max(0, $duration - $lastIn);
                $mp->update([
                    'seconds_played'    => $mp->seconds_played + $segment,
                    'last_subbed_in_at' => 0,
                ]);
            }

            // 3. Advance period & archive set score if volleyball / table tennis
            $isSetSport = \App\Services\SportRulesService::isSetSport($match->session?->sport?->slug ?? '');
            if ($isSetSport) {
                \App\Models\MatchSet::updateOrCreate(
                    ['match_id' => $match->id, 'set_number' => $oldPeriod],
                    ['score_team_a' => $match->score_team_a, 'score_team_b' => $match->score_team_b]
                );

                if ($match->score_team_a > $match->score_team_b) {
                    $match->sets_won_a = ($match->sets_won_a ?? 0) + 1;
                } elseif ($match->score_team_b > $match->score_team_a) {
                    $match->sets_won_b = ($match->sets_won_b ?? 0) + 1;
                }

                $match->score_team_a = 0;
                $match->score_team_b = 0;
            }

            $newPeriod = $oldPeriod + 1;
            $match->current_period = $newPeriod;
            if ($newPeriod > $match->total_periods) {
                $match->total_periods = $newPeriod; // Dynamic expansion for overtime!
            }
            $match->period_elapsed_seconds = 0;
            $match->team_a_fouls = 0;
            $match->team_b_fouls = 0;
            $match->period_started_at = $now;
            $match->last_resumed_at = $now;
            $match->status = 'in_progress';
            $match->paused_at = null;
            $match->save();

            // 4. Record period_started event
            $startEvent = MatchEvent::create([
                'match_id'           => $match->id,
                'type'               => 'period_started',
                'team_side'          => 'team_a',
                'period'             => $newPeriod,
                'minute'             => max(1, (int)ceil($match->elapsed_seconds / 60)),
                'match_time_seconds' => 0,
                'recorded_by'        => $userId,
                'created_at'         => $now,
            ]);

            $match->refresh();

            event(new MatchLiveUpdated($match, $startEvent, 'next_period'));

            return $match;
        });
    }
}
