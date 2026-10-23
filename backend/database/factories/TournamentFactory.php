<?php

namespace Database\Factories;

use App\Models\Sport;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Tournament>
 */
class TournamentFactory extends Factory
{
    protected $model = Tournament::class;

    public function definition(): array
    {
        return [
            'name'         => $this->faker->words(3, true) . ' Cup',
            'sport_id'     => Sport::factory(),
            'organizer_id' => User::factory(),
            'format'       => $this->faker->randomElement(['knockout', 'groups', 'groups_then_knockout']),
            'status'       => 'open',
            'start_date'   => now()->addDays(rand(7, 60))->format('Y-m-d'),
            'max_teams'    => $this->faker->randomElement([4, 8, 16]),
            'prize_pool'   => '500 000 Ar',
            'description'  => $this->faker->sentence(),
        ];
    }
}
