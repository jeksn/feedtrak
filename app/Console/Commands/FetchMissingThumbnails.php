<?php

namespace App\Console\Commands;

use App\Jobs\FetchEntryThumbnail;
use App\Models\Entry;
use Illuminate\Console\Command;

class FetchMissingThumbnails extends Command
{
    protected $signature = 'entries:fetch-thumbnails {--limit=100 : Maximum number of entries to process}';

    protected $description = 'Dispatch jobs to fetch og:image thumbnails for entries missing thumbnails';

    public function handle(): int
    {
        $query = Entry::whereNull('thumbnail_url')
            ->orWhere('thumbnail_url', '')
            ->whereNotNull('url')
            ->where('url', '!=', '');

        $total = $query->count();
        $limit = (int) $this->option('limit');

        $this->info("Found {$total} entries without thumbnails. Dispatching up to {$limit} jobs...");

        $dispatched = 0;
        $query->limit($limit)->each(function (Entry $entry) use (&$dispatched) {
            FetchEntryThumbnail::dispatch($entry);
            $dispatched++;
        });

        $this->info("Dispatched {$dispatched} thumbnail fetch jobs.");

        return self::SUCCESS;
    }
}
