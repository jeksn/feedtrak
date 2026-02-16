<?php

namespace App\Http\Controllers;

use App\Models\Entry;
use App\Models\Feed;
use App\Models\UserEntryRead;
use App\Models\UserPreference;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

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
        $savedCount = $user->savedItems()->count();

        // Get entries for different tabs with pagination
        $page = request()->get('page', 1);
        $perPage = 20;

        // Get all entries query
        $entriesQuery = DB::table('entries')
            ->join('feeds', 'feeds.id', '=', 'entries.feed_id')
            ->join('user_feeds', function ($join) use ($user) {
                $join->on('user_feeds.feed_id', '=', 'feeds.id')
                    ->where('user_feeds.user_id', '=', $user->id);
            })
            ->leftJoin('user_entry_reads', function ($join) use ($user) {
                $join->on('user_entry_reads.entry_id', '=', 'entries.id')
                    ->where('user_entry_reads.user_id', '=', $user->id);
            })
            ->leftJoin('saved_items', function ($join) use ($user) {
                $join->on('saved_items.entry_id', '=', 'entries.id')
                    ->where('saved_items.user_id', '=', $user->id);
            })
            ->select([
                'entries.id',
                'entries.title',
                'entries.content',
                'entries.excerpt',
                'entries.url',
                'entries.thumbnail_url',
                'entries.author',
                'entries.published_at',
                'entries.feed_id',
                'feeds.title as feed_title',
                'feeds.url as feed_url',
                'user_entry_reads.id as read_id',
                'user_entry_reads.is_read',
                'saved_items.id as saved_id',
            ])
            ->orderBy('entries.published_at', 'desc');

        // Get paginated entries
        $paginatedEntries = $entriesQuery->paginate($perPage, ['*'], 'page', $page);

        // Format entries for frontend
        $allEntries = $paginatedEntries->getCollection()->map(function ($entry) {
            // Clean up any malformed UTF-8
            $title = $this->cleanUtf8($entry->title);
            $content = $this->cleanUtf8($entry->content);
            $excerpt = $this->cleanUtf8($entry->excerpt);
            $author = $this->cleanUtf8($entry->author);
            $feedTitle = $this->cleanUtf8($entry->feed_title);

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
                    'id' => $entry->feed_id,
                    'title' => $feedTitle,
                    'url' => $entry->feed_url,
                ],
                'is_read' => $entry->is_read ?? false,
                'is_saved' => $entry->saved_id !== null,
                'read_id' => $entry->read_id,
                'saved_id' => $entry->saved_id,
            ];
        });

        // Get unread count (no limit for accurate count)
        $unreadCount = DB::table('entries')
            ->join('feeds', 'feeds.id', '=', 'entries.feed_id')
            ->join('user_feeds', function ($join) use ($user) {
                $join->on('user_feeds.feed_id', '=', 'feeds.id')
                    ->where('user_feeds.user_id', '=', $user->id);
            })
            ->leftJoin('user_entry_reads', function ($join) use ($user) {
                $join->on('user_entry_reads.entry_id', '=', 'entries.id')
                    ->where('user_entry_reads.user_id', '=', $user->id);
            })
            ->where(function ($query) {
                $query->whereNull('user_entry_reads.id')
                    ->orWhere('user_entry_reads.is_read', '=', false);
            })
            ->count();

        // Get unread entries with pagination
        $unreadPage = request()->get('unread_page', 1);
        $unreadPaginated = DB::table('entries')
            ->join('feeds', 'feeds.id', '=', 'entries.feed_id')
            ->join('user_feeds', function ($join) use ($user) {
                $join->on('user_feeds.feed_id', '=', 'feeds.id')
                    ->where('user_feeds.user_id', '=', $user->id);
            })
            ->leftJoin('user_entry_reads', function ($join) use ($user) {
                $join->on('user_entry_reads.entry_id', '=', 'entries.id')
                    ->where('user_entry_reads.user_id', '=', $user->id);
            })
            ->where(function ($query) {
                $query->whereNull('user_entry_reads.id')
                    ->orWhere('user_entry_reads.is_read', '=', false);
            })
            ->select('entries.*', 'feeds.title as feed_title', 'feeds.url as feed_url')
            ->orderBy('entries.published_at', 'desc')
            ->paginate($perPage, ['*'], 'unread_page', $unreadPage);

        $unreadEntries = $unreadPaginated->getCollection()->map(function ($entry) {
            return [
                'id' => $entry->id,
                'title' => $this->cleanUtf8($entry->title),
                'content' => $this->cleanUtf8($entry->content),
                'excerpt' => $this->cleanUtf8($entry->excerpt),
                'url' => $entry->url,
                'thumbnail_url' => $entry->thumbnail_url,
                'author' => $this->cleanUtf8($entry->author),
                'published_at' => $entry->published_at,
                'feed' => [
                    'id' => $entry->feed_id,
                    'title' => $this->cleanUtf8($entry->feed_title),
                    'url' => $entry->feed_url,
                ],
                'is_read' => false,
                'is_saved' => false,
                'read_id' => null,
                'saved_id' => null,
            ];
        });

        $unreadPaginationData = [
            'current_page' => $unreadPaginated->currentPage(),
            'last_page' => $unreadPaginated->lastPage(),
            'per_page' => $unreadPaginated->perPage(),
            'total' => $unreadPaginated->total(),
            'has_more' => $unreadPaginated->hasMorePages(),
        ];

        // Get saved entries with pagination
        $savedPage = request()->get('saved_page', 1);
        $savedPaginated = DB::table('saved_items')
            ->join('entries', 'entries.id', '=', 'saved_items.entry_id')
            ->join('feeds', 'feeds.id', '=', 'entries.feed_id')
            ->leftJoin('user_entry_reads', function ($join) use ($user) {
                $join->on('user_entry_reads.entry_id', '=', 'entries.id')
                    ->where('user_entry_reads.user_id', '=', $user->id);
            })
            ->where('saved_items.user_id', '=', $user->id)
            ->select([
                'entries.id',
                'entries.title',
                'entries.content',
                'entries.excerpt',
                'entries.url',
                'entries.thumbnail_url',
                'entries.author',
                'entries.published_at',
                'entries.feed_id',
                'feeds.title as feed_title',
                'feeds.url as feed_url',
                'user_entry_reads.id as read_id',
                'user_entry_reads.is_read',
                'saved_items.id as saved_id',
            ])
            ->orderBy('saved_items.created_at', 'desc')
            ->paginate($perPage, ['*'], 'saved_page', $savedPage);

        $savedEntries = $savedPaginated->getCollection()->map(function ($savedItem) {
            return [
                'id' => $savedItem->id,
                'title' => $this->cleanUtf8($savedItem->title),
                'content' => $this->cleanUtf8($savedItem->content),
                'excerpt' => $this->cleanUtf8($savedItem->excerpt),
                'url' => $savedItem->url,
                'thumbnail_url' => $savedItem->thumbnail_url,
                'author' => $this->cleanUtf8($savedItem->author),
                'published_at' => $savedItem->published_at,
                'feed' => [
                    'id' => $savedItem->feed_id,
                    'title' => $this->cleanUtf8($savedItem->feed_title),
                    'url' => $savedItem->feed_url,
                ],
                'is_read' => $savedItem->is_read ?? false,
                'is_saved' => true,
                'read_id' => $savedItem->read_id,
                'saved_id' => $savedItem->saved_id,
            ];
        });

        $savedPaginationData = [
            'current_page' => $savedPaginated->currentPage(),
            'last_page' => $savedPaginated->lastPage(),
            'per_page' => $savedPaginated->perPage(),
            'total' => $savedPaginated->total(),
            'has_more' => $savedPaginated->hasMorePages(),
        ];

        // Prepare pagination data
        $paginationData = [
            'current_page' => $paginatedEntries->currentPage(),
            'last_page' => $paginatedEntries->lastPage(),
            'per_page' => $paginatedEntries->perPage(),
            'total' => $paginatedEntries->total(),
            'has_more' => $paginatedEntries->hasMorePages(),
        ];

        $stats = [
            'totalFeeds' => $totalFeeds,
            'unreadCount' => $unreadCount,
            'savedCount' => $savedCount,
        ];

        $entries = [
            'all' => $allEntries->values(),
            'unread' => $unreadEntries,
            'saved' => $savedEntries,
        ];

        // Get categories for the feed form
        $categories = $user->categories()->orderBy('sort_order')->get();

        // Get user's view preference
        $entryViewMode = UserPreference::get($user->id, 'entry_view_mode', 'list');

        return inertia('Home', [
            'stats' => $stats,
            'entries' => $entries,
            'pagination' => $paginationData,
            'unreadPagination' => $unreadPaginationData,
            'savedPagination' => $savedPaginationData,
            'categories' => $categories,
            'entryViewMode' => $entryViewMode,
        ]);
    }

    private function cleanUtf8($string)
    {
        if (is_null($string)) {
            return null;
        }

        // Decode HTML entities
        $string = html_entity_decode($string, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // Remove invalid UTF-8 sequences
        return mb_convert_encoding($string, 'UTF-8', 'UTF-8');
    }

    public function markAsRead(Request $request, Entry $entry)
    {
        $user = Auth::user();

        // Verify user has access to this entry
        $hasAccess = $user->feeds()
            ->whereHas('entries', function ($q) use ($entry) {
                $q->where('id', $entry->id);
            })->exists();

        if (! $hasAccess) {
            abort(403);
        }

        UserEntryRead::updateOrCreate([
            'user_id' => $user->id,
            'entry_id' => $entry->id,
        ], [
            'is_read' => true,
            'read_at' => now(),
        ]);

        if ($request->header('X-Fetch')) {
            return response()->json(['success' => true]);
        }

        return back();
    }

    public function markAsUnread(Request $request, Entry $entry)
    {
        $user = Auth::user();

        $readStatus = UserEntryRead::where([
            'user_id' => $user->id,
            'entry_id' => $entry->id,
        ])->first();

        if ($readStatus) {
            $readStatus->update([
                'is_read' => false,
                'read_at' => null,
            ]);
        }

        if ($request->header('X-Fetch')) {
            return response()->json(['success' => true]);
        }

        return back();
    }
}
