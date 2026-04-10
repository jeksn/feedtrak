<?php

namespace App\Jobs;

use App\Models\Feed;
use App\Models\UserEntryRead;
use App\Models\UserFeed;
use App\Services\FeedService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Log;

class FetchFeedJob implements ShouldQueue
{
    use Queueable;

    public string $feedUrl;

    public ?int $userId;

    public ?int $categoryId;

    public int $timeout = 30;

    public int $tries = 3;

    public array|int $backoff = [10, 30, 60];

    public function __construct(string $feedUrl, ?int $userId = null, ?int $categoryId = null)
    {
        $this->feedUrl = $feedUrl;
        $this->userId = $userId;
        $this->categoryId = $categoryId;
    }

    public function handle(FeedService $feedService): void
    {
        try {
            Log::debug('FetchFeedJob started', [
                'feed_url' => $this->feedUrl,
                'user_id' => $this->userId,
                'category_id' => $this->categoryId,
                'attempt' => $this->attempts(),
            ]);

            $existingFeed = Feed::where('feed_url', $this->feedUrl)->first();
            $isNewFeed = ! $existingFeed;

            $entryLimit = $isNewFeed ? 15 : null;

            $feedData = null;
            $contentType = $this->detectContentType($this->feedUrl);

            if ($contentType === 'youtube') {
                $feedData = $feedService->fetchYouTubeChannel($this->feedUrl, $entryLimit);
                if ($feedData) {
                    $feedData['content_type'] = 'youtube';
                }
            } else {
                $feedData = $feedService->fetchRssFeed($this->feedUrl, $entryLimit);
                if ($feedData) {
                    $feedData['content_type'] = $contentType;
                }
            }

            if (! $feedData) {
                Log::warning('Feed fetch failed', ['url' => $this->feedUrl, 'type' => $contentType]);

                return;
            }

            Log::debug('Feed data fetched', [
                'title' => $feedData['title'] ?? 'Unknown',
                'content_type' => $feedData['content_type'],
                'entries_count' => count($feedData['entries'] ?? []),
            ]);

            $feed = $feedService->createOrUpdateFeed($feedData);

            if (! empty($feedData['entries'])) {
                $entries = array_slice($feedData['entries'], 0, 100);
                $feedService->createEntries($feed, $entries);
            }

            if ($this->userId) {
                $this->createUserSubscription($feed);
                $this->markEntriesAsUnread($feed);
            }

            $feed->update(['last_fetched_at' => now()]);

            Log::debug('FetchFeedJob completed successfully', ['feed_id' => $feed->id]);

        } catch (ConnectionException $e) {
            Log::warning('Feed connection failed', [
                'feed_url' => $this->feedUrl,
                'error' => $e->getMessage(),
                'attempt' => $this->attempts(),
            ]);

            $this->fail($e);

        } catch (RequestException $e) {
            Log::warning('Feed request failed', [
                'feed_url' => $this->feedUrl,
                'status' => $e->response?->status(),
                'error' => $e->getMessage(),
                'attempt' => $this->attempts(),
            ]);

            if ($e->response && $e->response->status() >= 400 && $e->response->status() < 500) {
                $this->fail($e);
            }
            throw $e;
        } catch (\Exception $e) {
            Log::error('FetchFeedJob failed', [
                'feed_url' => $this->feedUrl,
                'user_id' => $this->userId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'attempt' => $this->attempts(),
            ]);

            throw $e;
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('FetchFeedJob failed permanently', [
            'feed_url' => $this->feedUrl,
            'error' => $exception->getMessage(),
            'attempts' => $this->attempts(),
        ]);
    }

    private function createUserSubscription(Feed $feed): void
    {
        UserFeed::firstOrCreate(
            [
                'user_id' => $this->userId,
                'feed_id' => $feed->id,
            ],
            [
                'category_id' => $this->categoryId,
                'is_active' => true,
            ]
        );
    }

    private function markEntriesAsUnread(Feed $feed): void
    {
        $limit = 15;

        $query = $feed->entries()->latest('published_at');

        if ($limit) {
            $query->limit($limit);
        }

        $entries = $query->get();

        foreach ($entries as $entry) {
            UserEntryRead::firstOrCreate(
                [
                    'user_id' => $this->userId,
                    'entry_id' => $entry->id,
                ],
                [
                    'is_read' => false,
                ]
            );
        }
    }

    private function detectContentType(string $url): string
    {
        $urlLower = strtolower($url);

        if (str_contains($urlLower, 'youtube.com') || str_contains($urlLower, 'youtu.be')) {
            return 'youtube';
        }

        if (str_contains($urlLower, 'podcast') || str_contains($urlLower, 'itunes')) {
            return 'podcast';
        }

        return 'rss';
    }
}
