<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserStatisticsHistory extends Model
{
    protected $table = 'user_statistics_history';

    protected $fillable = [
        'user_id',
        'sport_id',
        'match_id',
        'stats_json',
        'played_at',
    ];

    protected $casts = [
        'stats_json' => 'array',
        'played_at'  => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sport(): BelongsTo
    {
        return $this->belongsTo(Sport::class);
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(SportMatch::class, 'match_id');
    }
}
