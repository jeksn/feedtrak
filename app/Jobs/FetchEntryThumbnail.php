<?php

namespace App\Jobs;

use App\Models\Entry;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FetchEntryThumbnail implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public int $timeout = 15;

    /**
     * Create a new job instance.
     */
    public function __construct(public Entry $entry) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        if ($this->entry->thumbnail_url) {
            return;
        }

        if (! $this->entry->url) {
            return;
        }

        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'User-Agent' => 'FeedTrak/1.0 (Thumbnail Fetcher)',
                ])
                ->get($this->entry->url);

            if (! $response->successful()) {
                return;
            }

            $html = $response->body();
            $thumbnailUrl = $this->extractOgImage($html)
                ?? $this->extractTwitterImage($html)
                ?? $this->extractFirstImage($html);

            if ($thumbnailUrl) {
                // Resolve relative URLs
                $thumbnailUrl = $this->resolveUrl($thumbnailUrl, $this->entry->url);

                if (filter_var($thumbnailUrl, FILTER_VALIDATE_URL)) {
                    $this->entry->update(['thumbnail_url' => $thumbnailUrl]);
                }
            }
        } catch (\Exception $e) {
            Log::debug('Failed to fetch thumbnail', [
                'entry_id' => $this->entry->id,
                'url' => $this->entry->url,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function extractOgImage(string $html): ?string
    {
        if (preg_match('/<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']/', $html, $matches)) {
            return $matches[1];
        }
        if (preg_match('/<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']/', $html, $matches)) {
            return $matches[1];
        }

        return null;
    }

    private function extractTwitterImage(string $html): ?string
    {
        if (preg_match('/<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']/', $html, $matches)) {
            return $matches[1];
        }
        if (preg_match('/<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']twitter:image["\']/', $html, $matches)) {
            return $matches[1];
        }

        return null;
    }

    private function extractFirstImage(string $html): ?string
    {
        if (preg_match('/<img[^>]+src=["\']([^"\']+)["\']/', $html, $matches)) {
            $src = $matches[1];
            // Skip tiny images, tracking pixels, icons
            if (preg_match('/\.(svg|ico)(\?|$)/i', $src)) {
                return null;
            }
            // Skip data URIs
            if (str_starts_with($src, 'data:')) {
                return null;
            }

            return $src;
        }

        return null;
    }

    private function resolveUrl(string $url, string $baseUrl): string
    {
        if (str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) {
            return $url;
        }

        $parsed = parse_url($baseUrl);
        $scheme = $parsed['scheme'] ?? 'https';
        $host = $parsed['host'] ?? '';

        if (str_starts_with($url, '//')) {
            return $scheme.':'.$url;
        }

        if (str_starts_with($url, '/')) {
            return $scheme.'://'.$host.$url;
        }

        $basePath = isset($parsed['path']) ? dirname($parsed['path']) : '';

        return $scheme.'://'.$host.$basePath.'/'.$url;
    }
}
