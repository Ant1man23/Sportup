<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserSportStatistics extends Model
{
    use HasFactory;

    protected $table = 'user_sport_statistics';

    public $timestamps = false;

    protected $primaryKey = 'user_id';

    public $incrementing = false;

    protected $keyType = 'int';

    protected $fillable = [
        'user_id',
        'sport_id',
        'matches_played',
        'wins',
        'losses',
        'draws',
        'goals_scored',
        'points_scored',
        'assists',
        'rebounds',
        'blocks',
        'steals',
        'mvp_count',
        'updated_at',
    ];

    protected $casts = [
        'matches_played' => 'integer',
        'wins' => 'integer',
        'losses' => 'integer',
        'draws' => 'integer',
        'goals_scored' => 'integer',
        'points_scored' => 'integer',
        'assists' => 'integer',
        'rebounds' => 'integer',
        'blocks' => 'integer',
        'steals' => 'integer',
        'mvp_count' => 'integer',
        'updated_at' => 'datetime',
    ];

    protected function setKeysForSaveQuery($query): Builder
    {
        return $query
            ->where('user_id', $this->getAttribute('user_id'))
            ->where('sport_id', $this->getAttribute('sport_id'));
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function sport()
    {
        return $this->belongsTo(Sport::class, 'sport_id');
    }
}
