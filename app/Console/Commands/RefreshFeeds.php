<?php

namespace App\Console\Commands;

use App\Jobs\FetchFeedJob;
use App\Models\Feed;
use Illuminate\Console\Command;

class RefreshFeeds extends Command
{
    protected $signature = 'feeds:refresh {--feed= : Refresh a specific feed by ID}';

    protected $description = 'Dispatch jobs to refresh all active feeds (or a specific feed)';

    public function handle(): int
    {
        $feedId = $this->option('feed');

        if ($feedId) {
            $feed = Feed::find($feedId);
            if (! $feed) {
                $this->error("Feed #{$feedId} not found.");

                return self::SUCCESS;
            }
            FetchFeedJob::dispatch($feed->feed_url)->onQueue('feeds');
            $this->info("Dispatched refresh for: {$feed->title}");

            return self::SUCCESS;
        }

        // Only refresh feeds that haven't been updated in the last 5 minutes
        // to avoid duplicate jobs and reduce server load
        $feeds = Feed::whereHas('userFeeds', function ($q) {
            $q->where('is_active', true);
        })
            ->where(function ($query) {
                $query->whereNull('last_fetched_at')
                    ->orWhere('last_fetched_at', '<', now()->subMinutes(5));
            })
            ->orderBy('last_fetched_at', 'asc')
            ->get();

        if ($feeds->isEmpty()) {
            $this->info('No feeds need refreshing.');

            return self::SUCCESS;
        }

        $this->info("Dispatching refresh jobs for {$feeds->count()} feeds...");

        // Dispatch in chunks of 10 to avoid memory issues with large datasets
        $feeds->chunk(10)->each(function ($chunk) {
            foreach ($chunk as $feed) {
                FetchFeedJob::dispatch($feed->feed_url)->onQueue('feeds');
            }
        });

        $this->info("Done. {$feeds->count()} jobs dispatched to queue.");

        return self::SUCCESS;
    }
}
