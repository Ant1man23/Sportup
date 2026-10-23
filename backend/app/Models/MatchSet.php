<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MatchSet extends Model
{
    protected $fillable = [
        'match_id',
        'set_number',
        'score_team_a',
        'score_team_b',
    ];

    public function match(): BelongsTo
    {
        return $this->belongsTo(SportMatch::class, 'match_id');
    }
}
