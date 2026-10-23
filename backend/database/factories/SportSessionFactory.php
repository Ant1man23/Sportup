<?php

namespace Database\Factories;

use App\Models\Sport;
use App\Models\SportSession;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SportSession>
 */
class SportSessionFactory extends Factory
{
    protected $model = SportSession::class;
    public function definition(): array
    {
        return [
            'sport_id'             => Sport::factory(),
            'organizer_id'         => User::factory(),
            'type'                 => 'free_match',
            'format'               => '5v5',
            'session_date'         => now()->addDays(rand(1, 30))->toDateString(),
            'start_time'           => '18:00',
            'description'          => $this->faker->sentence(),
            'city'                 => $this->faker->city(),
            'address'              => $this->faker->address(),
            'max_participants'     => $this->faker->randomElement([10, 14, 22]),
            'current_participants' => 1,
            'level'                => 'all',
            'country'              => 'MG',
            'status'               => 'open',
            'latitude'             => -18.8792,
            'longitude'            => 47.5079,
        ];
    }
}
