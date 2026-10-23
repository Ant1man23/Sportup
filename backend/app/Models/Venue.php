<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Venue extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'slug', 'district', 'city', 'address',
        'latitude', 'longitude',
        'sports', 'surface_type', 'capacity',
        'has_lighting', 'has_changing_rooms', 'has_parking',
        'has_tribunes', 'has_canteen', 'is_indoor',
        'price_per_hour', 'price_currency',
        'phone_primary', 'phone_secondary', 'whatsapp_number',
        'email', 'facebook_url', 'booking_notes',
        'opening_time', 'closing_time', 'open_days',
        'cover_image', 'gallery',
        'rating', 'review_count', 'booking_count',
        'is_active', 'is_verified', 'submitted_by',
    ];

    /**
     * Valeurs par défaut pour les colonnes JSON (MySQL 5.7 ne supporte pas
     * les DEFAULT sur les colonnes JSON/BLOB, on les gère ici).
     */
    protected $attributes = [
        'sports'    => '[]',
        'open_days' => '["lun","mar","mer","jeu","ven","sam","dim"]',
        'gallery'   => '[]',
    ];

    protected $casts = [
        'sports'              => 'array',
        'open_days'           => 'array',
        'gallery'             => 'array',
        'has_lighting'        => 'boolean',
        'has_changing_rooms'  => 'boolean',
        'has_parking'         => 'boolean',
        'has_tribunes'        => 'boolean',
        'has_canteen'         => 'boolean',
        'is_indoor'           => 'boolean',
        'is_active'           => 'boolean',
        'is_verified'         => 'boolean',
        'latitude'            => 'float',
        'longitude'           => 'float',
        'price_per_hour'      => 'integer',
        'capacity'            => 'integer',
        'rating'              => 'float',
        'review_count'        => 'integer',
        'booking_count'       => 'integer',
    ];

    // ── Relations ─────────────────────────────────────────────────────────────

    public function sessions(): HasMany
    {
        return $this->hasMany(SportSession::class, 'venue_id');
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    /**
     * Retourne le numéro WhatsApp formaté pour deep link
     * (supprime les espaces et préfixe +261 si absent)
     */
    public function getWhatsappLinkAttribute(): ?string
    {
        if (!$this->whatsapp_number) return null;
        $clean = preg_replace('/\s+/', '', $this->whatsapp_number);
        if (!str_starts_with($clean, '+')) {
            $clean = '+261' . ltrim($clean, '0');
        }
        return "https://wa.me/{$clean}";
    }

    /**
     * Label lisible de la surface
     */
    public function getSurfaceLabelAttribute(): string
    {
        return match($this->surface_type) {
            'gazon_naturel'     => 'Gazon naturel',
            'gazon_synthetique' => 'Gazon synthétique',
            'beton'             => 'Béton',
            'parquet'           => 'Parquet',
            'sable'             => 'Sable',
            'ciment'            => 'Ciment',
            default             => $this->surface_type,
        };
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForSport($query, string $sport)
    {
        return $query->whereJsonContains('sports', $sport);
    }

    public function scopeVerified($query)
    {
        return $query->where('is_verified', true);
    }
}
