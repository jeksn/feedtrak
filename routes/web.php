<?php

use App\Http\Controllers\DashboardController;
use App\Models\Feed;
use App\Models\SavedItem;
use App\Models\UserEntryRead;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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

        // Move feeds from this category to uncategorized
        Auth::user()->userFeeds()
            ->where('category_id', $category->id)
            ->update(['category_id' => null]);

        $category->delete();

        return back()->with('success', 'Category deleted successfully.');
    });

    // Feed routes
    Route::get('/feeds', function () {
        // Get unread counts (entries with no read record OR is_read = false)
        $unreadCounts = DB::table('entries')
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
            ->selectRaw('feeds.id, COUNT(*) as unread_count')
            ->pluck('unread_count', 'feeds.id');

        $feeds = Auth::user()->feeds()
            ->with(['entries' => function ($query) {
                $query->latest()->limit(10);
            }])
            ->get()
            ->map(function ($feed) use ($unreadCounts) {
                // Load category through pivot
                $userFeed = Auth::user()->userFeeds()
                    ->where('feed_id', $feed->id)
                    ->with('category')
                    ->first();

                $feed->category = $userFeed?->category;
                $feed->unread_count = $unreadCounts->get($feed->id, 0);

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

        // Get accurate unread count (entries with no read record OR is_read = false)
        $unreadCount = DB::table('entries')
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
            'totalFeeds' => Auth::user()->feeds()->count(),
            'unreadCount' => $unreadCount,
            'savedCount' => Auth::user()->savedItems()->count(),
        ];

        return Inertia::render('Feeds', [
            'feeds' => $feeds,
            'categories' => $categories,
            'stats' => $stats,
        ]);
    })->name('feeds');

    // Feed detail route
    Route::get('/feeds/{feed}', function (\App\Models\Feed $feed) {
        $userFeed = \App\Models\UserFeed::where([
            'user_id' => Auth::id(),
            'feed_id' => $feed->id,
        ])->firstOrFail();

        // Load category through pivot
        $userFeedWithCategory = Auth::user()->userFeeds()
            ->where('feed_id', $feed->id)
            ->with('category')
            ->first();

        $feed->category = $userFeedWithCategory?->category;

        // Get unread count for this feed (entries with no read record OR is_read = false)
        $unreadCount = DB::table('entries')
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

        $feed->unread_count = $unreadCount;

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
                    'is_read' => $readStatus?->is_read ?? false,
                    'is_saved' => $savedStatus !== null,
                    'read_id' => $readStatus?->id,
                    'saved_id' => $savedStatus?->id,
                ];
            })
            ->sortByDesc('published_at')
            ->values();

        // Clean feed data
        $feed->title = html_entity_decode(mb_convert_encoding($feed->title ?? '', 'UTF-8', 'UTF-8'), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $feed->description = html_entity_decode(mb_convert_encoding($feed->description ?? '', 'UTF-8', 'UTF-8'), ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return Inertia::render('FeedDetail', [
            'feed' => $feed,
            'entries' => $entries,
        ]);
    })->name('feeds.show');

    Route::post('/feeds', function (Request $request) {
        $validated = $request->validate([
            'url' => 'required|url',
            'category_id' => 'nullable|exists:categories,id',
        ]);

        // Check if user already subscribed to this feed
        $existingFeed = Feed::where('url', $validated['url'])->first();

        if ($existingFeed) {
            $existingSubscription = \App\Models\UserFeed::where([
                'user_id' => Auth::id(),
                'feed_id' => $existingFeed->id,
            ])->first();

            if ($existingSubscription) {
                return back()->withErrors([
                    'url' => 'You are already subscribed to this feed',
                ]);
            }
        }

        // Dispatch job to fetch and create feed
        \App\Jobs\FetchFeedJob::dispatch(
            $validated['url'],
            Auth::id(),
            $validated['category_id'] ?? null
        );

        return back()->with('success', 'Feed is being processed. It will appear in your feeds shortly.');
    });

    Route::delete('/feeds/{feed}', function (\App\Models\Feed $feed) {
        $userFeed = \App\Models\UserFeed::where([
            'user_id' => Auth::id(),
            'feed_id' => $feed->id,
        ])->firstOrFail();

        $userFeed->delete();

        return back()->with('success', 'Feed removed successfully.');
    });

    Route::put('/feeds/{feed}/category', function (\App\Models\Feed $feed, Request $request) {
        $userFeed = \App\Models\UserFeed::where([
            'user_id' => Auth::id(),
            'feed_id' => $feed->id,
        ])->firstOrFail();

        $validated = $request->validate([
            'category_id' => 'nullable|exists:categories,id',
        ]);

        // Verify user owns the category if provided
        if ($validated['category_id']) {
            $category = \App\Models\Category::where([
                'id' => $validated['category_id'],
                'user_id' => Auth::id(),
            ])->firstOrFail();
        }

        $userFeed->update([
            'category_id' => $validated['category_id'],
        ]);

        return back()->with('success', 'Feed category updated successfully.');
    });

    Route::post('/feeds/{feed}/refresh', function (\App\Models\Feed $feed) {
        $userFeed = \App\Models\UserFeed::where([
            'user_id' => Auth::id(),
            'feed_id' => $feed->id,
        ])->firstOrFail();

        // Dispatch job to refresh feed
        \App\Jobs\FetchFeedJob::dispatch($feed->feed_url);

        return back()->with('success', 'Feed refresh has been queued.');
    });

    Route::post('/feeds/{feed}/mark-all-read', function (\App\Models\Feed $feed) {
        $userFeed = \App\Models\UserFeed::where([
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

        return back()->with('success', 'All items marked as read.');
    });

    Route::post('/entries/mark-all-read', function () {
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

        return back()->with('success', 'All items marked as read.');
    });

    Route::post('/entries/refresh-all', function () {
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

        $message = "Queued {$refreshedCount} feed(s) for refresh.";
        if ($skippedCount > 0) {
            $message .= " Skipped {$skippedCount} recently updated feed(s).";
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

    // OPML import route
    Route::post('/feeds/import-opml', function (Request $request) {
        $validated = $request->validate([
            'opml_file' => 'required|file|mimes:xml,opml|max:10240', // Max 10MB
        ]);

        try {
            // Ensure we're working with a proper file
            $file = $validated['opml_file'];
            if (! $file->isValid()) {
                throw new \Exception('File upload failed: '.$file->getErrorMessage());
            }

            $opmlContent = file_get_contents($file->getPathname());

            if ($opmlContent === false) {
                throw new \Exception('Failed to read uploaded file');
            }

            // Check if content is empty
            if (empty(trim($opmlContent))) {
                throw new \Exception('The uploaded file is empty');
            }

            $opmlService = app(\App\Services\OpmlService::class);
            $result = $opmlService->importOpml($opmlContent, Auth::id());

            $message = "Import completed: {$result['feeds_imported']} feeds imported, ";
            $message .= "{$result['categories_created']} categories created";

            if ($result['feeds_skipped'] > 0) {
                $message .= ", {$result['feeds_skipped']} feeds skipped (already subscribed)";
            }

            if (! empty($result['errors'])) {
                $message .= '. Some errors occurred: '.implode('; ', array_slice($result['errors'], 0, 3));
                if (count($result['errors']) > 3) {
                    $message .= ' and '.(count($result['errors']) - 3).' more errors';
                }
            }

            return redirect()->back()->with('success', $message);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('OPML import failed', [
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
            ]);

            return redirect()->back()->withErrors(['opml' => $e->getMessage()]);
        }
    })->name('feeds.import-opml');

    // Entry routes
    Route::post('/entries/{entry}/read', [DashboardController::class, 'markAsRead']);

    Route::delete('/entries/{entry}/read', [DashboardController::class, 'markAsUnread']);

    Route::post('/entries/{entry}/save', function (\App\Models\Entry $entry, Request $request) {
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

    Route::delete('/entries/{entry}/save', function (\App\Models\Entry $entry, Request $request) {
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
