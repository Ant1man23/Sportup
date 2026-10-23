<?php

namespace Database\Seeders;

use App\Models\Sport;
use Illuminate\Database\Seeder;

class SportSeeder extends Seeder
{
    public function run(): void
    {
        $sports = [
            [
                'id' => 1,
                'name' => 'Football 11',
                'slug' => 'football-11',
                'icon' => 'football',
                'color_hex' => '#1FAA59',
                'is_active' => true,
            ],
            [
                'id' => 2,
                'name' => 'Football 5',
                'slug' => 'football-5',
                'icon' => 'football',
                'color_hex' => '#10B981',
                'is_active' => true,
            ],
            [
                'id' => 3,
                'name' => 'Basket 5×5',
                'slug' => 'basketball-5x5',
                'icon' => 'basketball',
                'color_hex' => '#FF7A29',
                'is_active' => true,
            ],
            [
                'id' => 4,
                'name' => 'Basket 3×3',
                'slug' => 'basketball-3x3',
                'icon' => 'basketball',
                'color_hex' => '#F59E0B',
                'is_active' => true,
            ],
            [
                'id' => 5,
                'name' => 'Volleyball',
                'slug' => 'volleyball',
                'icon' => 'volleyball',
                'color_hex' => '#3B82F6',
                'is_active' => true,
            ],
            [
                'id' => 6,
                'name' => 'Tennis de table',
                'slug' => 'tennis-de-table',
                'icon' => 'table-tennis',
                'color_hex' => '#A855F7',
                'is_active' => true,
            ],
        ];

        foreach ($sports as $sport) {
            Sport::updateOrCreate(['id' => $sport['id']], $sport);
        }
    }
}
