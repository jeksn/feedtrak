<?php

namespace Database\Factories;

use App\Models\Entry;
use App\Models\Feed;
use Illuminate\Database\Eloquent\Factories\Factory;

class EntryFactory extends Factory
{
    protected $model = Entry::class;

    public function definition(): array
    {
        return [
            'feed_id' => Feed::factory(),
            'title' => $this->faker->sentence,
            'content' => $this->faker->paragraphs(3, true),
            'excerpt' => $this->faker->text(200),
            'url' => $this->faker->url,
            'thumbnail_url' => $this->faker->optional()->imageUrl(),
            'author' => $this->faker->optional()->name,
            'published_at' => $this->faker->dateTimeBetween('-30 days', 'now'),
        ];
    }
}
