<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MatchEvent extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'match_id',
        'type',
        'team_side',
        'player_id',
        'points',
        'minute',
        'shot_type',
        'shot_result',
        'rebound_type',
        'foul_type',
        'sub_in_player_id',
        'sub_out_player_id',
        'related_player_id',
        'period',
        'set_number',
        'match_time_seconds',
        'recorded_by',
        'is_cancelled',
        'cancelled_at',
        'idempotency_key',
        'metadata',
        'action_detail',
        'created_at',
    ];

    protected $casts = [
        'points' => 'integer',
        'minute' => 'integer',
        'period' => 'integer',
        'set_number' => 'integer',
        'match_time_seconds' => 'integer',
        'is_cancelled' => 'boolean',
        'cancelled_at' => 'datetime',
        'created_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function match()
    {
        return $this->belongsTo(SportMatch::class, 'match_id');
    }

    public function player()
    {
        return $this->belongsTo(User::class, 'player_id');
    }

    public function subInPlayer()
    {
        return $this->belongsTo(User::class, 'sub_in_player_id');
    }

    public function subOutPlayer()
    {
        return $this->belongsTo(User::class, 'sub_out_player_id');
    }

    public function relatedPlayer()
    {
        return $this->belongsTo(User::class, 'related_player_id');
    }

    public function recorder()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
