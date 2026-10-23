<?php

namespace App\Actions\Matches;

use App\Events\MatchLiveUpdated;
use App\Models\MatchEvent;
use App\Models\SportMatch;
use Illuminate\Support\Facades\DB;

class PauseMatchAction
{
    public function execute(SportMatch $match, ?int $userId = null): SportMatch
    {
        return DB::transaction(function () use ($match, $userId) {
            if ($match->status !== 'in_progress') {
                return $match;
            }

            $now = now();
            if ($match->last_resumed_at) {
                $diff = max(0, (int) round(abs($now->diffInSeconds($match->last_resumed_at))));
                $match->period_elapsed_seconds = max(0, (int) $match->period_elapsed_seconds + $diff);
                $match->elapsed_seconds = max(0, (int) $match->elapsed_seconds + $diff);
            }

            $match->status = 'paused';
            $match->paused_at = $now;
            $match->last_resumed_at = null;
            $match->save();

            $event = MatchEvent::create([
                'match_id'           => $match->id,
                'type'               => 'match_paused',
                'team_side'          => 'team_a',
                'period'             => $match->current_period,
                'minute'             => max(1, (int)ceil($match->elapsed_seconds / 60)),
                'match_time_seconds' => $match->period_elapsed_seconds,
                'recorded_by'        => $userId,
                'created_at'         => $now,
            ]);

            $match->refresh();

            event(new MatchLiveUpdated($match, $event, 'paused'));

            return $match;
        });
    }
}
