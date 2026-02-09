<?php

namespace App\Jobs;

use App\Models\Feed;
use App\Models\UserFeed;
use App\Models\UserEntryRead;
use App\Services\FeedService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class FetchFeedJob implements ShouldQueue
{
    use Queueable;

    public string $feedUrl;
    public ?int $userId;
    public ?int $categoryId;

    public function __construct(string $feedUrl, ?int $userId = null, ?int $categoryId = null)
    {
        $this->feedUrl = $feedUrl;
        $this->userId = $userId;
        $this->categoryId = $categoryId;
    }

    public function handle(FeedService $feedService): void
    {
        try {
            Log::info('FetchFeedJob started', [
                'feed_url' => $this->feedUrl,
                'user_id' => $this->userId,
                'category_id' => $this->categoryId
            ]);
            
            // Check if this is a new feed
            $existingFeed = \App\Models\Feed::where('feed_url', $this->feedUrl)->first();
            $isNewFeed = !$existingFeed;
            
            // For new feeds, limit to 15 entries. For existing feeds, fetch all.
            $entryLimit = $isNewFeed ? 15 : null;
            
            // Discover and parse the feed
            $feedData = $feedService->discoverFeed($this->feedUrl, $entryLimit);
            
            if (!$feedData) {
                Log::warning('Feed discovery failed', ['url' => $this->feedUrl]);
                return;
            }

            Log::info('Feed data discovered', [
                'title' => $feedData['title'] ?? 'Unknown',
                'entries_count' => count($feedData['entries'] ?? [])
            ]);

            // Create or update the feed
            $feed = $feedService->createOrUpdateFeed($feedData);

            // Create entries
            if (!empty($feedData['entries'])) {
                $feedService->createEntries($feed, $feedData['entries']);
            }

            // If this is for a specific user, create the subscription
            if ($this->userId) {
                $this->createUserSubscription($feed);
                $this->markEntriesAsUnread($feed);
            }

            // Update last fetched timestamp
            $feed->update(['last_fetched_at' => now()]);
            
            Log::info('FetchFeedJob completed successfully', ['feed_id' => $feed->id]);

        } catch (\Exception $e) {
            Log::error('FetchFeedJob failed', [
                'feed_url' => $this->feedUrl,
                'user_id' => $this->userId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            // Don't re-throw exceptions in queued jobs to avoid breaking the queue
        }
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
