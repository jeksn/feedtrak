<?php

namespace App\Http\Controllers;

use App\Models\Entry;
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
                'feeds.title as channel_title',
                'feeds.url as channel_url',
                'feeds.content_type',
                'user_entry_reads.id as seen_id',
                'user_entry_reads.is_read',
                'saved_items.id as saved_id',
            ])
            ->when($contentType, fn ($q) => $q->where('feeds.content_type', $contentType))
            ->orderBy('entries.published_at', 'desc');

        // Get paginated entries
        $paginatedVideos = $entriesQuery->paginate($perPage, ['*'], 'page', $page);

        // Format entries for frontend
        $allVideos = $paginatedVideos->getCollection()->map(function ($video) {
            // Clean up any malformed UTF-8
            $title = $this->cleanUtf8($video->title);
            $content = $this->cleanUtf8($video->content);
            $excerpt = $this->cleanUtf8($video->excerpt);
            $author = $this->cleanUtf8($video->author);
            $channelTitle = $this->cleanUtf8($video->channel_title);

            return [
                'id' => $video->id,
                'title' => $title,
                'content' => $content,
                'excerpt' => $excerpt,
                'url' => $video->url,
                'thumbnail_url' => $video->thumbnail_url,
                'author' => $author,
                'published_at' => $video->published_at,
                'channel' => [
                    'id' => $video->feed_id,
                    'title' => $channelTitle,
                    'url' => $video->channel_url,
                ],
                'content_type' => $video->content_type ?? 'youtube',
                'is_seen' => $video->is_read ?? false,
                'is_saved' => $video->saved_id !== null,
                'seen_id' => $video->seen_id,
                'saved_id' => $video->saved_id,
            ];
        });

        // Get unseen count (no limit for accurate count)
        $unseenCount = DB::table('entries')
            ->join('feeds', 'feeds.id', '=', 'entries.feed_id')
            ->join('user_feeds', function ($join) use ($user) {
                $join->on('user_feeds.feed_id', '=', 'feeds.id')
                    ->where('user_feeds.user_id', '=', $user->id);
            })
            ->when($contentType, fn ($q) => $q->where('feeds.content_type', $contentType))
            ->leftJoin('user_entry_reads', function ($join) use ($user) {
                $join->on('user_entry_reads.entry_id', '=', 'entries.id')
                    ->where('user_entry_reads.user_id', '=', $user->id);
            })
            ->where(fn ($q) => $q->whereNull('user_entry_reads.id')->orWhere('user_entry_reads.is_read', '=', false))
            ->count();

        // Get unseen entries with pagination
        $unseenPage = request()->get('unseen_page', 1);
        $unseenPaginated = DB::table('entries')
            ->join('feeds', 'feeds.id', '=', 'entries.feed_id')
            ->join('user_feeds', function ($join) use ($user) {
                $join->on('user_feeds.feed_id', '=', 'feeds.id')
                    ->where('user_feeds.user_id', '=', $user->id);
            })
            ->when($contentType, fn ($q) => $q->where('feeds.content_type', $contentType))
            ->leftJoin('user_entry_reads', function ($join) use ($user) {
                $join->on('user_entry_reads.entry_id', '=', 'entries.id')
                    ->where('user_entry_reads.user_id', '=', $user->id);
            })
            ->where(fn ($q) => $q->whereNull('user_entry_reads.id')->orWhere('user_entry_reads.is_read', '=', false))
            ->select('entries.*', 'feeds.title as channel_title', 'feeds.url as channel_url', 'feeds.content_type')
            ->orderBy('entries.published_at', 'desc')
            ->paginate($perPage, ['*'], 'unseen_page', $unseenPage);

        $unseenVideos = $unseenPaginated->getCollection()->map(function ($video) {
            return [
                'id' => $video->id,
                'title' => $this->cleanUtf8($video->title),
                'content' => $this->cleanUtf8($video->content),
                'excerpt' => $this->cleanUtf8($video->excerpt),
                'url' => $video->url,
                'thumbnail_url' => $video->thumbnail_url,
                'author' => $this->cleanUtf8($video->author),
                'published_at' => $video->published_at,
                'channel' => [
                    'id' => $video->feed_id,
                    'title' => $this->cleanUtf8($video->channel_title),
                    'url' => $video->channel_url,
                ],
                'content_type' => $video->content_type ?? 'youtube',
                'is_seen' => false,
                'is_saved' => false,
                'seen_id' => null,
                'saved_id' => null,
            ];
        });

        $unseenPaginationData = [
            'current_page' => $unseenPaginated->currentPage(),
            'last_page' => $unseenPaginated->lastPage(),
            'per_page' => $unseenPaginated->perPage(),
            'total' => $unseenPaginated->total(),
            'has_more' => $unseenPaginated->hasMorePages(),
        ];

        // Get saved entries with pagination
        $savedPage = request()->get('saved_page', 1);
        $savedPaginated = DB::table('saved_items')
            ->join('entries', 'entries.id', '=', 'saved_items.entry_id')
            ->join('feeds', 'feeds.id', '=', 'entries.feed_id')
            ->when($contentType, fn ($q) => $q->where('feeds.content_type', $contentType))
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
                'feeds.title as channel_title',
                'feeds.url as channel_url',
                'feeds.content_type',
                'user_entry_reads.id as seen_id',
                'user_entry_reads.is_read',
                'saved_items.id as saved_id',
            ])
            ->orderBy('saved_items.created_at', 'desc')
            ->paginate($perPage, ['*'], 'saved_page', $savedPage);

        $savedVideos = $savedPaginated->getCollection()->map(function ($savedItem) {
            return [
                'id' => $savedItem->id,
                'title' => $this->cleanUtf8($savedItem->title),
                'content' => $this->cleanUtf8($savedItem->content),
                'excerpt' => $this->cleanUtf8($savedItem->excerpt),
                'url' => $savedItem->url,
                'thumbnail_url' => $savedItem->thumbnail_url,
                'author' => $this->cleanUtf8($savedItem->author),
                'published_at' => $savedItem->published_at,
                'channel' => [
                    'id' => $savedItem->feed_id,
                    'title' => $this->cleanUtf8($savedItem->channel_title),
                    'url' => $savedItem->channel_url,
                ],
                'content_type' => $savedItem->content_type ?? 'youtube',
                'is_seen' => $savedItem->is_read ?? false,
                'is_saved' => true,
                'seen_id' => $savedItem->seen_id,
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
