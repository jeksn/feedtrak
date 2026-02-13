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

    // Timeout after 30 seconds
    public int $timeout = 30;

    // Retry up to 3 times with exponential backoff
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

            // Check if this is a new feed
            $existingFeed = \App\Models\Feed::where('feed_url', $this->feedUrl)->first();
            $isNewFeed = ! $existingFeed;

            // For new feeds, limit to 15 entries. For existing feeds, fetch all.
            $entryLimit = $isNewFeed ? 15 : null;

            // Discover and parse the feed
            $feedData = $feedService->discoverFeed($this->feedUrl, $entryLimit);

            if (! $feedData) {
                Log::warning('Feed discovery failed', ['url' => $this->feedUrl]);

                return;
            }

            Log::debug('Feed data discovered', [
                'title' => $feedData['title'] ?? 'Unknown',
                'entries_count' => count($feedData['entries'] ?? []),
            ]);

            // Create or update the feed
            $feed = $feedService->createOrUpdateFeed($feedData);

            // Create entries (limit to last 100 for performance)
            if (! empty($feedData['entries'])) {
                $entries = array_slice($feedData['entries'], 0, 100);
                $feedService->createEntries($feed, $entries);
            }

            // If this is for a specific user, create the subscription
            if ($this->userId) {
                $this->createUserSubscription($feed);
                $this->markEntriesAsUnread($feed);
            }

            // Update last fetched timestamp
            $feed->update(['last_fetched_at' => now()]);

            Log::debug('FetchFeedJob completed successfully', ['feed_id' => $feed->id]);

        } catch (ConnectionException $e) {
            Log::warning('Feed connection failed', [
                'feed_url' => $this->feedUrl,
                'error' => $e->getMessage(),
                'attempt' => $this->attempts(),
            ]);

            // Don't retry connection errors
            $this->fail($e);

        } catch (RequestException $e) {
            Log::warning('Feed request failed', [
                'feed_url' => $this->feedUrl,
                'status' => $e->response?->status(),
                'error' => $e->getMessage(),
                'attempt' => $this->attempts(),
            ]);

            // Don't retry 4xx errors
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

            // Re-throw for retry logic
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
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
        // Limit all feeds to 15 unread posts initially
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
}
