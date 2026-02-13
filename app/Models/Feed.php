<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Feed extends Model
{
    use HasFactory;

    protected $fillable = [
        'url',
        'title',
        'description',
        'feed_url',
        'type',
        'icon_url',
        'last_fetched_at',
    ];

    protected $casts = [
        'last_fetched_at' => 'datetime',
    ];

    public function entries(): HasMany
    {
        return $this->hasMany(Entry::class);
    }

    public function userFeeds(): HasMany
    {
        return $this->hasMany(UserFeed::class);
    }
}
