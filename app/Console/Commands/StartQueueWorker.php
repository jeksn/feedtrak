<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class StartQueueWorker extends Command
{
    protected $signature = 'queue:start';

    protected $description = 'Start the queue worker with optimized settings';

    public function handle(): int
    {
        $this->info('Starting queue worker...');

        $this->call('queue:work', [
            '--queue' => 'feeds,default',
            '--timeout' => 60,
            '--sleep' => 3,
            '--tries' => 3,
            '--max-time' => 3600,
            '--memory' => 256,
        ]);

        return Command::SUCCESS;
    }
}
