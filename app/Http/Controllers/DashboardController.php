<?php

namespace App\Http\Controllers;

use App\Models\Feed;
use App\Models\Category;
use App\Models\SavedItem;
use App\Models\UserEntryRead;
use App\Models\UserPreference;
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
            \App\Jobs\FetchFeedJob::dispatch($feed->feed_url)->onQueue('feeds');
        }
        
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
                
                // Clean up any malformed UTF-8
                $title = $this->cleanUtf8($entry->title);
                $content = $this->cleanUtf8($entry->content);
                $excerpt = $this->cleanUtf8($entry->excerpt);
                $author = $this->cleanUtf8($entry->author);
                $feedTitle = $this->cleanUtf8($entry->feed->title);
                    
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
        
        $unreadEntries = $allEntries->where('is_read', false)->values();
        $savedEntries = $allEntries->where('is_saved', true)->values();
        
        $entries = [
            'all' => $allEntries->values(),
            'unread' => $unreadEntries,
            'saved' => $savedEntries,
        ];
        
        // Get categories for the feed form
        $categories = $user->categories()->orderBy('sort_order')->get();
        
        // Get user's view preference
        $entryViewMode = UserPreference::get($user->id, 'entry_view_mode', 'list');
        
        return inertia('Dashboard', [
            'stats' => $stats,
            'entries' => $entries,
            'categories' => $categories,
            'entryViewMode' => $entryViewMode,
        ]);
    }
    
    private function cleanUtf8($string)
    {
        if (is_null($string)) {
            return null;
        }
        
        // Decode HTML entities first
        $string = html_entity_decode($string, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        
        // Remove invalid UTF-8 sequences
        $string = mb_convert_encoding($string, 'UTF-8', 'UTF-8');
        
        // Remove any remaining non-UTF-8 characters
        $string = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $string);
        
        return $string;
    }
}
