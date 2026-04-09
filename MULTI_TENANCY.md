# Multi-Tenancy Architecture

## Overview

This application uses a **hybrid multi-tenancy model** designed for a feed reader application where feeds and entries are shared resources (like YouTube channels), but user-specific data is isolated.

## Architecture

### Global/Shared Resources (No user_id)

These tables store data that can be accessed by multiple users:

- **`feeds`** - Feed definitions (URLs, titles, metadata). Multiple users can subscribe to the same feed.
- **`entries`** - Feed entries/content. Belongs to a feed, shared across users who subscribe to that feed.

### User-Scoped Resources (Has user_id)

These tables store user-specific data with automatic filtering via global scopes:

- **`categories`** - User's category organization
- **`user_feeds`** - Pivot table linking users to feeds (with category assignment)
- **`user_entry_reads`** - Tracks which entries a user has read
- **`saved_items`** - User's saved/bookmarked entries
- **`user_preferences`** - User-specific settings

## Security Measures

### 1. Global Scopes

All user-scoped models have a `UserScope` that automatically filters queries by the authenticated user:

```php
protected static function booted(): void
{
    static::addGlobalScope(new UserScope());
}
```

This ensures that:
- `Category::all()` only returns the authenticated user's categories
- `UserFeed::all()` only returns the authenticated user's feed subscriptions
- No need to manually add `->where('user_id', Auth::id())` in queries

### 2. Model Policies

Policies enforce authorization for user-scoped models:

- **CategoryPolicy** - Users can only update/delete their own categories (except "Podcasts")
- **UserFeedPolicy** - Users can only manage their own feed subscriptions
- **SavedItemPolicy** - Users can only manage their own saved items

### 3. Route Authorization

Routes use manual checks and policies to ensure users can only access their own data:

```php
// Example from web.php
Route::delete('/categories/{category}', function (Category $category) {
    if ($category->user_id !== Auth::id()) {
        abort(403);
    }
    // ...
});
```

## Data Access Patterns

### Viewing User's Feeds

Users access feeds through their subscriptions:

```php
$user->feeds() // Returns feeds the user is subscribed to
```

This uses the `user_feeds` pivot table to filter global feeds to the user's subscriptions.

### Viewing Entries

Entries are filtered through the user's feed subscriptions:

```php
DB::table('entries')
    ->join('feeds', 'feeds.id', '=', 'entries.feed_id')
    ->join('user_feeds', function ($join) {
        $join->on('user_feeds.feed_id', '=', 'feeds.id')
            ->where('user_feeds.user_id', '=', Auth::id());
    })
```

This ensures users only see entries from feeds they've subscribed to.

## Production Readiness

The application is production-ready for multiple users because:

1. **Automatic Isolation** - Global scopes prevent accidental data leakage
2. **Authorization** - Policies enforce ownership checks
3. **Test Coverage** - Comprehensive tests verify multi-tenancy isolation
4. **Shared Resources** - Efficient design where feeds/entries are shared (reduces storage)

## Testing

Run multi-tenancy tests:

```bash
php artisan test --filter MultiTenancyTest
```

These tests verify:
- Users can only see their own user-scoped data
- Users cannot modify another user's data
- Feeds and entries are properly shared through subscriptions
