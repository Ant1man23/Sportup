<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tournament extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'sport_id',
        'organizer_id',
        'format',
        'starts_on',
        'start_date',
        'end_date',
        'location',
        'city',
        'max_teams',
        'prize_pool',
        'status',
        'is_featured',
        'description',
    ];

    protected $casts = [
        'starts_on'   => 'date',
        'start_date'  => 'date',
        'end_date'    => 'date',
        'is_featured' => 'boolean',
    ];

    public function sport(): BelongsTo
    {
        return $this->belongsTo(Sport::class);
    }

    public function organizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organizer_id');
    }

    public function teams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class, 'tournament_teams')
            ->withPivot('group_label', 'seed', 'status', 'registered_at');
    }

    public function standings(): HasMany
    {
        return $this->hasMany(TournamentStanding::class)->orderByDesc('points')->orderByDesc('points_for');
    }

    public function matches(): HasMany
    {
        return $this->hasMany(SportMatch::class, 'tournament_id');
    }
}
