<?php

namespace App\Actions\Sessions;

use App\Models\SportSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CreateSessionAction
{
    public function execute(User $organizer, array $data): SportSession
    {
        return DB::transaction(function () use ($organizer, $data) {
            $city = !empty($data['city']) ? trim($data['city']) : 'Antananarivo';

            // Mapping des régions et coordonnées des principales villes de Madagascar
            $madagascarRegions = [
                'antananarivo' => ['region' => 'Analamanga', 'lat' => -18.8792, 'lng' => 47.5079],
                'toamasina'    => ['region' => 'Atsinanana', 'lat' => -18.1492, 'lng' => 49.4023],
                'tamatave'     => ['region' => 'Atsinanana', 'lat' => -18.1492, 'lng' => 49.4023],
                'mahajanga'    => ['region' => 'Boeny', 'lat' => -15.7167, 'lng' => 46.3167],
                'majunga'      => ['region' => 'Boeny', 'lat' => -15.7167, 'lng' => 46.3167],
                'antsirabe'    => ['region' => 'Vakinankaratra', 'lat' => -19.8659, 'lng' => 47.0333],
                'fianarantsoa' => ['region' => 'Haute Matsiatra', 'lat' => -21.4506, 'lng' => 47.0826],
                'toliara'      => ['region' => 'Atsimo-Andrefana', 'lat' => -23.3516, 'lng' => 43.6674],
                'tulear'       => ['region' => 'Atsimo-Andrefana', 'lat' => -23.3516, 'lng' => 43.6674],
                'antsiranana'  => ['region' => 'Diana', 'lat' => -12.2833, 'lng' => 49.2833],
                'diego-suarez' => ['region' => 'Diana', 'lat' => -12.2833, 'lng' => 49.2833],
                'morondava'    => ['region' => 'Menabe', 'lat' => -20.2887, 'lng' => 44.2806],
                'miarinarivo'  => ['region' => 'Itasy', 'lat' => -18.9611, 'lng' => 46.9051],
                'nosy be'      => ['region' => 'Diana', 'lat' => -13.3100, 'lng' => 48.2600],
                'taolagnaro'   => ['region' => 'Anosy', 'lat' => -25.0225, 'lng' => 46.9987],
                'fort-dauphin' => ['region' => 'Anosy', 'lat' => -25.0225, 'lng' => 46.9987],
                'sambava'      => ['region' => 'Sava', 'lat' => -14.2667, 'lng' => 50.1667],
                'manakara'     => ['region' => 'Fitovinany', 'lat' => -22.1486, 'lng' => 48.0167],
            ];

            $cityLower = strtolower($city);
            $cityInfo = $madagascarRegions[$cityLower] ?? null;

            $defaultLat = $cityInfo ? $cityInfo['lat'] : -18.8792;
            $defaultLng = $cityInfo ? $cityInfo['lng'] : 47.5079;
            $region = $data['region'] ?? ($cityInfo ? $cityInfo['region'] : 'Analamanga');

            $session = SportSession::create([
                'organizer_id' => $organizer->id,
                'sport_id' => $data['sport_id'],
                'type' => $data['type'] ?? 'find_players',
                'competition_type' => $data['competition_type'] ?? 'friendly',
                'participation_mode' => $data['participation_mode'] ?? 'open',
                'spectator_access' => $data['spectator_access'] ?? 'free',
                'referee_id' => $data['referee_id'] ?? null,
                'format' => $data['format'],
                'session_date' => $data['session_date'],
                'registration_deadline' => $data['registration_deadline'] ?? null,
                'start_time' => $data['start_time'],
                'latitude' => isset($data['latitude']) && is_numeric($data['latitude']) ? (float)$data['latitude'] : $defaultLat,
                'longitude' => isset($data['longitude']) && is_numeric($data['longitude']) ? (float)$data['longitude'] : $defaultLng,
                'address' => $data['address'] ?? null,
                'location_details' => $data['location_details'] ?? null,
                'city' => $city,
                'region' => $region,
                'country' => 'MG',
                'level' => $data['level'] ?? 'all',
                'max_participants' => $data['max_participants'],
                'current_participants' => 1,
                'description' => $data['description'] ?? null,
                'status' => 'open',
            ]);

            // Add organizer as first participant
            $session->participants()->attach($organizer->id, [
                'joined_at' => now(),
            ]);

            // Automatically provision a group chat conversation for this session
            \App\Models\Conversation::firstOrCreate([
                'type' => 'session',
                'session_id' => $session->id,
            ]);

            return $session->load(['organizer', 'sport', 'participants', 'conversation']);
        });
    }
}
