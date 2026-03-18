<?php

namespace App\Notifications;

use App\Models\Entry;
use App\Models\Feed;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewVideoNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Feed $feed,
        public Entry $video
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("New video from {$this->feed->title}")
            ->greeting("New video from {$this->feed->title}")
            ->line("A new video titled \"{$this->video->title}\" was just uploaded.")
            ->action('Watch Video', $this->video->url)
            ->line('Thank you for using '.config('app.name').'!');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'feed_id' => $this->feed->id,
            'video_id' => $this->video->id,
            'title' => $this->video->title,
            'url' => $this->video->url,
        ];
    }
}
