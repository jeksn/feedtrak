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

                return self::FAILURE;
            }
            FetchFeedJob::dispatch($feed->feed_url);
            $this->info("Dispatched refresh for: {$feed->title}");

            return self::SUCCESS;
        }

        $feeds = Feed::whereHas('userFeeds', function ($q) {
            $q->where('is_active', true);
        })->get();

        if ($feeds->isEmpty()) {
            $this->info('No active feeds to refresh.');

            return self::SUCCESS;
        }

        $this->info("Dispatching refresh jobs for {$feeds->count()} feeds...");

        foreach ($feeds as $feed) {
            FetchFeedJob::dispatch($feed->feed_url);
        }

        $this->info("Done. {$feeds->count()} jobs dispatched to queue.");

        return self::SUCCESS;
    }
}
