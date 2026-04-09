<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Feed;
use App\Models\User;
use App\Models\UserFeed;
use Illuminate\Database\Eloquent\Factories\Factory;

class UserFeedFactory extends Factory
{
    protected $model = UserFeed::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'feed_id' => Feed::factory(),
            'category_id' => null,
            'is_active' => true,
        ];
    }

    public function withCategory(): static
    {
        return $this->state(fn (array $attributes) => [
            'category_id' => Category::factory(),
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
