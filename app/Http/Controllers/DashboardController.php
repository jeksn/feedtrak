<?php

namespace App\Http\Controllers;

use App\Models\Entry;
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
        $contentType = $request->get('type');

        // Auto-refresh stale feeds (older than 30 minutes)
        $staleChannels = $user->feeds()
            ->when($contentType, fn ($q) => $q->where('content_type', $contentType))
            ->where(fn ($q) => $q->whereNull('last_fetched_at')->orWhere('last_fetched_at', '<', now()->subMinutes(30)))
            ->get();

        foreach ($staleChannels as $feed) {
            \App\Jobs\FetchFeedJob::dispatch($feed->feed_url)->onQueue('feeds');
        }

        // Get stats - filtered by type if specified
        $totalChannels = $user->feeds()
            ->when($contentType, fn ($q) => $q->where('content_type', $contentType))
            ->count();
        $savedCount = $user->savedItems()->count();

        // Get entries for different tabs with pagination
        $page = request()->get('page', 1);
        $perPage = 20;

        // Get all entries query using Eloquent
        $entriesQuery = Entry::query()
            ->whereHas('feed.userFeeds', function ($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->with(['feed', 'entryReads', 'savedItems'])
            ->when($contentType, fn ($q) => $q->whereHas('feed', fn ($q) => $q->where('content_type', $contentType)))
            ->orderBy('published_at', 'desc');

        // Get paginated entries
        $paginatedVideos = $entriesQuery->paginate($perPage, ['*'], 'page', $page);

        // Format entries for frontend
        $allVideos = $paginatedVideos->getCollection()->map(function ($entry) {
            // Clean up any malformed UTF-8
            $title = $this->cleanUtf8($entry->title);
            $content = $this->cleanUtf8($entry->content);
            $excerpt = $this->cleanUtf8($entry->excerpt);
            $author = $this->cleanUtf8($entry->author);
            $channelTitle = $this->cleanUtf8($entry->feed->title ?? '');
            $channelUrl = $entry->feed->url ?? '';

            $entryRead = $entry->entryReads->first();
            $savedItem = $entry->savedItems->first();

            return [
                'id' => $entry->id,
                'title' => $title,
                'content' => $content,
                'excerpt' => $excerpt,
                'url' => $entry->url,
                'thumbnail_url' => $entry->thumbnail_url,
                'author' => $author,
                'published_at' => $entry->published_at,
                'channel' => [
                    'id' => $entry->feed_id,
                    'title' => $channelTitle,
                    'url' => $channelUrl,
                ],
                'content_type' => $entry->feed->content_type ?? 'youtube',
                'is_seen' => $entryRead?->is_read ?? false,
                'is_saved' => $savedItem !== null,
                'seen_id' => $entryRead?->id,
                'saved_id' => $savedItem?->id,
            ];
        });

        // Get unseen count using Eloquent
        $unseenCount = Entry::query()
            ->whereHas('feed.userFeeds', function ($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->whereDoesntHave('entryReads', function ($query) {
                $query->where('is_read', true);
            })
            ->count();

        // Get unseen entries with pagination using Eloquent
        $unseenPage = request()->get('unseen_page', 1);
        $unseenPaginated = Entry::query()
            ->whereHas('feed.userFeeds', function ($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->when($contentType, fn ($q) => $q->whereHas('feed', fn ($q) => $q->where('content_type', $contentType)))
            ->whereDoesntHave('entryReads', function ($query) {
                $query->where('is_read', true);
            })
            ->with(['feed', 'savedItems'])
            ->orderBy('published_at', 'desc')
            ->paginate($perPage, ['*'], 'unseen_page', $unseenPage);

        $unseenVideos = $unseenPaginated->getCollection()->map(function ($entry) {
            $savedItem = $entry->savedItems->first();
            return [
                'id' => $entry->id,
                'title' => $this->cleanUtf8($entry->title),
                'content' => $this->cleanUtf8($entry->content),
                'excerpt' => $this->cleanUtf8($entry->excerpt),
                'url' => $entry->url,
                'thumbnail_url' => $entry->thumbnail_url,
                'author' => $this->cleanUtf8($entry->author),
                'published_at' => $entry->published_at,
                'channel' => [
                    'id' => $entry->feed_id,
                    'title' => $this->cleanUtf8($entry->feed->title ?? ''),
                    'url' => $entry->feed->url ?? '',
                ],
                'content_type' => $entry->feed->content_type ?? 'youtube',
                'is_seen' => false,
                'is_saved' => $savedItem !== null,
                'seen_id' => null,
                'saved_id' => $savedItem?->id,
            ];
        });

        $unseenPaginationData = [
            'current_page' => $unseenPaginated->currentPage(),
            'last_page' => $unseenPaginated->lastPage(),
            'per_page' => $unseenPaginated->perPage(),
            'total' => $unseenPaginated->total(),
            'has_more' => $unseenPaginated->hasMorePages(),
        ];

        // Get saved entries with pagination using Eloquent
        $savedPage = request()->get('saved_page', 1);
        $savedPaginated = SavedItem::query()
            ->where('user_id', $user->id)
            ->when($contentType, fn ($q) => $q->whereHas('entry.feed', fn ($q) => $q->where('content_type', $contentType)))
            ->with(['entry.feed', 'entry.entryReads'])
            ->orderByDesc('created_at')
            ->paginate($perPage, ['*'], 'saved_page', $savedPage);

        $savedVideos = $savedPaginated->getCollection()->map(function ($savedItem) {
            $entry = $savedItem->entry;
            $entryRead = $entry->entryReads->first();
            return [
                'id' => $entry->id,
                'title' => $this->cleanUtf8($entry->title),
                'content' => $this->cleanUtf8($entry->content),
                'excerpt' => $this->cleanUtf8($entry->excerpt),
                'url' => $entry->url,
                'thumbnail_url' => $entry->thumbnail_url,
                'author' => $this->cleanUtf8($entry->author),
                'published_at' => $entry->published_at,
                'channel' => [
                    'id' => $entry->feed_id,
                    'title' => $this->cleanUtf8($entry->feed->title ?? ''),
                    'url' => $entry->feed->url ?? '',
                ],
                'content_type' => $entry->feed->content_type ?? 'youtube',
                'is_seen' => $entryRead?->is_read ?? false,
                'is_saved' => true,
                'seen_id' => $entryRead?->id,
                'saved_id' => $savedItem->id,
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
            'current_page' => $paginatedVideos->currentPage(),
            'last_page' => $paginatedVideos->lastPage(),
            'per_page' => $paginatedVideos->perPage(),
            'total' => $paginatedVideos->total(),
            'has_more' => $paginatedVideos->hasMorePages(),
        ];

        $stats = [
            'totalChannels' => $totalChannels,
            'unseenCount' => $unseenCount,
            'savedCount' => $savedCount,
        ];

        $videos = [
            'all' => $allVideos->values(),
            'unseen' => $unseenVideos,
            'saved' => $savedVideos,
        ];

        // Get categories for the channel form
        $categories = $user->categories()->orderBy('sort_order')->get();

        // Get user's view preference
        $videoViewMode = UserPreference::get($user->id, 'video_view_mode', 'list');

        $pageTitle = $request->get('title', 'Home');

        return inertia('Home', [
            'pageTitle' => $pageTitle,
            'stats' => $stats,
            'videos' => $videos,
            'pagination' => $paginationData,
            'unseenPagination' => $unseenPaginationData,
            'savedPagination' => $savedPaginationData,
            'categories' => $categories,
            'videoViewMode' => $videoViewMode,
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

    public function markAsUnseen(Request $request, Entry $entry)
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
