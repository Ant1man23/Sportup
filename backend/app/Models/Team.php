<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Team extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'invite_code',
        'sport_id',
        'captain_id',
        'organization_type',
        'organization_name',
        'logo_path',
        'max_members',
        'level',
        'city',
        'is_looking_for_opponent',
    ];

    protected $casts = [
        'is_looking_for_opponent' => 'boolean',
    ];

    // ─── Relations ────────────────────────────────────────────────────────────

    public function sport()
    {
        return $this->belongsTo(Sport::class, 'sport_id');
    }

    public function captain()
    {
        return $this->belongsTo(User::class, 'captain_id');
    }

    public function members()
    {
        return $this->belongsToMany(User::class, 'team_members', 'team_id', 'user_id')
            ->withPivot('role', 'joined_at')
            ->orderByPivot('joined_at', 'asc');
    }

    public function invitations()
    {
        return $this->hasMany(TeamInvitation::class);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function getInitialsAttribute(): string
    {
        $words = explode(' ', $this->name);
        $initials = implode('', array_map(fn ($w) => strtoupper(mb_substr($w, 0, 1)), $words));

        return mb_substr($initials, 0, 2);
    }

    public function getLogoUrlAttribute(): ?string
    {
        if (!$this->logo_path) {
            return null;
        }

        if (str_starts_with($this->logo_path, 'http://') || str_starts_with($this->logo_path, 'https://')) {
            return $this->logo_path;
        }

        try {
            return \Illuminate\Support\Facades\Storage::disk(config('filesystems.default'))->url($this->logo_path);
        } catch (\Throwable) {
            return $this->logo_path;
        }
    }

    protected static function booted(): void
    {
        static::creating(function (Team $team) {
            if (empty($team->invite_code)) {
                $team->invite_code = static::generateUniqueInviteCode();
            }
        });
    }

    public static function generateUniqueInviteCode(): string
    {
        do {
            $code = 'SP-' . strtoupper(\Illuminate\Support\Str::random(6));
        } while (static::where('invite_code', $code)->exists());

        return $code;
    }

    public function getInviteCodeAttribute($value): string
    {
        if (!empty($value)) {
            return $value;
        }
        return 'SP-' . strtoupper(substr(hash('crc32b', 'team_' . $this->id), 0, 6));
    }

    protected $appends = ['initials', 'logo_url', 'invite_code'];
}
