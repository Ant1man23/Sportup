<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class SportSession extends Model
{
    use HasFactory;

    protected $table = 'sport_sessions';

    protected $fillable = [
        'organizer_id',
        'sport_id',
        'type',
        'competition_type',
        'participation_mode',
        'spectator_access',
        'referee_id',
        'format',
        'session_date',
        'registration_deadline',
        'start_time',
        'latitude',
        'longitude',
        'address',
        'location_details',
        'city',
        'region',
        'country',
        'level',
        'max_participants',
        'current_participants',
        'description',
        'status',
        'cancelled_reason',
    ];

    protected $casts = [
        'latitude'              => 'float',
        'longitude'             => 'float',
        'max_participants'      => 'integer',
        'current_participants'  => 'integer',
        'session_date'          => 'date:Y-m-d',
        'registration_deadline' => 'datetime',
    ];

    // ─── Relationships ──────────────────────────────────────────────────────────

    public function organizer()
    {
        return $this->belongsTo(User::class, 'organizer_id');
    }

    public function referee()
    {
        return $this->belongsTo(User::class, 'referee_id');
    }

    public function sport()
    {
        return $this->belongsTo(Sport::class, 'sport_id');
    }

    public function participants()
    {
        return $this->belongsToMany(User::class, 'sport_session_participants', 'session_id', 'user_id')
            ->withPivot('joined_at');
    }

    public function match()
    {
        return $this->hasOne(SportMatch::class, 'session_id');
    }

    public function conversation()
    {
        return $this->hasOne(Conversation::class, 'session_id');
    }

    // ─── Query Scopes ──────────────────────────────────────────────────────────

    /**
     * Scope: only open (joinable) sessions.
     */
    public function scopeOpen(Builder $query): Builder
    {
        return $query->where('status', 'open')
            ->where('current_participants', '<', \DB::raw('max_participants'));
    }

    /**
     * Scope: sessions happening today or in the future.
     */
    public function scopeUpcoming(Builder $query): Builder
    {
        return $query->where('session_date', '>=', now()->toDateString());
    }

    /**
     * Scope: sessions within $radiusKm kilometers from ($lat, $lng).
     * Uses Haversine formula directly in SQL for accuracy.
     */
    public function scopeNearby(Builder $query, float $lat, float $lng, float $radiusKm = 25): Builder
    {
        return $query->selectRaw(
            "*, (6371 * acos(
                cos(radians(?)) * cos(radians(latitude))
                * cos(radians(longitude) - radians(?))
                + sin(radians(?)) * sin(radians(latitude))
            )) AS distance_km",
            [$lat, $lng, $lat]
        )->having('distance_km', '<=', $radiusKm)
          ->orderBy('distance_km');
    }

    // ─── Accesseurs Virtuels ─────────────────────────────────────────────────────

    /**
     * Indique si la session sportive est complète (plus aucune place disponible).
     */
    public function getIsFullAttribute(): bool
    {
        return $this->current_participants >= $this->max_participants;
    }

    /**
     * Calcule le nombre exact de places encore disponibles pour cette session.
     */
    public function getSpotsLeftAttribute(): int
    {
        return max(0, $this->max_participants - $this->current_participants);
    }
}
