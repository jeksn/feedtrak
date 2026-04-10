<?php

namespace App\Services;

use App\Jobs\FetchFeedJob;
use App\Models\Category;
use App\Models\Feed;
use App\Models\UserFeed;
use Illuminate\Support\Facades\Log;
use SimpleXMLElement;

class OpmlService
{
    public function parseOpml(string $opmlContent): array
    {
        // Fix common encoding issues
        $opmlContent = $this->fixEncoding($opmlContent);

        // Remove BOM if present
        $opmlContent = preg_replace('/^\xEF\xBB\xBF/', '', $opmlContent);

        // Ensure content is valid XML
        libxml_use_internal_errors(true);

        $xml = simplexml_load_string($opmlContent, SimpleXMLElement::class, LIBXML_NOCDATA | LIBXML_NONET | LIBXML_NOENT);

        if (! $xml) {
            $errors = libxml_get_errors();
            libxml_clear_errors();

            $errorMessages = array_map(function ($error) {
                return "Line {$error->line}: {$error->message}";
            }, $errors);

            throw new \InvalidArgumentException('Invalid OPML file format: '.implode(', ', $errorMessages));
        }

        $result = [
            'categories' => [],
            'feeds' => [],
        ];

        // Find the body element
        $body = $xml->body;

        if (! $body) {
            throw new \InvalidArgumentException('Invalid OPML: missing body element');
        }

        // Process each outline element
        foreach ($body->outline as $outline) {
            $this->processOutline($outline, null, $result);
        }

        return $result;
    }

    private function fixEncoding(string $content): string
    {
        // Convert to UTF-8 if needed
        if (function_exists('mb_check_encoding')) {
            if (! mb_check_encoding($content, 'UTF-8')) {
                // Try to detect encoding
                $encodings = ['UTF-8', 'ISO-8859-1', 'Windows-1252'];

                foreach ($encodings as $encoding) {
                    if (mb_check_encoding($content, $encoding)) {
                        $content = mb_convert_encoding($content, 'UTF-8', $encoding);
                        break;
                    }
                }

                // If still not UTF-8, force conversion
                if (! mb_check_encoding($content, 'UTF-8')) {
                    $content = mb_convert_encoding($content, 'UTF-8', 'UTF-8');
                }
            }
        }

        // Remove invalid UTF-8 sequences
        $content = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $content);

