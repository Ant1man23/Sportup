<?php

namespace Database\Factories;

use App\Models\Sport;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Team>
 */
class TeamFactory extends Factory
{
    protected $model = Team::class;

    public function definition(): array
    {
        return [
            'name'                    => $this->faker->company() . ' FC',
            'sport_id'                => Sport::factory(),
            'captain_id'              => User::factory(),
            'level'                   => $this->faker->randomElement(['beginner', 'intermediate', 'advanced']),
            'city'                    => $this->faker->city(),
            'is_looking_for_opponent' => false,
            'organization_type'       => 'independent_group',
        ];
    }
}
