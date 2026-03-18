<?php

use App\Http\Controllers\DashboardController;
use App\Models\Feed;
use App\Models\SavedItem;
use App\Models\UserEntryRead;
use App\Models\UserFeed;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (Auth::check()) {
        return redirect()->route('dashboard');
    }

    return redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('app', \App\Http\Controllers\DashboardController::class)->name('dashboard');

    // Videos (YouTube only)
    Route::get('/videos', \App\Http\Controllers\ContentTypeController::class)->name('videos');

    // RSS Feeds
    Route::get('/feeds', \App\Http\Controllers\ContentTypeController::class)->name('feeds');

    // Podcasts
    Route::get('/podcasts', \App\Http\Controllers\ContentTypeController::class)->name('podcasts');

    // Categories management route
    Route::get('/categories', function () {
        $categories = Auth::user()->categories()
            ->withCount('userFeeds')
            ->with(['userFeeds.feed'])
            ->orderBy('sort_order')
            ->get()
            ->map(function ($category) {
                $category->feeds = $category->userFeeds->map(function ($userFeed) {
                    return $userFeed->feed;
                })->filter();
                unset($category->userFeeds);

                return $category;
            });

        // Add uncategorized feeds count
        $uncategorizedCount = Auth::user()->userFeeds()
            ->whereNull('category_id')
            ->count();

        // Get uncategorized feeds
        $uncategorizedFeeds = Auth::user()->userFeeds()
            ->whereNull('category_id')
            ->with('feed')
            ->get()
            ->map(function ($userFeed) {
                return $userFeed->feed;
            })
            ->filter();

        // Create an uncategorized category object
        $uncategorizedCategory = (object) [
            'id' => null,
            'name' => 'Uncategorized',
            'user_feeds_count' => $uncategorizedCount,
            'feeds' => $uncategorizedFeeds,
        ];

        // Add uncategorized to the beginning of categories
        $allCategories = collect([$uncategorizedCategory])->merge($categories);

        return Inertia::render('Categories', [
            'categories' => $allCategories,
        ]);
    })->name('categories');

    // Category routes
    Route::post('/categories', function (Request $request) {
        $validated = $request->validate([
            'name' => 'required|string|max:50',
        ]);

        $category = Auth::user()->categories()->create([
            'name' => $validated['name'],
        ]);

        return back()->with('success', 'Category created successfully.');
    });

    Route::put('/categories/{category}', function (\App\Models\Category $category, Request $request) {
        if ($category->user_id !== Auth::id()) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:50',
        ]);

        $category->update([
            'name' => $validated['name'],
        ]);

        return back()->with('success', 'Category updated successfully.');
    });

    Route::delete('/categories/{category}', function (\App\Models\Category $category) {
        if ($category->user_id !== Auth::id()) {
            abort(403);
        }

        // Cannot delete the Podcasts category
        if ($category->name === 'Podcasts') {
            return back()->withErrors(['error' => 'Cannot delete the Podcasts category.']);
        }

        // Move feeds from this category to uncategorized
        Auth::user()->userFeeds()
            ->where('category_id', $category->id)
            ->update(['category_id' => null]);

        $category->delete();

        return back()->with('success', 'Category deleted successfully.');
    });

    // Feed routes (YouTube channels)
    Route::get('/channels', function () {
        // Get unseen counts (entries with no read record OR is_read = false)
        $unseenCounts = DB::table('entries')
            ->join('feeds', 'feeds.id', '=', 'entries.feed_id')
            ->join('user_feeds', function ($join) {
                $join->on('user_feeds.feed_id', '=', 'feeds.id')
                    ->where('user_feeds.user_id', '=', Auth::id());
            })
            ->leftJoin('user_entry_reads', function ($join) {
                $join->on('user_entry_reads.entry_id', '=', 'entries.id')
                    ->where('user_entry_reads.user_id', '=', Auth::id());
            })
            ->where(function ($query) {
                $query->whereNull('user_entry_reads.id')
                    ->orWhere('user_entry_reads.is_read', '=', false);
            })
            ->groupBy('feeds.id')
            ->selectRaw('feeds.id, COUNT(*) as unseen_count')
            ->pluck('unseen_count', 'feeds.id');

        $feeds = Auth::user()->feeds()
            ->with(['entries' => function ($query) {
                $query->latest('published_at')->limit(10);
            }])
            ->get()
            ->map(function ($feed) use ($unseenCounts) {
                // Load category through pivot
                $userFeed = Auth::user()->userFeeds()
                    ->where('feed_id', $feed->id)
                    ->with('category')
                    ->first();

                $feed->category = $userFeed?->category;
                $feed->unseen_count = $unseenCounts->get($feed->id, 0);

                // Clean feed title and description
                $feed->title = html_entity_decode(mb_convert_encoding($feed->title ?? '', 'UTF-8', 'UTF-8'), ENT_QUOTES | ENT_HTML5, 'UTF-8');
                $feed->description = html_entity_decode(mb_convert_encoding($feed->description ?? '', 'UTF-8', 'UTF-8'), ENT_QUOTES | ENT_HTML5, 'UTF-8');

                // Clean entries
                if ($feed->entries) {
                    $feed->entries = $feed->entries->map(function ($entry) {
                        $entry->title = html_entity_decode(mb_convert_encoding($entry->title ?? '', 'UTF-8', 'UTF-8'), ENT_QUOTES | ENT_HTML5, 'UTF-8');
                        $entry->content = html_entity_decode(mb_convert_encoding($entry->content ?? '', 'UTF-8', 'UTF-8'), ENT_QUOTES | ENT_HTML5, 'UTF-8');
                        $entry->excerpt = html_entity_decode(mb_convert_encoding($entry->excerpt ?? '', 'UTF-8', 'UTF-8'), ENT_QUOTES | ENT_HTML5, 'UTF-8');
                        $entry->author = html_entity_decode(mb_convert_encoding($entry->author ?? '', 'UTF-8', 'UTF-8'), ENT_QUOTES | ENT_HTML5, 'UTF-8');

                        return $entry;
                    });
                }

                return $feed;
            });

        $categories = Auth::user()->categories()
            ->withCount('userFeeds')
            ->orderBy('sort_order')
            ->get()
            ->map(function ($category) {
                // Clean category name
                $category->name = mb_convert_encoding($category->name ?? '', 'UTF-8', 'UTF-8');

                return $category;
            });

        // Get accurate unseen count (entries with no read record OR is_read = false)
        $unseenCount = DB::table('entries')
            ->join('feeds', 'feeds.id', '=', 'entries.feed_id')
            ->join('user_feeds', function ($join) {
                $join->on('user_feeds.feed_id', '=', 'feeds.id')
                    ->where('user_feeds.user_id', '=', Auth::id());
            })
            ->leftJoin('user_entry_reads', function ($join) {
                $join->on('user_entry_reads.entry_id', '=', 'entries.id')
                    ->where('user_entry_reads.user_id', '=', Auth::id());
            })
            ->where(function ($query) {
                $query->whereNull('user_entry_reads.id')
                    ->orWhere('user_entry_reads.is_read', '=', false);
            })
            ->count();

        $stats = [
            'totalChannels' => Auth::user()->feeds()->count(),
            'unseenCount' => $unseenCount,
            'savedCount' => Auth::user()->savedItems()->count(),
        ];

        return Inertia::render('Channels', [
            'channels' => $feeds,
            'categories' => $categories,
            'stats' => $stats,
        ]);
    })->name('channels');

    // Feed detail route
    Route::get('/channels/{feed}', function (Feed $feed) {
        $userFeed = UserFeed::where([
            'user_id' => Auth::id(),
            'feed_id' => $feed->id,
        ])->firstOrFail();

        // Load category through pivot
        $userFeedWithCategory = Auth::user()->userFeeds()
            ->where('feed_id', $feed->id)
            ->with('category')
            ->first();

        $feed->category = $userFeedWithCategory?->category;

        // Get unseen count for this feed (entries with no read record OR is_read = false)
        $unseenCount = DB::table('entries')
            ->where('entries.feed_id', $feed->id)
            ->leftJoin('user_entry_reads', function ($join) {
                $join->on('user_entry_reads.entry_id', '=', 'entries.id')
                    ->where('user_entry_reads.user_id', '=', Auth::id());
            })
            ->where(function ($query) {
                $query->whereNull('user_entry_reads.id')
                    ->orWhere('user_entry_reads.is_read', '=', false);
            })
            ->count();

        $feed->unseen_count = $unseenCount;

        // Get entries for this feed
        $entries = $feed->entries()
            ->orderBy('published_at', 'desc')
            ->get()
            ->map(function ($entry) {
                $readStatus = Auth::user()->entryReads()
                    ->where('entry_id', $entry->id)
                    ->first();
                $savedStatus = Auth::user()->savedItems()
                    ->where('entry_id', $entry->id)
                    ->first();

                // Clean UTF-8 data
                $title = html_entity_decode(mb_convert_encoding($entry->title ?? '', 'UTF-8', 'UTF-8'), ENT_QUOTES | ENT_HTML5, 'UTF-8');
                $content = html_entity_decode(mb_convert_encoding($entry->content ?? '', 'UTF-8', 'UTF-8'), ENT_QUOTES | ENT_HTML5, 'UTF-8');
                $excerpt = html_entity_decode(mb_convert_encoding($entry->excerpt ?? '', 'UTF-8', 'UTF-8'), ENT_QUOTES | ENT_HTML5, 'UTF-8');
                $author = html_entity_decode(mb_convert_encoding($entry->author ?? '', 'UTF-8', 'UTF-8'), ENT_QUOTES | ENT_HTML5, 'UTF-8');
                $feedTitle = html_entity_decode(mb_convert_encoding($entry->feed->title ?? '', 'UTF-8', 'UTF-8'), ENT_QUOTES | ENT_HTML5, 'UTF-8');

                return [
                    'id' => $entry->id,
                    'title' => $title,
                    'content' => $content,
                    'excerpt' => $excerpt,
                    'url' => $entry->url,
                    'thumbnail_url' => $entry->thumbnail_url,
                    'author' => $author,
                    'published_at' => $entry->published_at,
                    'feed' => [
                        'id' => $entry->feed->id,
                        'title' => $feedTitle,
                        'url' => $entry->feed->url,
                    ],
                    'is_seen' => $readStatus?->is_read ?? false,
                    'is_saved' => $savedStatus !== null,
                    'seen_id' => $readStatus?->id,
                    'saved_id' => $savedStatus?->id,
                ];
            })
            ->sortByDesc('published_at')
            ->values();

        // Clean feed data
        $feed->title = html_entity_decode(mb_convert_encoding($feed->title ?? '', 'UTF-8', 'UTF-8'), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $feed->description = html_entity_decode(mb_convert_encoding($feed->description ?? '', 'UTF-8', 'UTF-8'), ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return Inertia::render('ChannelDetail', [
            'channel' => $feed,
            'videos' => $entries,
            'categories' => Auth::user()->categories()
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
                ->prepend((object) ['id' => null, 'name' => 'None'])
                ->prepend((object) ['id' => 'podcasts', 'name' => 'Podcasts']),
        ]);
    })->name('channels.show');

    Route::post('/channels', function (Request $request) {
        $validated = $request->validate([
            'url' => 'required|url',
            'category_id' => 'nullable|exists:categories,id',
        ]);

        // Check if user already subscribed to this feed
        $existingFeed = Feed::where('feed_url', $validated['url'])
            ->orWhere('url', $validated['url'])
            ->first();

        if ($existingFeed) {
            $existingSubscription = UserFeed::where([
                'user_id' => Auth::id(),
                'feed_id' => $existingFeed->id,
            ])->first();

            if ($existingSubscription) {
                return back()->withErrors([
                    'url' => 'You are already subscribed to this channel',
                ]);
            }
        }

        // Dispatch job to fetch and create feed
        \App\Jobs\FetchFeedJob::dispatch(
            $validated['url'],
            Auth::id(),
            $validated['category_id'] ?? null
        );

        return back()->with('success', 'Channel is being processed. It will appear in your channels shortly.');
    });

    Route::delete('/channels/{feed}', function (Feed $feed) {
        $userFeed = UserFeed::where([
            'user_id' => Auth::id(),
            'feed_id' => $feed->id,
        ])->firstOrFail();

        $userFeed->delete();

        return back()->with('success', 'Channel removed successfully.');
    });

    Route::put('/channels/{feed}/category', function (Feed $feed, Request $request) {
        $userFeed = UserFeed::where([
            'user_id' => Auth::id(),
            'feed_id' => $feed->id,
        ])->firstOrFail();

        $categoryId = $request->input('category_id');

        // Handle "podcasts" special value
        if ($categoryId === 'podcasts') {
            $category = \App\Models\Category::firstOrCreate(
                ['user_id' => Auth::id(), 'name' => 'Podcasts'],
                ['sort_order' => -1]
            );
            $categoryId = $category->id;
        } elseif ($categoryId === 'none' || $categoryId === null || $categoryId === '') {
            $categoryId = null;
        } else {
            // Verify user owns the category if provided
            $category = \App\Models\Category::where([
                'id' => $categoryId,
                'user_id' => Auth::id(),
            ])->firstOrFail();
        }

        $userFeed->update([
            'category_id' => $categoryId,
        ]);

        return back()->with('success', 'Channel category updated successfully.');
    });

    Route::post('/channels/{feed}/refresh', function (Feed $feed) {
        UserFeed::where([
            'user_id' => Auth::id(),
            'feed_id' => $feed->id,
        ])->firstOrFail();

        // Dispatch job to refresh feed
        \App\Jobs\FetchFeedJob::dispatch($feed->feed_url);

        return back()->with('success', 'Channel refresh has been queued.');
    });

    Route::post('/channels/{feed}/mark-all-seen', function (Feed $feed) {
        UserFeed::where([
            'user_id' => Auth::id(),
            'feed_id' => $feed->id,
        ])->firstOrFail();

        // Mark all entries for this feed as read
        $feed->entries()->get()->each(function ($entry) {
            UserEntryRead::updateOrCreate([
                'user_id' => Auth::id(),
                'entry_id' => $entry->id,
            ], [
                'is_read' => true,
                'read_at' => now(),
            ]);
        });

        return back()->with('success', 'All items marked as seen.');
    });

    Route::post('/videos/mark-all-seen', function () {
        // Mark all user's entries as read
        Auth::user()->feeds()->get()->each(function ($feed) {
            $feed->entries()->get()->each(function ($entry) {
                UserEntryRead::updateOrCreate([
                    'user_id' => Auth::id(),
                    'entry_id' => $entry->id,
                ], [
                    'is_read' => true,
                    'read_at' => now(),
                ]);
            });
        });

        return back()->with('success', 'All items marked as seen.');
    });

    Route::post('/videos/refresh-all', function () {
        // Get all user's feeds with their last fetch time
        $feeds = Auth::user()->feeds()->get();

        // Only refresh feeds that haven't been updated in the last 5 minutes
        $feedsToRefresh = $feeds->filter(function ($feed) {
            return ! $feed->last_fetched_at ||
                   $feed->last_fetched_at->lt(now()->subMinutes(5));
        });

        // Dispatch jobs with a specific queue for better performance
        foreach ($feedsToRefresh as $feed) {
            \App\Jobs\FetchFeedJob::dispatch($feed->feed_url)
                ->onQueue('feeds');
        }

        $refreshedCount = $feedsToRefresh->count();
        $skippedCount = $feeds->count() - $refreshedCount;

        $message = "Queued {$refreshedCount} channel(s) for refresh.";
        if ($skippedCount > 0) {
            $message .= " Skipped {$skippedCount} recently updated channel(s).";
        }

        return back()->with('success', $message);
    });

    // Save user preference
    Route::post('/preferences', function (Request $request) {
        $validated = $request->validate([
            'key' => 'required|string',
            'value' => 'required|string',
        ]);

        \App\Models\UserPreference::set(
            Auth::id(),
            $validated['key'],
            $validated['value']
        );

        return back();
    });

    // Entry routes
    Route::post('/videos/{entry}/seen', [DashboardController::class, 'markAsRead']);

    Route::delete('/videos/{entry}/seen', [DashboardController::class, 'markAsUnseen']);

    Route::post('/videos/{entry}/save', function (\App\Models\Entry $entry, Request $request) {
        // Verify user has access to this entry
        $hasAccess = Auth::user()->feeds()
            ->whereHas('entries', function ($q) use ($entry) {
                $q->where('id', $entry->id);
            })->exists();

        if (! $hasAccess) {
            abort(403);
        }

        SavedItem::firstOrCreate([
            'user_id' => Auth::id(),
            'entry_id' => $entry->id,
        ]);

        if ($request->header('X-Fetch')) {
            return response()->json(['success' => true]);
        }

        return back();
    });

    Route::delete('/videos/{entry}/save', function (\App\Models\Entry $entry, Request $request) {
        $savedItem = SavedItem::where([
            'user_id' => Auth::id(),
            'entry_id' => $entry->id,
        ])->first();

        if ($savedItem) {
            $savedItem->delete();
        }

        if ($request->header('X-Fetch')) {
            return response()->json(['success' => true]);
        }

        return back();
    });
});

require __DIR__.'/settings.php';
