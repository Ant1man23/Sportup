<?php

namespace App\Events;

use App\Actions\Matches\CalculateMatchStatisticsAction;
use App\Models\MatchEvent;
use App\Models\SportMatch;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MatchLiveUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public SportMatch $match;
    public ?MatchEvent $event;
    public string $actionType;

    public function __construct(SportMatch $match, ?MatchEvent $event = null, string $actionType = 'update')
    {
        $this->match = $match;
        $this->event = $event;
        $this->actionType = $actionType;
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('match.' . $this->match->id),
            new PrivateChannel('match.' . $this->match->id . '.organizer'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'MatchLiveUpdated';
    }

    public function broadcastWith(): array
    {
        $calcAction = app(CalculateMatchStatisticsAction::class);
        $stats = $calcAction->execute($this->match);

        $teamAName = $this->match->team_a_name ?? $this->match->session?->team_a?->name ?? 'Équipe A';
        $teamBName = $this->match->team_b_name ?? $this->match->session?->team_b?->name ?? 'Équipe B';

        return [
            'match_id' => $this->match->id,
            'action_type' => $this->actionType,
            'status' => $this->match->status,
            'score_team_a' => $this->match->score_team_a,
            'score_team_b' => $this->match->score_team_b,
            'current_period' => $this->match->current_period,
            'total_periods' => $this->match->total_periods,
            'period_duration_seconds' => $this->match->period_duration_seconds,
            'period_elapsed_seconds' => $this->match->period_elapsed_seconds,
            'remaining_period_seconds' => $this->match->remaining_period_seconds,
            'is_paused' => $this->match->status === 'paused',
            'last_resumed_at' => $this->match->last_resumed_at?->toIso8601String(),
            'server_timestamp' => now()->toIso8601String(),
            'team_a' => [
                'name' => $teamAName,
                'logo' => $this->match->team_a_logo,
                'color' => $this->match->team_a_color ?? '#1456D9',
                'score' => $this->match->score_team_a,
                'fouls' => $this->match->team_a_fouls,
                'timeouts' => $this->match->team_a_timeouts,
            ],
            'team_b' => [
                'name' => $teamBName,
                'logo' => $this->match->team_b_logo,
                'color' => $this->match->team_b_color ?? '#F28B2E',
                'score' => $this->match->score_team_b,
                'fouls' => $this->match->team_b_fouls,
                'timeouts' => $this->match->team_b_timeouts,
            ],
            'collective_stats' => $stats['collective'],
            'period_scores' => $stats['period_scores'],
            'last_event' => $this->event ? [
                'id' => $this->event->id,
                'type' => $this->event->type,
                'team_side' => $this->event->team_side,
                'player_id' => $this->event->player_id,
                'player_name' => $this->event->player?->username,
                'points' => $this->event->points,
                'minute' => $this->event->minute,
                'match_time_seconds' => $this->event->match_time_seconds,
                'period' => $this->event->period,
                'created_at' => $this->event->created_at?->toIso8601String(),
            ] : null,
        ];
    }
}
