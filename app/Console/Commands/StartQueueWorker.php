<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class StartQueueWorker extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'queue:start';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Start the queue worker with optimized settings';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting queue worker...');

        $this->call('queue:work', [
            '--queue' => 'feeds,default',
            '--timeout' => 60,
            '--sleep' => 3,
            '--tries' => 3,
            '--max-time' => 3600, // Run for 1 hour then restart
            '--memory' => 256, // Restart if memory exceeds 256MB
        ]);

        return Command::SUCCESS;
    }
}
