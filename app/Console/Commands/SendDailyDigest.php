<?php

namespace App\Console\Commands;

use App\Models\Entry;
use App\Models\Feed;
use App\Models\User;
use App\Notifications\DailyDigestNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendDailyDigest extends Command
{
    protected $signature = 'feeds:send-daily-digest';

    protected $description = 'Send daily digest email with all new feed updates';

    public function handle(): int
    {
        $this->info('Starting daily digest notification job...');

        // Get all users with email notifications enabled
        $users = User::where('email_notifications_enabled', true)->get();

        if ($users->isEmpty()) {
            $this->info('No users with notifications enabled.');

            return Command::SUCCESS;
        }

        $this->info("Processing {$users->count()} users...");

        foreach ($users as $user) {
            $this->processUserDigest($user);
        }

        $this->info('Daily digest job completed.');

        return Command::SUCCESS;
    }

    private function processUserDigest(User $user): void
    {
        try {
            // Get the last time we notified this user (or default to 2 days ago)
            $since = $user->last_notified_at
                ? \Carbon\Carbon::parse($user->last_notified_at)->subDay()
                : now()->subDays(2);

            // Get all feeds this user is subscribed to
            $feedIds = $user->userFeeds()->where('is_active', true)->pluck('feed_id');

            if ($feedIds->isEmpty()) {
                return;
            }

            // Get all new entries since last notification
            $newEntries = Entry::whereIn('feed_id', $feedIds)
                ->where('created_at', '>=', $since)
                ->orderBy('published_at', 'desc')
                ->get();

            if ($newEntries->isEmpty()) {
                Log::debug('No new entries for user', ['user_id' => $user->id]);

                return;
            }

            // Group by feed
            $feedUpdates = $newEntries->groupBy('feed_id')->map(function ($entries) {
                $feed = $entries->first()->feed;

                return [
                    'feed' => $feed,
                    'entries' => $entries,
                ];
            })->values()->toArray();

            $totalCount = $newEntries->count();

            // Send the notification
            $user->notify(new DailyDigestNotification($feedUpdates, $totalCount));

            // Update last_notified_at
            $user->update(['last_notified_at' => now()]);

            Log::info('Daily digest sent', [
                'user_id' => $user->id,
                'feeds' => count($feedUpdates),
                'total_entries' => $totalCount,
            ]);

            $this->line("Sent digest to user {$user->id}: {$totalCount} entries from ".count($feedUpdates).' feeds');

        } catch (\Exception $e) {
            Log::error('Failed to send daily digest', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
