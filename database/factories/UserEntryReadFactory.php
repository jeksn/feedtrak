<?php

namespace Database\Factories;

use App\Models\Entry;
use App\Models\User;
use App\Models\UserEntryRead;
use Illuminate\Database\Eloquent\Factories\Factory;

class UserEntryReadFactory extends Factory
{
    protected $model = UserEntryRead::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'entry_id' => Entry::factory(),
            'is_read' => $this->faker->boolean,
            'read_at' => fn (array $attributes) => $attributes['is_read'] ? now() : null,
        ];
    }

    public function read(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_read' => true,
            'read_at' => now(),
        ]);
    }

    public function unread(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_read' => false,
            'read_at' => null,
        ]);
    }
}
