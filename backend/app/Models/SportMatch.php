<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SportMatch extends Model
{
    use HasFactory;

    protected $table = 'matches';

    protected $fillable = [
        'session_id',
        'tournament_id',
        'stage',
        'round_number',
        'team_a_id',
        'team_b_id',
        'status',
        'score_team_a',
        'score_team_b',
        'sets_won_a',
        'sets_won_b',
        'serving_side',
        'serving_player_id',
        'shot_clock_seconds',
        'target_score',
        'match_format',
        'rules_profile',
        'rules_state',
        'current_period',
        'total_periods',
        'period_duration_seconds',
        'elapsed_seconds',
        'period_started_at',
        'last_resumed_at',
        'period_elapsed_seconds',
        'team_a_fouls',
        'team_b_fouls',
        'team_a_timeouts',
        'team_b_timeouts',
        'team_a_color',
        'team_b_color',
        'team_a_logo',
        'team_b_logo',
        'started_at',
        'paused_at',
        'finished_at',
    ];

    protected $casts = [
        'score_team_a' => 'integer',
        'score_team_b' => 'integer',
        'sets_won_a' => 'integer',
        'sets_won_b' => 'integer',
        'shot_clock_seconds' => 'integer',
        'target_score' => 'integer',
        'rules_state' => 'array',
        'current_period' => 'integer',
        'total_periods' => 'integer',
        'period_duration_seconds' => 'integer',
        'elapsed_seconds' => 'integer',
        'period_elapsed_seconds' => 'integer',
        'team_a_fouls' => 'integer',
        'team_b_fouls' => 'integer',
        'team_a_timeouts' => 'integer',
        'team_b_timeouts' => 'integer',
        'period_started_at' => 'datetime',
        'last_resumed_at' => 'datetime',
        'started_at' => 'datetime',
        'paused_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    public function session()
    {
        return $this->belongsTo(SportSession::class, 'session_id');
    }

    public function tournament()
    {
        return $this->belongsTo(Tournament::class, 'tournament_id');
    }

    public function teamA()
    {
        return $this->belongsTo(Team::class, 'team_a_id');
    }

    public function teamB()
    {
        return $this->belongsTo(Team::class, 'team_b_id');
    }

    public function servingPlayer()
    {
        return $this->belongsTo(User::class, 'serving_player_id');
    }

    public function events()
    {
        return $this->hasMany(MatchEvent::class, 'match_id')->orderBy('id', 'asc');
    }

    public function activeEvents()
    {
        return $this->hasMany(MatchEvent::class, 'match_id')->where('is_cancelled', false)->orderBy('id', 'asc');
    }

    public function sets()
    {
        return $this->hasMany(MatchSet::class, 'match_id')->orderBy('set_number', 'asc');
    }

    public function matchPlayers()
    {
        return $this->hasMany(MatchPlayer::class, 'match_id');
    }

    /**
     * Compute current remaining seconds in the period
     */
    public function getRemainingPeriodSecondsAttribute(): int
    {
        $duration = $this->period_duration_seconds ?: 600;
        $elapsed = $this->period_elapsed_seconds ?: 0;

        if ($this->status === 'in_progress' && $this->last_resumed_at) {
            $diff = now()->diffInSeconds($this->last_resumed_at);
            $elapsed += $diff;
        }

        return max(0, $duration - $elapsed);
    }
}