        return $content;
    }

    private function processOutline(SimpleXMLElement $outline, ?string $parentCategory, array &$result): void
    {
        $attributes = $outline->attributes();

        // Check if this is a category (has children but no xmlUrl)
        if (isset($outline->outline) && ! isset($attributes->xmlUrl)) {
            $categoryName = (string) ($attributes->title ?? $attributes->text ?? 'Uncategorized');

            // Add category if not already added
            if (! isset($result['categories'][$categoryName])) {
                $result['categories'][$categoryName] = [
                    'name' => $categoryName,
                    'feeds' => [],
                ];
            }

            // Process child outlines
            foreach ($outline->outline as $childOutline) {
                $this->processOutline($childOutline, $categoryName, $result);
            }
        }
        // This is a feed
        elseif (isset($attributes->xmlUrl)) {
            $feedUrl = (string) $attributes->xmlUrl;
            $contentType = $this->detectContentType($feedUrl);

            $feedData = [
                'title' => (string) ($attributes->title ?? $attributes->text ?? 'Untitled Feed'),
                'url' => (string) ($attributes->htmlUrl ?? $feedUrl),
                'feed_url' => $feedUrl,
                'description' => (string) ($attributes->description ?? ''),
                'category' => $parentCategory,
                'content_type' => $contentType,
            ];

            $result['feeds'][] = $feedData;

            // Add to category if specified
            if ($parentCategory && isset($result['categories'][$parentCategory])) {
                $result['categories'][$parentCategory]['feeds'][] = $feedData;
            }
        }
    }

    private function detectContentType(string $url): string
    {
        $urlLower = strtolower($url);

        // YouTube detection
        if (str_contains($urlLower, 'youtube.com') || str_contains($urlLower, 'youtu.be')) {
            return 'youtube';
        }

        // Podcast detection - only from known podcast platforms
        $podcastDomains = ['podcast', 'itunes.apple', 'anchor.fm', 'spotify.', 'overcast.fm', 'pocketcasts', 'castbox'];
        foreach ($podcastDomains as $domain) {
            if (str_contains($urlLower, $domain)) {
                return 'podcast';
            }
        }

        // Default to RSS (most feeds are RSS, not podcasts)
        return 'rss';
    }

    public function importOpml(string $opmlContent, int $userId): array
    {
        // Increase time limit for large imports
        set_time_limit(300); // 5 minutes

        try {
            $parsed = $this->parseOpml($opmlContent);

            $imported = [
                'categories_created' => 0,
                'feeds_imported' => 0,
                'feeds_skipped' => 0,
                'errors' => [],
            ];

            // Get existing categories for the user
            $existingCategories = Category::where('user_id', $userId)
                ->pluck('id', 'name')
                ->toArray();

            // Get existing feed URLs for the user
            $existingFeedUrls = Feed::whereHas('userFeeds', function ($query) use ($userId) {
                $query->where('user_id', $userId);
            })->pluck('feed_url')
                ->toArray();

            // Process categories and create new ones if needed
            foreach ($parsed['categories'] as $categoryData) {
                $categoryName = $categoryData['name'];

                // Skip if category already exists
                if (isset($existingCategories[$categoryName])) {
                    $categoryId = $existingCategories[$categoryName];
                } else {
                    // Create new category
                    $category = Category::create([
                        'user_id' => $userId,
                        'name' => $categoryName,
                        'sort_order' => Category::where('user_id', $userId)->max('sort_order') + 1,
                    ]);

                    $categoryId = $category->id;
                    $existingCategories[$categoryName] = $categoryId;
                    $imported['categories_created']++;
                }

                // Import feeds in this category
                foreach ($categoryData['feeds'] as $feedData) {
                    $this->importFeed($feedData, $userId, $categoryId, $existingFeedUrls, $imported);
                }
            }

            // Import feeds without categories
            foreach ($parsed['feeds'] as $feedData) {
                if (empty($feedData['category'])) {
                    $this->importFeed($feedData, $userId, null, $existingFeedUrls, $imported);
                }
            }

            return $imported;
        } catch (\Exception $e) {
            Log::error('OPML import failed', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw new \RuntimeException('Failed to import OPML: '.$e->getMessage());
        }
    }

    private function importFeed(array $feedData, int $userId, ?int $categoryId, array &$existingFeedUrls, array &$imported): void
    {
        // Skip if already subscribed
        if (in_array($feedData['feed_url'], $existingFeedUrls)) {
            $imported['feeds_skipped']++;

            return;
        }

        try {
            // Use FeedService to discover and create the feed
            $feedService = app(FeedService::class);
            $discoveredFeed = $feedService->discoverFeed($feedData['feed_url']);

            if (! $discoveredFeed) {
                $imported['errors'][] = "Could not fetch feed: {$feedData['title']}";

                return;
            }

            // Override content_type with the detected type from OPML
            $discoveredFeed['content_type'] = $feedData['content_type'] ?? 'rss';
            $discoveredFeed['feed_url'] = $feedData['feed_url'];

            // Create or update feed
            $feed = $feedService->createOrUpdateFeed($discoveredFeed);

            Log::info('OPML feed imported', ['feed_id' => $feed->id, 'title' => $feed->title, 'content_type' => $feed->content_type]);

            // Create user feed relationship
            UserFeed::create([
                'user_id' => $userId,
                'feed_id' => $feed->id,
                'category_id' => $categoryId,
                'is_active' => true,
            ]);

            // Add to existing URLs to avoid duplicates
            $existingFeedUrls[] = $feedData['feed_url'];

            $imported['feeds_imported']++;

            // Don't dispatch job immediately - let it happen in the background
            // Queue initial fetch without blocking - pass userId to create subscription and mark entries as unread
            FetchFeedJob::dispatch($feed->feed_url, $userId, $categoryId)->onQueue('feeds');
        } catch (\Exception $e) {
            Log::error('Failed to import feed', [
                'feed_url' => $feedData['feed_url'],
                'error' => $e->getMessage(),
            ]);

            $imported['errors'][] = "Failed to import feed: {$feedData['title']} - {$e->getMessage()}";
        }
    }
}
