<?php

use App\Models\Category;
use App\Models\Entry;
use App\Models\Feed;
use App\Models\SavedItem;
use App\Models\User;
use App\Models\UserEntryRead;
use App\Models\UserFeed;
use Illuminate\Support\Facades\DB;

test('users can only see their own categories', function () {
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();

    $category1 = Category::factory()->create(['user_id' => $user1->id]);
    Category::factory()->create(['user_id' => $user2->id]);

    auth()->login($user1);
    $categories = Category::all();

    expect($categories)->toHaveCount(1);
    expect($categories->first()->id)->toBe($category1->id);
});

test('users can only see their own user_feeds', function () {
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();
    $feed = Feed::factory()->create();

    $userFeed1 = UserFeed::factory()->create(['user_id' => $user1->id, 'feed_id' => $feed->id]);
    UserFeed::factory()->create(['user_id' => $user2->id, 'feed_id' => $feed->id]);

    auth()->login($user1);
    $userFeeds = UserFeed::all();

    expect($userFeeds)->toHaveCount(1);
    expect($userFeeds->first()->id)->toBe($userFeed1->id);
});

test('users can only see their own saved_items', function () {
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();
    $feed = Feed::factory()->create();
    $entry = Entry::factory()->create(['feed_id' => $feed->id]);

    $savedItem1 = SavedItem::factory()->create(['user_id' => $user1->id, 'entry_id' => $entry->id]);
    SavedItem::factory()->create(['user_id' => $user2->id, 'entry_id' => $entry->id]);

    auth()->login($user1);
    $savedItems = SavedItem::all();

    expect($savedItems)->toHaveCount(1);
    expect($savedItems->first()->id)->toBe($savedItem1->id);
});

test('users can only see their own entry_read_status', function () {
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();
    $feed = Feed::factory()->create();
    $entry = Entry::factory()->create(['feed_id' => $feed->id]);

    $readStatus1 = UserEntryRead::factory()->create(['user_id' => $user1->id, 'entry_id' => $entry->id]);
    UserEntryRead::factory()->create(['user_id' => $user2->id, 'entry_id' => $entry->id]);

    auth()->login($user1);
    $readStatuses = UserEntryRead::all();

    expect($readStatuses)->toHaveCount(1);
    expect($readStatuses->first()->id)->toBe($readStatus1->id);
});

test('users cannot delete another users category', function () {
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();
    $category = Category::factory()->create(['user_id' => $user2->id]);

    auth()->login($user1);

    expect($user1->cannot('delete', $category))->toBeTrue();
});

test('users cannot update another users category', function () {
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();
    $category = Category::factory()->create(['user_id' => $user2->id]);

    auth()->login($user1);

    expect($user1->cannot('update', $category))->toBeTrue();
});

test('users cannot delete another users user_feed', function () {
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();
    $feed = Feed::factory()->create();
    $userFeed = UserFeed::factory()->create(['user_id' => $user2->id, 'feed_id' => $feed->id]);

    auth()->login($user1);

    expect($user1->cannot('delete', $userFeed))->toBeTrue();
});

test('users cannot delete another users saved_item', function () {
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();
    $feed = Feed::factory()->create();
    $entry = Entry::factory()->create(['feed_id' => $feed->id]);
    $savedItem = SavedItem::factory()->create(['user_id' => $user2->id, 'entry_id' => $entry->id]);

    auth()->login($user1);

    expect($user1->cannot('delete', $savedItem))->toBeTrue();
});

test('feeds are shared between users', function () {
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();
    $feed = Feed::factory()->create();

    UserFeed::factory()->create(['user_id' => $user1->id, 'feed_id' => $feed->id]);
    UserFeed::factory()->create(['user_id' => $user2->id, 'feed_id' => $feed->id]);

    $user1Feeds = $user1->feeds()->get();
    $user2Feeds = $user2->feeds()->get();

    expect($user1Feeds)->toHaveCount(1);
    expect($user2Feeds)->toHaveCount(1);
    expect($user1Feeds->first()->id)->toBe($user2Feeds->first()->id);
});

test('entries are shared between users through feeds', function () {
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();
    $feed = Feed::factory()->create();
    $entry = Entry::factory()->create(['feed_id' => $feed->id]);

    UserFeed::factory()->create(['user_id' => $user1->id, 'feed_id' => $feed->id]);
    UserFeed::factory()->create(['user_id' => $user2->id, 'feed_id' => $feed->id]);

    $user1Entries = DB::table('entries')
        ->join('feeds', 'feeds.id', '=', 'entries.feed_id')
        ->join('user_feeds', function ($join) use ($user1) {
            $join->on('user_feeds.feed_id', '=', 'feeds.id')
                ->where('user_feeds.user_id', '=', $user1->id);
        })
        ->where('entries.id', $entry->id)
        ->count();

    $user2Entries = DB::table('entries')
        ->join('feeds', 'feeds.id', '=', 'entries.feed_id')
        ->join('user_feeds', function ($join) use ($user2) {
            $join->on('user_feeds.feed_id', '=', 'feeds.id')
                ->where('user_feeds.user_id', '=', $user2->id);
        })
        ->where('entries.id', $entry->id)
        ->count();

    expect($user1Entries)->toBe(1);
    expect($user2Entries)->toBe(1);
});
