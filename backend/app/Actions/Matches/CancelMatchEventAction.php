<?php

namespace App\Actions\Matches;

use App\Events\MatchLiveUpdated;
use App\Models\MatchEvent;
use App\Models\MatchPlayer;
use App\Models\SportMatch;
use Illuminate\Support\Facades\DB;

class CancelMatchEventAction
{
    public function execute(SportMatch $match, int $eventId): SportMatch
    {
        return DB::transaction(function () use ($match, $eventId) {
            $event = MatchEvent::where('match_id', $match->id)
                ->where('id', $eventId)
                ->firstOrFail();

            if ($event->is_cancelled) {
                return $match;
            }

            $event->update([
                'is_cancelled' => true,
                'cancelled_at' => now(),
            ]);

            // Reconstruct exact score from all remaining active scoring events
            $activeEvents = MatchEvent::where('match_id', $match->id)
                ->where('is_cancelled', false)
                ->get();

            $scoreA = 0;
            $scoreB = 0;
            $foulsA = 0;
            $foulsB = 0;

            foreach ($activeEvents as $ev) {
                $isScoring = in_array($ev->type, ['basket', 'goal', 'point', 'ace', 'attack_kill', 'winner'])
                    || ($ev->type === 'free_throw' && $ev->shot_result === 'made');
                if ($isScoring) {
                    $pts = $ev->points ?: 1;
                    if ($ev->team_side === 'team_a') {
                        $scoreA += $pts;
                    } else {
                        $scoreB += $pts;
                    }
                }

                if ($ev->type === 'foul' && $ev->period === $match->current_period) {
                    if ($ev->team_side === 'team_a') {
                        $foulsA++;
                    } else {
                        $foulsB++;
                    }
                }
            }

            $match->score_team_a = $scoreA;
            $match->score_team_b = $scoreB;
            $match->team_a_fouls = $foulsA;
            $match->team_b_fouls = $foulsB;
            $match->save();

            // Reverse card or foul on player if applicable
            if ($event->player_id && in_array($event->type, ['card_yellow', 'card_red', 'foul'])) {
                $playerEvents = $activeEvents->where('player_id', $event->player_id);
                $yellows = $playerEvents->where('type', 'card_yellow')->count();
                $reds = $playerEvents->where('type', 'card_red')->count();
                if ($yellows >= 2) {
                    $reds++;
                }
                $fouls = $playerEvents->where('type', 'foul')->count();

                MatchPlayer::where('match_id', $match->id)
                    ->where('user_id', $event->player_id)
                    ->update([
                        'yellow_cards' => $yellows,
                        'red_cards'    => $reds,
                        'fouls_count'  => $fouls,
                        'is_on_court'  => ($reds === 0),
                    ]);
            }

            // Reverse substitution if event was substitution
            if ($event->type === 'substitution') {
                if ($event->sub_out_player_id) {
                    MatchPlayer::where('match_id', $match->id)
                        ->where('user_id', $event->sub_out_player_id)
                        ->update(['is_on_court' => true]);
                }
                if ($event->sub_in_player_id) {
                    MatchPlayer::where('match_id', $match->id)
                        ->where('user_id', $event->sub_in_player_id)
                        ->update(['is_on_court' => false]);
                }
            }

            $match->refresh();

            // Broadcast cancellation
            event(new MatchLiveUpdated($match, $event, 'event_cancelled'));

            return $match;
        });
    }
}
