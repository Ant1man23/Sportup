<?php

namespace App\Actions\Matches;

use App\Events\MatchLiveUpdated;
use App\Models\MatchEvent;
use App\Models\SportMatch;
use Illuminate\Support\Facades\DB;

class ResumeMatchAction
{
    public function execute(SportMatch $match, ?int $userId = null): SportMatch
    {
        return DB::transaction(function () use ($match, $userId) {
            if ($match->status === 'finished') {
                return $match;
            }

            $now = now();
            $match->status = 'in_progress';
            $match->paused_at = null;
            $match->last_resumed_at = $now;

            if (!$match->started_at) {
                $match->started_at = $now;
            }
            if (!$match->period_started_at) {
                $match->period_started_at = $now;
            }

            $match->save();

            $event = MatchEvent::create([
                'match_id'           => $match->id,
                'type'               => 'match_resumed',
                'team_side'          => 'team_a',
                'period'             => $match->current_period,
                'minute'             => max(1, (int)ceil($match->elapsed_seconds / 60)),
                'match_time_seconds' => $match->period_elapsed_seconds,
                'recorded_by'        => $userId,
                'created_at'         => $now,
            ]);

            $match->refresh();

            event(new MatchLiveUpdated($match, $event, 'resumed'));

            return $match;
        });
    }
}
