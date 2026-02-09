<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Feed>
 */
class FeedFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'url' => $this->faker->url(),
            'title' => $this->faker->sentence(3),
            'description' => $this->faker->paragraph(),
            'feed_url' => $this->faker->url() . '/feed.xml',
            'type' => 'rss',
            'icon_url' => null,
            'last_fetched_at' => null,
        ];
    }
}
