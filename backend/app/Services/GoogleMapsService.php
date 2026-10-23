<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GoogleMapsService
{
    protected ?string $apiKey;

    protected string $defaultCountry;

    public function __construct()
    {
        $this->apiKey = config('services.google_maps.api_key');
        $this->defaultCountry = config('services.google_maps.default_country', 'mg');
    }

    /**
     * Vérifie si une clé d'API Google Maps valide est configurée dans l'environnement.
     */
    public function hasKey(): bool
    {
        return ! empty($this->apiKey) && $this->apiKey !== 'YOUR_GOOGLE_MAPS_KEY';
    }

    /**
     * Géocode une adresse textuelle en coordonnées géographiques (latitude / longitude).
     *
     * @return array|null ['latitude' => float, 'longitude' => float, 'formatted_address' => string, 'city' => string]
     */
    public function geocode(string $address): ?array
    {
        if (! $this->hasKey()) {
            try {
                $response = Http::withHeaders(['User-Agent' => 'SportUpApp/1.0 (sportup.madagascar@gmail.com)'])
                    ->timeout(4)
                    ->get('https://nominatim.openstreetmap.org/search', [
                        'q' => $address,
                        'format' => 'json',
                        'limit' => 1,
                        'countrycodes' => $this->defaultCountry,
                    ]);
                if ($response->successful() && ! empty($response->json('0'))) {
                    $item = $response->json('0');

                    return [
                        'latitude' => (float) $item['lat'],
                        'longitude' => (float) $item['lon'],
                        'formatted_address' => $item['display_name'] ?? $address,
                        'city' => 'Antananarivo',
                    ];
                }
            } catch (\Throwable $e) {
                Log::info('OSM geocode fallback note: '.$e->getMessage());
            }

            return null;
        }

        try {
            $response = Http::timeout(5)->get('https://maps.googleapis.com/maps/api/geocode/json', [
                'address' => $address,
                'key' => $this->apiKey,
                'language' => 'fr',
                'components' => "country:{$this->defaultCountry}",
            ]);

            if ($response->successful() && $response->json('status') === 'OK') {
                $result = $response->json('results.0');
                $location = $result['geometry']['location'] ?? null;

                if (! $location) {
                    return null;
                }

                $city = 'Antananarivo';
                foreach ($result['address_components'] ?? [] as $component) {
                    if (in_array('locality', $component['types']) || in_array('administrative_area_level_2', $component['types'])) {
                        $city = $component['long_name'];
                        break;
                    }
                }

                return [
                    'latitude' => (float) $location['lat'],
                    'longitude' => (float) $location['lng'],
                    'formatted_address' => $result['formatted_address'] ?? $address,
                    'city' => $city,
                ];
            }
        } catch (\Throwable $e) {
            Log::warning('GoogleMapsService geocode failed: '.$e->getMessage());
        }

        return null;
    }

    /**
     * Reverse geocode coordinates to a human-readable address.
     */
    public function reverseGeocode(float $lat, float $lng): ?string
    {
        if (! $this->hasKey()) {
            return null;
        }

        try {
            $response = Http::timeout(5)->get('https://maps.googleapis.com/maps/api/geocode/json', [
                'latlng' => "{$lat},{$lng}",
                'key' => $this->apiKey,
                'language' => 'fr',
            ]);

            if ($response->successful() && $response->json('status') === 'OK') {
                return $response->json('results.0.formatted_address');
            }
        } catch (\Throwable $e) {
            Log::warning('GoogleMapsService reverseGeocode failed: '.$e->getMessage());
        }

        return null;
    }

    /**
     * Calculate route distance and travel duration via Google Maps Distance Matrix API.
     *
     * @param  string  $mode  'driving'|'walking'|'bicycling'
     * @return array ['distance_km' => float, 'duration_minutes' => int, 'source' => 'google'|'haversine']
     */
    public function calculateDistance(
        float $originLat,
        float $originLng,
        float $destLat,
        float $destLng,
        string $mode = 'driving'
    ): array {
        if ($this->hasKey()) {
            try {
                $response = Http::timeout(5)->get('https://maps.googleapis.com/maps/api/distancematrix/json', [
                    'origins' => "{$originLat},{$originLng}",
                    'destinations' => "{$destLat},{$destLng}",
                    'mode' => $mode,
                    'key' => $this->apiKey,
                    'language' => 'fr',
                ]);

                if ($response->successful() && $response->json('status') === 'OK') {
                    $element = $response->json('rows.0.elements.0');
                    if (($element['status'] ?? '') === 'OK') {
                        $distanceMeters = (int) ($element['distance']['value'] ?? 0);
                        $durationSeconds = (int) ($element['duration']['value'] ?? 0);

                        return [
                            'distance_km' => round($distanceMeters / 1000, 2),
                            'duration_minutes' => (int) ceil($durationSeconds / 60),
                            'source' => 'google',
                        ];
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('Google Distance Matrix failed, falling back to Haversine: '.$e->getMessage());
            }
        }

        // Haversine formula fallback
        $earthRadius = 6371; // km
        $dLat = deg2rad($destLat - $originLat);
        $dLng = deg2rad($destLng - $originLng);
        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($originLat)) * cos(deg2rad($destLat)) *
             sin($dLng / 2) * sin($dLng / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        $distanceKm = round($earthRadius * $c, 2);

        // Approximate 30 km/h urban traffic speed
        $durationMinutes = (int) ceil(($distanceKm / 30) * 60);

        return [
            'distance_km' => $distanceKm,
            'duration_minutes' => $durationMinutes,
            'source' => 'haversine',
        ];
    }
}
