<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MatchPlayer extends Model
{
    use HasFactory;

    protected $table = 'match_players';

    protected $fillable = [
        'match_id',
        'user_id',
        'team_side',
        'jersey_number',
        'position',
        'rotation_position',
        'is_libero',
        'fouls_count',
        'yellow_cards',
        'red_cards',
        'is_starter',
        'is_on_court',
        'seconds_played',
        'last_subbed_in_at',
    ];

    protected $casts = [
        'jersey_number' => 'integer',
        'rotation_position' => 'integer',
        'is_libero' => 'boolean',
        'fouls_count' => 'integer',
        'yellow_cards' => 'integer',
        'red_cards' => 'integer',
        'is_starter' => 'boolean',
        'is_on_court' => 'boolean',
        'seconds_played' => 'integer',
        'last_subbed_in_at' => 'integer',
    ];

    public function match()
    {
        return $this->belongsTo(SportMatch::class, 'match_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
