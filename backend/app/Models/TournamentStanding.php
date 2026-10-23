<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TournamentStanding extends Model
{
    protected $fillable = [
        'tournament_id',
        'team_id',
        'played',
        'wins',
        'draws',
        'losses',
        'points_for',
        'points_against',
        'points',
    ];

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}
