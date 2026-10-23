<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Venue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class VenueController extends Controller
{
    /**
     * GET /v1/venues
     * Listing avec recherche, filtre sport et tri.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Venue::active()->orderByDesc('is_verified')->orderByDesc('rating');

        // Filtre par sport
        if ($sport = $request->query('sport')) {
            $query->forSport($sport);
        }

        // Filtre par type surface
        if ($surface = $request->query('surface')) {
            $query->where('surface_type', $surface);
        }

        // Filtre indoor/outdoor
        if ($request->has('indoor')) {
            $query->where('is_indoor', filter_var($request->query('indoor'), FILTER_VALIDATE_BOOLEAN));
        }

        // Filtre éclairage
        if ($request->has('lighting')) {
            $query->where('has_lighting', filter_var($request->query('lighting'), FILTER_VALIDATE_BOOLEAN));
        }

        // Filtre vestiaires
        if ($request->has('changing_rooms')) {
            $query->where('has_changing_rooms', filter_var($request->query('changing_rooms'), FILTER_VALIDATE_BOOLEAN));
        }

        // Filtre prix max/heure
        if ($maxPrice = $request->query('max_price')) {
            $query->where('price_per_hour', '<=', (int) $maxPrice);
        }

        // Recherche textuelle (nom ou adresse)
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('district', 'like', "%{$search}%")
                  ->orWhere('address', 'like', "%{$search}%");
            });
        }

        // Filtre district
        if ($district = $request->query('district')) {
            $query->where('district', 'like', "%{$district}%");
        }

        // Tri
        $sort = $request->query('sort', 'rating');
        match ($sort) {
            'price_asc'     => $query->orderBy('price_per_hour'),
            'price_desc'    => $query->orderByDesc('price_per_hour'),
            'popular'       => $query->orderByDesc('booking_count'),
            'newest'        => $query->orderByDesc('created_at'),
            default         => $query->orderByDesc('rating'),
        };

        $venues = $query->get()->map(fn($v) => $this->formatVenue($v));

        return response()->json([
            'data'  => $venues,
            'count' => $venues->count(),
        ]);
    }

    /**
     * GET /v1/venues/{id}
     * Détail complet d'un terrain.
     */
    public function show(int $id): JsonResponse
    {
        $venue = Venue::active()->findOrFail($id);

        // Incrémenter le compteur de vues (léger)
        $venue->increment('booking_count', 0); // pas de vrai tracking ici, juste accès

        return response()->json(['data' => $this->formatVenue($venue, detailed: true)]);
    }

    /**
     * POST /v1/venues
     * Tout utilisateur authentifié peut soumettre un terrain.
     * is_verified = false par défaut (modération SportUp).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'               => 'required|string|max:150',
            'district'           => 'required|string|max:100',
            'city'               => 'required|string|max:100',
            'address'            => 'required|string|max:255',
            'latitude'           => 'nullable|numeric|between:-90,90',
            'longitude'          => 'nullable|numeric|between:-180,180',
            'sports'             => 'nullable|array',
            'sports.*'           => 'string|in:football,football5,basketball,basketball3x3,volleyball,table_tennis,athletics',
            'surface_type'       => 'nullable|in:gazon_naturel,gazon_synthetique,beton,parquet,sable,ciment',
            'capacity'           => 'nullable|integer|min:1',
            'has_lighting'       => 'nullable|boolean',
            'has_changing_rooms' => 'nullable|boolean',
            'has_parking'        => 'nullable|boolean',
            'has_tribunes'       => 'nullable|boolean',
            'has_canteen'        => 'nullable|boolean',
            'is_indoor'          => 'nullable|boolean',
            'price_per_hour'     => 'nullable|integer|min:0',
            'price_currency'     => 'nullable|string|max:10',
            'phone_primary'      => 'nullable|string|max:30',
            'phone_secondary'    => 'nullable|string|max:30',
            'whatsapp_number'    => 'nullable|string|max:30',
            'email'              => 'nullable|email|max:150',
            'facebook_url'       => 'nullable|url|max:255',
            'booking_notes'      => 'nullable|string|max:500',
            'opening_time'       => 'nullable|string',
            'closing_time'       => 'nullable|string',
            'open_days'          => 'nullable|array',
        ]);

        $slug = Str::slug($validated['name'] . '-' . ($validated['district'] ?? ''));
        if (empty($slug)) {
            $slug = 'terrain-' . time();
        }
        $baseSlug = $slug;
        $i = 1;
        while (Venue::where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . $i++;
        }

        $venue = Venue::create(array_merge($validated, [
            'slug'           => $slug,
            'submitted_by'   => $request->user()->id,
            'is_verified'    => false,
            'is_active'      => true,
            'price_currency' => $validated['price_currency'] ?? 'MGA',
        ]));

        return response()->json([
            'message' => 'Terrain soumis avec succès. Il sera vérifié par l\'équipe SportUp.',
            'data'    => $this->formatVenue($venue, detailed: true),
        ], 201);
    }

    /**
     * PUT /v1/venues/{id}
     * L'utilisateur peut modifier les terrains qu'il a soumis.
     */
    public function update(int $id, Request $request): JsonResponse
    {
        $venue = Venue::findOrFail($id);

        if ($venue->submitted_by !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Vous pouvez uniquement modifier les terrains que vous avez soumis.'
            ], 403);
        }

        $validated = $request->validate([
            'name'               => 'sometimes|string|max:150',
            'district'           => 'sometimes|string|max:100',
            'city'               => 'sometimes|string|max:100',
            'address'            => 'sometimes|string|max:255',
            'latitude'           => 'nullable|numeric|between:-90,90',
            'longitude'          => 'nullable|numeric|between:-180,180',
            'sports'             => 'nullable|array',
            'sports.*'           => 'string|in:football,football5,basketball,basketball3x3,volleyball,table_tennis,athletics',
            'surface_type'       => 'nullable|in:gazon_naturel,gazon_synthetique,beton,parquet,sable,ciment',
            'capacity'           => 'nullable|integer|min:1',
            'has_lighting'       => 'nullable|boolean',
            'has_changing_rooms' => 'nullable|boolean',
            'has_parking'        => 'nullable|boolean',
            'has_tribunes'       => 'nullable|boolean',
            'has_canteen'        => 'nullable|boolean',
            'is_indoor'          => 'nullable|boolean',
            'price_per_hour'     => 'nullable|integer|min:0',
            'price_currency'     => 'nullable|string|max:10',
            'phone_primary'      => 'nullable|string|max:30',
            'phone_secondary'    => 'nullable|string|max:30',
            'whatsapp_number'    => 'nullable|string|max:30',
            'email'              => 'nullable|email|max:150',
            'facebook_url'       => 'nullable|url|max:255',
            'booking_notes'      => 'nullable|string|max:500',
            'opening_time'       => 'nullable|string',
            'closing_time'       => 'nullable|string',
            'open_days'          => 'nullable|array',
        ]);

        $venue->update($validated);

        return response()->json([
            'message' => 'Terrain mis à jour avec succès.',
            'data'    => $this->formatVenue($venue->fresh(), detailed: true),
        ], 200);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private function formatVenue(Venue $venue, bool $detailed = false): array
    {
        $base = [
            'id'                 => $venue->id,
            'name'               => $venue->name,
            'slug'               => $venue->slug,
            'district'           => $venue->district,
            'city'               => $venue->city,
            'address'            => $venue->address,
            'latitude'           => $venue->latitude,
            'longitude'          => $venue->longitude,
            'sports'             => $venue->sports ?? [],
            'surface_type'       => $venue->surface_type,
            'surface_label'      => $venue->surface_label,
            'capacity'           => $venue->capacity,
            'is_indoor'          => $venue->is_indoor,
            'has_lighting'       => $venue->has_lighting,
            'has_changing_rooms' => $venue->has_changing_rooms,
            'has_parking'        => $venue->has_parking,
            'has_tribunes'       => $venue->has_tribunes,
            'has_canteen'        => $venue->has_canteen,
            'price_per_hour'     => $venue->price_per_hour,
            'price_currency'     => $venue->price_currency,
            'rating'             => $venue->rating,
            'review_count'       => $venue->review_count,
            'booking_count'      => $venue->booking_count,
            'is_verified'        => $venue->is_verified,
            'submitted_by'       => $venue->submitted_by,
            'phone_primary'      => $venue->phone_primary,
            'whatsapp_number'    => $venue->whatsapp_number,
            'whatsapp_link'      => $venue->whatsapp_link,
            'opening_time'       => $venue->opening_time,
            'closing_time'       => $venue->closing_time,
            'open_days'          => $venue->open_days ?? [],
            'cover_image'        => $venue->cover_image,
        ];

        if ($detailed) {
            $base = array_merge($base, [
                'email'          => $venue->email,
                'phone_secondary'=> $venue->phone_secondary,
                'facebook_url'   => $venue->facebook_url,
                'booking_notes'  => $venue->booking_notes,
                'gallery'        => $venue->gallery ?? [],
            ]);
        }

        return $base;
    }
}
