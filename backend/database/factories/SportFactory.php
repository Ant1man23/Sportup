<?php

namespace Database\Factories;

use App\Models\Sport;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Sport>
 */
class SportFactory extends Factory
{
    protected $model = Sport::class;

    private static int $counter = 0;

    public function definition(): array
    {
        self::$counter++;
        $sports = [
            ['name' => 'Football',    'slug' => 'football',     'icon' => '⚽'],
            ['name' => 'Basketball',  'slug' => 'basketball',   'icon' => '🏀'],
            ['name' => 'Volleyball',  'slug' => 'volleyball',   'icon' => '🏐'],
            ['name' => 'Tennis',      'slug' => 'tennis',       'icon' => '🎾'],
            ['name' => 'Futsal',      'slug' => 'futsal',       'icon' => '⚽'],
        ];
        $pick = $sports[(self::$counter - 1) % count($sports)];

        return [
            'name'      => $pick['name'] . '_' . uniqid(),
            'slug'      => $pick['slug'] . '_' . uniqid(),
            'icon'      => $pick['icon'],
            'color_hex' => $this->faker->hexColor(),
            'is_active' => true,
        ];
    }
}
