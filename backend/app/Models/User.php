<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'username',
        'email',
        'password',
        'photo_path',
        'city',
        'level',
        'role',
        'reminder_minutes_before',
    ];

    public function isOrganizer(): bool
    {
        return $this->role === 'organizer' || $this->role === 'admin';
    }

    public function isReferee(): bool
    {
        return $this->role === 'referee' || $this->role === 'admin';
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isTeamManager(): bool
    {
        return $this->role === 'team_manager' || $this->role === 'admin';
    }

    public function isSpectator(): bool
    {
        return $this->role === 'spectator';
    }

    public function isPlayer(): bool
    {
        return $this->role === 'player';
    }

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = [
        'photo_url',
    ];

    public function getPhotoUrlAttribute(): ?string
    {
        if (!$this->photo_path) {
            return null;
        }
        if (str_starts_with($this->photo_path, 'http://') || str_starts_with($this->photo_path, 'https://')) {
            return $this->photo_path;
        }
        return url('/storage/' . ltrim($this->photo_path, '/'));
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function favoriteSports()
    {
        return $this->belongsToMany(Sport::class, 'user_favorite_sports');
    }

    public function organizedSessions()
    {
        return $this->hasMany(SportSession::class, 'organizer_id');
    }

    public function joinedSessions()
    {
        return $this->belongsToMany(SportSession::class, 'sport_session_participants', 'user_id', 'session_id')
            ->withPivot('joined_at');
    }

    public function statistics()
    {
        return $this->hasMany(UserSportStatistics::class, 'user_id');
    }

    public function teams()
    {
        return $this->belongsToMany(Team::class, 'team_members', 'user_id', 'team_id')
            ->withPivot('role', 'joined_at');
    }

    public function captainedTeams()
    {
        return $this->hasMany(Team::class, 'captain_id');
    }

    public function devices()
    {
        return $this->hasMany(Device::class);
    }

    public function notificationPreferences()
    {
        return $this->hasMany(NotificationPreference::class);
    }
}
