<?php

namespace Database\Factories;

use App\Models\Entry;
use App\Models\SavedItem;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class SavedItemFactory extends Factory
{
    protected $model = SavedItem::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'entry_id' => Entry::factory(),
        ];
    }
}
