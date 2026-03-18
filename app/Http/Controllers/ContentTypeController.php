<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\UserPreference;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ContentTypeController extends Controller
{
    public function __invoke(Request $request)
    {
        $path = $request->path();

        $typeMap = [
            'videos' => 'youtube',
            'feeds' => 'rss',
            'podcasts' => 'podcast',
        ];

        $contentType = $typeMap[$path] ?? null;
        $pageTitle = match ($path) {
            'videos' => 'Videos',
            'feeds' => 'Feeds',
            'podcasts' => 'Podcasts',
            default => 'Home',
        };

        $user = Auth::user();
        $perPage = 20;

        // For podcasts, use category-based filtering
        $podcastCategoryId = null;
        if ($path === 'podcasts') {
            $podcastCategory = $user->categories()->where('name', 'Podcasts')->first();
            if (! $podcastCategory) {
                $podcastCategory = Category::create([
                    'user_id' => $user->id,
                    'name' => 'Podcasts',
                    'sort_order' => -1, // Put at top
                ]);
            }
            $podcastCategoryId = $podcastCategory->id;
        }

        // Get stats
        $totalChannels = $user->feeds()
            ->when($contentType && ! $podcastCategoryId, fn ($q) => $q->where('content_type', $contentType))
            ->when($podcastCategoryId, fn ($q) => $q->whereHas('userFeeds', fn ($q) => $q->where('category_id', $podcastCategoryId)))
            ->count();

        // Saved count - type-specific
        if ($podcastCategoryId) {
            $savedCount = DB::table('saved_items')
                ->join('entries', 'entries.id', '=', 'saved_items.entry_id')
                ->join('user_feeds', fn ($j) => $j->on('user_feeds.feed_id', '=', 'entries.feed_id')->where('user_feeds.user_id', '=', $user->id))
                ->where('saved_items.user_id', '=', $user->id)
                ->where('user_feeds.category_id', '=', $podcastCategoryId)
                ->count();
        } elseif ($contentType) {
            $savedCount = DB::table('saved_items')
                ->join('entries', 'entries.id', '=', 'saved_items.entry_id')
                ->join('feeds', 'feeds.id', '=', 'entries.feed_id')
                ->where('saved_items.user_id', '=', $user->id)
                ->where('feeds.content_type', '=', $contentType)
                ->count();
        } else {
            $savedCount = $user->savedItems()->count();
        }

        // Build content type condition
        $contentTypeCondition = $contentType && ! $podcastCategoryId;

        // Unseen count
        $unseenCount = DB::table('entries')
            ->join('feeds', 'feeds.id', '=', 'entries.feed_id')
            ->join('user_feeds', fn ($join) => $join->on('user_feeds.feed_id', '=', 'feeds.id')->where('user_feeds.user_id', '=', $user->id))
            ->when($contentTypeCondition, fn ($q) => $q->where('feeds.content_type', $contentType))
            ->when($podcastCategoryId, fn ($q) => $q->where('user_feeds.category_id', $podcastCategoryId))
            ->leftJoin('user_entry_reads', fn ($join) => $join->on('user_entry_reads.entry_id', '=', 'entries.id')->where('user_entry_reads.user_id', '=', $user->id))
            ->where(fn ($q) => $q->whereNull('user_entry_reads.id')->orWhere('user_entry_reads.is_read', '=', false))
            ->count();

        // Unseen videos
        $unseenPaginated = DB::table('entries')
            ->join('feeds', 'feeds.id', '=', 'entries.feed_id')
            ->join('user_feeds', fn ($join) => $join->on('user_feeds.feed_id', '=', 'feeds.id')->where('user_feeds.user_id', '=', $user->id))
            ->when($contentTypeCondition, fn ($q) => $q->where('feeds.content_type', $contentType))
            ->when($podcastCategoryId, fn ($q) => $q->where('user_feeds.category_id', $podcastCategoryId))
            ->leftJoin('user_entry_reads', fn ($join) => $join->on('user_entry_reads.entry_id', '=', 'entries.id')->where('user_entry_reads.user_id', '=', $user->id))
            ->leftJoin('saved_items', fn ($join) => $join->on('saved_items.entry_id', '=', 'entries.id')->where('saved_items.user_id', '=', $user->id))
            ->where(fn ($q) => $q->whereNull('user_entry_reads.id')->orWhere('user_entry_reads.is_read', '=', false))
            ->select('entries.*', 'feeds.title as channel_title', 'feeds.url as channel_url', 'feeds.content_type', 'saved_items.id as saved_id')
            ->orderBy('entries.published_at', 'desc')
            ->paginate($perPage);

        $unseenVideos = $unseenPaginated->getCollection()->map(function ($v) {
            return [
                'id' => $v->id,
                'title' => $this->cleanUtf8($v->title),
                'content' => $this->cleanUtf8($v->content),
                'excerpt' => $this->cleanUtf8($v->excerpt),
                'url' => $v->url,
                'thumbnail_url' => $v->thumbnail_url,
                'author' => $this->cleanUtf8($v->author),
                'published_at' => $v->published_at,
                'channel' => ['id' => $v->feed_id, 'title' => $this->cleanUtf8($v->channel_title), 'url' => $v->channel_url],
                'content_type' => $v->content_type ?? 'youtube',
                'is_seen' => false,
                'is_saved' => $v->saved_id !== null,
                'seen_id' => null,
                'saved_id' => $v->saved_id,
            ];
        });

        // All videos (same query, just all)
        $allPaginated = DB::table('entries')
            ->join('feeds', 'feeds.id', '=', 'entries.feed_id')
            ->join('user_feeds', fn ($join) => $join->on('user_feeds.feed_id', '=', 'feeds.id')->where('user_feeds.user_id', '=', $user->id))
            ->when($contentTypeCondition, fn ($q) => $q->where('feeds.content_type', $contentType))
            ->when($podcastCategoryId, fn ($q) => $q->where('user_feeds.category_id', $podcastCategoryId))
            ->leftJoin('user_entry_reads', fn ($join) => $join->on('user_entry_reads.entry_id', '=', 'entries.id')->where('user_entry_reads.user_id', '=', $user->id))
            ->leftJoin('saved_items', fn ($join) => $join->on('saved_items.entry_id', '=', 'entries.id')->where('saved_items.user_id', '=', $user->id))
            ->select('entries.*', 'feeds.title as channel_title', 'feeds.url as channel_url', 'feeds.content_type', 'user_entry_reads.id as seen_id', 'user_entry_reads.is_read', 'saved_items.id as saved_id')
            ->orderBy('entries.published_at', 'desc')
            ->paginate($perPage);

        $allVideos = $allPaginated->getCollection()->map(function ($v) {
            return [
                'id' => $v->id,
                'title' => $this->cleanUtf8($v->title),
                'content' => $this->cleanUtf8($v->content),
                'excerpt' => $this->cleanUtf8($v->excerpt),
                'url' => $v->url,
                'thumbnail_url' => $v->thumbnail_url,
                'author' => $this->cleanUtf8($v->author),
                'published_at' => $v->published_at,
                'channel' => ['id' => $v->feed_id, 'title' => $this->cleanUtf8($v->channel_title), 'url' => $v->channel_url],
                'content_type' => $v->content_type ?? 'youtube',
                'is_seen' => $v->is_read ?? false,
                'is_saved' => $v->saved_id !== null,
                'seen_id' => $v->seen_id,
                'saved_id' => $v->saved_id,
            ];
        });

        // Saved videos
        $savedPaginated = DB::table('saved_items')
            ->join('entries', 'entries.id', '=', 'saved_items.entry_id')
            ->join('feeds', 'feeds.id', '=', 'entries.feed_id')
            ->join('user_feeds', fn ($join) => $join->on('user_feeds.feed_id', '=', 'feeds.id')->where('user_feeds.user_id', '=', $user->id))
            ->when($contentTypeCondition, fn ($q) => $q->where('feeds.content_type', $contentType))
            ->when($podcastCategoryId, fn ($q) => $q->where('user_feeds.category_id', $podcastCategoryId))
            ->leftJoin('user_entry_reads', fn ($join) => $join->on('user_entry_reads.entry_id', '=', 'entries.id')->where('user_entry_reads.user_id', '=', $user->id))
            ->where('saved_items.user_id', '=', $user->id)
            ->select('entries.*', 'feeds.title as channel_title', 'feeds.url as channel_url', 'feeds.content_type', 'user_entry_reads.id as seen_id', 'user_entry_reads.is_read', 'saved_items.id as saved_id')
            ->orderBy('saved_items.created_at', 'desc')
            ->paginate($perPage);

        $savedVideos = $savedPaginated->getCollection()->map(function ($v) {
            return [
                'id' => $v->id,
                'title' => $this->cleanUtf8($v->title),
                'content' => $this->cleanUtf8($v->content),
                'excerpt' => $this->cleanUtf8($v->excerpt),
                'url' => $v->url,
                'thumbnail_url' => $v->thumbnail_url,
                'author' => $this->cleanUtf8($v->author),
                'published_at' => $v->published_at,
                'channel' => ['id' => $v->feed_id, 'title' => $this->cleanUtf8($v->channel_title), 'url' => $v->channel_url],
                'content_type' => $v->content_type ?? 'youtube',
                'is_seen' => $v->is_read ?? false,
                'is_saved' => true,
                'seen_id' => $v->seen_id,
                'saved_id' => $v->saved_id,
            ];
        });

        $categories = $user->categories()->withCount('userFeeds')->orderBy('sort_order')->get();
        $videoViewMode = UserPreference::get($user->id, 'video_view_mode', 'list');

        return inertia('Home', [
            'pageTitle' => $pageTitle,
            'contentType' => $contentType,
            'stats' => [
                'totalChannels' => $totalChannels,
                'unseenCount' => $unseenCount,
                'savedCount' => $savedCount,
            ],
            'videos' => [
                'all' => $allVideos,
                'unseen' => $unseenVideos,
                'saved' => $savedVideos,
            ],
            'pagination' => [
                'current_page' => $allPaginated->currentPage(),
                'last_page' => $allPaginated->lastPage(),
                'per_page' => $allPaginated->perPage(),
                'total' => $allPaginated->total(),
                'has_more' => $allPaginated->hasMorePages(),
            ],
            'unseenPagination' => [
                'current_page' => $unseenPaginated->currentPage(),
                'last_page' => $unseenPaginated->lastPage(),
                'per_page' => $unseenPaginated->perPage(),
                'total' => $unseenPaginated->total(),
                'has_more' => $unseenPaginated->hasMorePages(),
            ],
            'savedPagination' => [
                'current_page' => $savedPaginated->currentPage(),
                'last_page' => $savedPaginated->lastPage(),
                'per_page' => $savedPaginated->perPage(),
                'total' => $savedPaginated->total(),
                'has_more' => $savedPaginated->hasMorePages(),
            ],
            'categories' => $categories,
            'videoViewMode' => $videoViewMode,
        ]);
    }

    private function cleanUtf8($string)
    {
        if (is_null($string)) {
            return null;
        }

        return html_entity_decode(mb_convert_encoding($string, 'UTF-8', 'UTF-8'), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
}
