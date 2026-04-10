<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Entry;
use App\Models\SavedItem;
use App\Models\UserPreference;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

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

        // Saved count - type-specific using Eloquent
        if ($podcastCategoryId) {
            $savedCount = SavedItem::query()
                ->where('user_id', $user->id)
                ->whereHas('entry', function ($query) use ($podcastCategoryId) {
                    $query->whereHas('feed', function ($query) use ($podcastCategoryId) {
                        $query->whereHas('userFeeds', function ($query) use ($user, $podcastCategoryId) {
                            $query->where('user_id', $user->id)
                                ->where('category_id', $podcastCategoryId);
                        });
                    });
                })
                ->count();
        } elseif ($contentType) {
            $savedCount = SavedItem::query()
                ->where('user_id', $user->id)
                ->whereHas('entry.feed', function ($query) use ($contentType) {
                    $query->where('content_type', $contentType);
                })
                ->count();
        } else {
            $savedCount = $user->savedItems()->count();
        }

        // Build content type condition
        $contentTypeCondition = $contentType && ! $podcastCategoryId;

        // Unseen count using Eloquent
        $unseenCount = Entry::query()
            ->whereHas('feed.userFeeds', function ($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->when($contentTypeCondition, function ($query) use ($contentType) {
                $query->whereHas('feed', function ($query) use ($contentType) {
                    $query->where('content_type', $contentType);
                });
            })
            ->whereDoesntHave('entryReads', function ($query) {
                $query->where('is_read', true);
            })
            ->count();

        // Unseen videos using Eloquent
        $unseenPaginated = Entry::query()
            ->whereHas('feed.userFeeds', function ($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->when($contentTypeCondition, function ($query) use ($contentType) {
                $query->whereHas('feed', function ($query) use ($contentType) {
                    $query->where('content_type', $contentType);
                });
            })
            ->whereDoesntHave('entryReads', function ($query) {
                $query->where('is_read', true);
            })
            ->with(['feed', 'savedItems'])
            ->orderBy('published_at', 'desc')
            ->paginate($perPage, ['*'], 'unseen_page', $request->input('unseen_page'));

        $unseenVideos = $unseenPaginated->getCollection()->map(function ($entry) {
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

        // All videos using Eloquent
        $allPaginated = Entry::query()
            ->whereHas('feed.userFeeds', function ($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->when($contentTypeCondition, function ($query) use ($contentType) {
                $query->whereHas('feed', function ($query) use ($contentType) {
                    $query->where('content_type', $contentType);
                });
            })
            ->with(['feed', 'entryReads', 'savedItems'])
            ->orderBy('published_at', 'desc')
            ->paginate($perPage, ['*'], 'all_page', $request->input('all_page'));

        $allVideos = $allPaginated->getCollection()->map(function ($entry) {
            $entryRead = $entry->entryReads->first();
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
                'is_seen' => $entryRead?->is_read ?? false,
                'is_saved' => $savedItem !== null,
                'seen_id' => $entryRead?->id,
                'saved_id' => $savedItem?->id,
            ];
        });

        // Saved videos using Eloquent
        $savedPaginated = SavedItem::query()
            ->where('user_id', $user->id)
            ->when($contentTypeCondition, fn ($q) => $q->whereHas('entry.feed', fn ($q) => $q->where('content_type', $contentType)))
            ->when($podcastCategoryId, fn ($q) => $q->whereHas('entry.feed', fn ($q) => $q->whereHas('userFeeds', fn ($q) => $q->where('category_id', $podcastCategoryId))))
            ->with(['entry.feed', 'entry.entryReads'])
            ->orderByDesc('created_at')
            ->paginate($perPage);

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
