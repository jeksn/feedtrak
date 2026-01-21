<?php

namespace App\Http\Controllers;

use App\Models\Feed;
use App\Models\Category;
use App\Models\SavedItem;
use App\Models\UserEntryRead;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DashboardController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = Auth::user();
        
        // Auto-refresh stale feeds (older than 30 minutes)
        $staleFeeds = $user->feeds()
            ->where(function ($query) {
                $query->whereNull('last_fetched_at')
                      ->orWhere('last_fetched_at', '<', now()->subMinutes(30));
            })
            ->get();
            
        foreach ($staleFeeds as $feed) {
            \App\Jobs\FetchFeedJob::dispatch($feed->feed_url);
        }
        
        // Get categories with feed counts
        $categories = $user->categories()
            ->withCount('userFeeds')
            ->orderBy('sort_order')
            ->get();
        
        // Get stats
        $totalFeeds = $user->feeds()->count();
        $unreadCount = $user->entryReads()
            ->where('is_read', false)
            ->count();
        $savedCount = $user->savedItems()->count();
        
        $stats = [
            'totalFeeds' => $totalFeeds,
            'unreadCount' => $unreadCount,
            'savedCount' => $savedCount,
        ];
        
        // Get entries for different tabs
        $allEntries = $user->feeds()
            ->with(['entries' => function ($query) {
                $query->orderBy('published_at', 'desc')->limit(50);
            }])
            ->get()
            ->flatMap->entries
            ->map(function ($entry) use ($user) {
                $readStatus = $user->entryReads()
                    ->where('entry_id', $entry->id)
                    ->first();
                $savedStatus = $user->savedItems()
                    ->where('entry_id', $entry->id)
                    ->first();
                    
                return [
                    'id' => $entry->id,
                    'title' => $entry->title,
                    'content' => $entry->content,
                    'excerpt' => $entry->excerpt,
                    'url' => $entry->url,
                    'thumbnail_url' => $entry->thumbnail_url,
                    'author' => $entry->author,
                    'published_at' => $entry->published_at,
                    'feed' => [
                        'id' => $entry->feed->id,
                        'title' => $entry->feed->title,
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
        
        $unreadEntries = $allEntries->where('is_read', false)->values();
        $savedEntries = $allEntries->where('is_saved', true)->values();
        
        $entries = [
            'all' => $allEntries->values(),
            'unread' => $unreadEntries,
            'saved' => $savedEntries,
        ];
        
        return inertia('Dashboard', [
            'categories' => $categories,
            'stats' => $stats,
            'entries' => $entries,
        ]);
    }
}
