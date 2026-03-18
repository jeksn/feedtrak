<?php

namespace App\Notifications;

use App\Models\Entry;
use App\Models\Feed;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class DailyDigestNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  array<int, array{feed: Feed, entries: \Illuminate\Database\Eloquent\Collection<int, Entry>}>  $feedUpdates
     */
    public function __construct(
        public array $feedUpdates,
        public int $totalCount
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject("Your daily feed update - {$this->totalCount} new items")
            ->greeting("Good morning! Here's your daily feed update.");

        if ($this->totalCount === 0) {
            return $mail->line('No new items in your feeds today.');
        }

        $mail->line("You have {$this->totalCount} new items across ".count($this->feedUpdates).' feeds:');

        foreach ($this->feedUpdates as $update) {
            $feed = $update['feed'];
            $entries = $update['entries'];
            $count = $entries->count();

            $mail->line('');
            $mail->line("**{$feed->title}** ({$count} new):");

            foreach ($entries->take(5) as $entry) {
                $title = mb_strimwidth($entry->title, 0, 60, '...');
                $mail->line("• {$title}");
            }

            if ($count > 5) {
                $mail->line('... and '.($count - 5).' more');
            }
        }

        return $mail
            ->line('')
            ->action('View All Feeds', url('/app'))
            ->line('Thank you for using '.config('app.name').'!');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'total_count' => $this->totalCount,
            'feeds_count' => count($this->feedUpdates),
        ];
    }
}
