<?php

namespace App\Services;

use App\Models\Feed;
use App\Models\Entry;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use SimpleXMLElement;

class FeedService
{
    public function discoverFeed(string $url): ?array
    {
        try {
            // Handle YouTube URLs
            if ($this->isYouTubeUrl($url)) {
                return $this->handleYouTubeUrl($url);
            }

            $response = Http::timeout(10)->get($url);
            
            if (!$response->successful()) {
                return null;
            }

            $contentType = $response->header('content-type');
            
            // If it's already a feed, parse it directly
            if ($this->isFeedContentType($contentType)) {
                return $this->parseFeedContent($response->body(), $url);
            }

            // Try to find feed links in HTML
            return $this->findFeedInHtml($response->body(), $url);
        } catch (\Exception $e) {
            Log::error('Feed discovery failed', ['url' => $url, 'error' => $e->getMessage()]);
            return null;
        }
    }

    private function isYouTubeUrl(string $url): bool
    {
        return str_contains($url, 'youtube.com') || str_contains($url, 'youtu.be');
    }

    private function handleYouTubeUrl(string $url): ?array
    {
        try {
            Log::info('Processing YouTube URL', ['url' => $url]);
            
            // If it's already a YouTube RSS feed URL, parse it directly
            if (str_contains($url, 'feeds/videos.xml')) {
                Log::info('Direct YouTube RSS feed URL provided', ['url' => $url]);
                return $this->parseFeed($url);
            }
            
            // Extract channel ID from YouTube URL
            $channelId = $this->extractChannelId($url);
            
            if (!$channelId) {
                Log::warning('Could not extract channel ID from YouTube URL', ['url' => $url]);
                
                // Try legacy RSS approach for @username URLs
                if (preg_match('/youtube\.com\/@([a-zA-Z0-9_-]+)/', $url, $matches)) {
                    $username = $matches[1];
                    $legacyRssUrl = "https://www.youtube.com/feeds/videos.xml?user={$username}";
                    Log::info('Trying legacy RSS URL', ['url' => $legacyRssUrl]);
                    $result = $this->parseFeed($legacyRssUrl);
                    if ($result) {
                        Log::info('Legacy RSS approach succeeded', ['entryCount' => count($result['entries'] ?? [])]);
                        return $result;
                    }
                }
                
                return null;
            }

            Log::info('Extracted channel ID', ['channelId' => $channelId]);

            // Convert to YouTube RSS feed URL
            $rssUrl = "https://www.youtube.com/feeds/videos.xml?channel_id={$channelId}";
            
            Log::info('Fetching YouTube RSS feed', ['rssUrl' => $rssUrl]);
            
            // Parse the RSS feed
            $result = $this->parseFeed($rssUrl);
            
            if ($result) {
                Log::info('Successfully parsed YouTube feed', ['entryCount' => count($result['entries'] ?? [])]);
            } else {
                Log::error('Failed to parse YouTube RSS feed', ['rssUrl' => $rssUrl]);
            }
            
            return $result;
        } catch (\Exception $e) {
            Log::error('YouTube URL handling failed', ['url' => $url, 'error' => $e->getMessage()]);
            return null;
        }
    }

    private function extractChannelId(string $url): ?string
    {
        // Handle different YouTube URL formats
        
        // @username format: https://www.youtube.com/@username
        if (preg_match('/youtube\.com\/@([a-zA-Z0-9_-]+)/', $url, $matches)) {
            return $this->getChannelIdFromUsername($matches[1]);
        }
        
        // Channel URL with ID: https://www.youtube.com/channel/CHANNEL_ID
        if (preg_match('/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/', $url, $matches)) {
            return $matches[1];
        }
        
        // Custom handle URL: https://www.youtube.com/c/CHANNEL_NAME
        if (preg_match('/youtube\.com\/c\/([a-zA-Z0-9_-]+)/', $url, $matches)) {
            return $this->getChannelIdFromCustomUrl($matches[1]);
        }
        
        return null;
    }

    private function getChannelIdFromUsername(string $username): ?string
    {
        try {
            Log::info('Getting channel ID via Invidious API', ['username' => $username]);
            
            // Try multiple Invidious instances
            $invidiousInstances = [
                "https://inv.nadeko.net/api/v1/channels/@{$username}",
                "https://yewtu.be/api/v1/channels/@{$username}",
                "https://invidious.snopyta.org/api/v1/channels/@{$username}",
                "https://vid.puffyan.us/api/v1/channels/@{$username}"
            ];
            
            foreach ($invidiousInstances as $invidiousUrl) {
                $response = Http::timeout(10)->get($invidiousUrl);
                
                if ($response->successful()) {
                    $data = $response->json();
                    if (isset($data['authorId'])) {
                        Log::info('Found channel ID via Invidious', ['channelId' => $data['authorId'], 'instance' => $invidiousUrl]);
                        return $data['authorId'];
                    }
                }
            }
            
            Log::warning('Invidious API failed, falling back to direct scraping', ['username' => $username]);
            
            // Fallback to direct scraping with better consent bypass
            $response = Http::timeout(10)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language' => 'en-US,en;q=0.9',
                    'Accept-Encoding' => 'gzip, deflate, br',
                    'Connection' => 'keep-alive',
                    'Upgrade-Insecure-Requests' => '1',
                    'Sec-Fetch-Dest' => 'document',
                    'Sec-Fetch-Mode' => 'navigate',
                    'Sec-Fetch-Site' => 'none',
                    'Sec-Fetch-User' => '?1',
                    'Cache-Control' => 'max-age=0',
                    'Cookie' => 'CONSENT=YES+cb; SOCS=CAESHAgBEhJnd3NfMjAyMjA5MjktMF9SQzEaAnJvIAEaBgiAkvKZBg',
                ])
                ->get("https://www.youtube.com/@{$username}?hl=en");
            
            if (!$response->successful()) {
                Log::error('Failed to fetch YouTube page', [
                    'username' => $username,
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return null;
            }

            $html = $response->body();
            
            // Log first 500 chars for debugging
            Log::info('YouTube page response', [
                'username' => $username,
                'html_preview' => substr($html, 0, 500)
            ]);
            
            // Check if we hit the consent page
            if (str_contains($html, 'consent.youtube.com')) {
                Log::warning('Hit YouTube consent page, trying alternative approach', ['username' => $username]);
                
                // Try without cookies
                $response = Http::timeout(10)
                    ->withHeaders([
                        'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    ])
                    ->get("https://www.youtube.com/@{$username}");
                
                if ($response->successful()) {
                    $html = $response->body();
                }
            }
            
            // Look for channel ID in various places in the HTML
            if (preg_match('/"channelId":"([a-zA-Z0-9_-]+)"/', $html, $matches)) {
                Log::info('Found channel ID via channelId pattern', ['channelId' => $matches[1]]);
                return $matches[1];
            }
            
            if (preg_match('/<meta property="og:url" content="https:\/\/www\.youtube\.com\/channel\/([a-zA-Z0-9_-]+)"/', $html, $matches)) {
                Log::info('Found channel ID via og:url pattern', ['channelId' => $matches[1]]);
                return $matches[1];
            }
            
            // Try to find it in the initial data
            if (preg_match('/"externalChannelId":"([a-zA-Z0-9_-]+)"/', $html, $matches)) {
                Log::info('Found channel ID via externalChannelId pattern', ['channelId' => $matches[1]]);
                return $matches[1];
            }
            
            // Try to find canonical URL with channel ID
            if (preg_match('/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/([a-zA-Z0-9_-]+)"/', $html, $matches)) {
                Log::info('Found channel ID via canonical link', ['channelId' => $matches[1]]);
                return $matches[1];
            }
            
            // Try to find it in ytInitialData
            if (preg_match('/var ytInitialData = ({.+?});/', $html, $dataMatches)) {
                $jsonData = json_decode($dataMatches[1], true);
                if ($jsonData) {
                    $channelId = $this->extractChannelIdFromYtData($jsonData);
                    if ($channelId) {
                        Log::info('Found channel ID via ytInitialData', ['channelId' => $channelId]);
                        return $channelId;
                    }
                }
            }
            
            // Last resort: try YouTube's nocookie domain
            Log::info('Trying nocookie YouTube domain as last resort', ['username' => $username]);
            $nocookieResponse = Http::timeout(10)
                ->get("https://www.youtube-nocookie.com/@{$username}");
            
            if ($nocookieResponse->successful()) {
                $nocookieHtml = $nocookieResponse->body();
                if (preg_match('/"channelId":"([a-zA-Z0-9_-]+)"/', $nocookieHtml, $matches)) {
                    Log::info('Found channel ID via nocookie domain', ['channelId' => $matches[1]]);
                    return $matches[1];
                }
            }
            
            // Final fallback: try to get a video from the channel and extract from there
            Log::info('Trying to extract channel ID from channel videos', ['username' => $username]);
            $videosResponse = Http::timeout(10)
                ->get("https://www.youtube.com/@{$username}/videos");
            
            if ($videosResponse->successful()) {
                $videosHtml = $videosResponse->body();
                if (preg_match('/"channelId":"([a-zA-Z0-9_-]+)"/', $videosHtml, $matches)) {
                    Log::info('Found channel ID via videos page', ['channelId' => $matches[1]]);
                    return $matches[1];
                }
            }
            
            Log::warning('No channel ID found in YouTube page', ['username' => $username]);
            return null;
        } catch (\Exception $e) {
            Log::error('Failed to get channel ID from username', ['username' => $username, 'error' => $e->getMessage()]);
            return null;
        }
    }

    private function getChannelIdFromCustomUrl(string $customUrl): ?string
    {
        try {
            $response = Http::timeout(10)->get("https://www.youtube.com/c/{$customUrl}");
            
            if (!$response->successful()) {
                return null;
            }

            $html = $response->body();
            
            // Look for channel ID in the HTML
            if (preg_match('/"channelId":"([a-zA-Z0-9_-]+)"/', $html, $matches)) {
                return $matches[1];
            }
            
            return null;
        } catch (\Exception $e) {
            Log::error('Failed to get channel ID from custom URL', ['customUrl' => $customUrl, 'error' => $e->getMessage()]);
            return null;
        }
    }

    private function extractChannelIdFromYtData(array $data): ?string
    {
        // Navigate through the ytInitialData structure to find the channel ID
        if (isset($data['header']['c4TabbedHeaderRenderer']['channelId'])) {
            return $data['header']['c4TabbedHeaderRenderer']['channelId'];
        }
        
        // Try alternative paths
        if (isset($data['contents']['twoColumnBrowseResultsRenderer']['tabs'][0]['tabRenderer']['content']['sectionListRenderer']['contents'][0]['itemSectionRenderer']['contents'][0]['channelVideoPlayerRenderer']['navigationEndpoint']['browseEndpoint']['browseId'])) {
            return $data['contents']['twoColumnBrowseResultsRenderer']['tabs'][0]['tabRenderer']['content']['sectionListRenderer']['contents'][0]['itemSectionRenderer']['contents'][0]['channelVideoPlayerRenderer']['navigationEndpoint']['browseEndpoint']['browseId'];
        }
        
        // Recursive search for channelId key
        return $this->recursiveSearch($data, 'channelId');
    }
    
    private function recursiveSearch(array $array, string $key): ?string
    {
        foreach ($array as $k => $v) {
            if ($k === $key && is_string($v)) {
                return $v;
            }
            if (is_array($v)) {
                $result = $this->recursiveSearch($v, $key);
                if ($result) {
                    return $result;
                }
            }
        }
        return null;
    }

    public function parseFeed(string $feedUrl): ?array
    {
        try {
            $response = Http::timeout(10)->get($feedUrl);
            
            if (!$response->successful()) {
                return null;
            }

            return $this->parseFeedContent($response->body(), $feedUrl);
        } catch (\Exception $e) {
            Log::error('Feed parsing failed', ['url' => $feedUrl, 'error' => $e->getMessage()]);
            return null;
        }
    }

    private function isFeedContentType(?string $contentType): bool
    {
        if (!$contentType) {
            return false;
        }

        return str_contains($contentType, 'application/rss+xml') ||
               str_contains($contentType, 'application/atom+xml') ||
               str_contains($contentType, 'application/xml') ||
               str_contains($contentType, 'text/xml');
    }

    private function findFeedInHtml(string $html, string $baseUrl): ?array
    {
        $dom = new \DOMDocument();
        
        // Suppress warnings for malformed HTML
        libxml_use_internal_errors(true);
        $dom->loadHTML($html);
        libxml_clear_errors();

        $xpath = new \DOMXPath($dom);
        
        // Look for feed links
        $links = $xpath->query('//link[@rel="alternate"][@type="application/rss+xml" or @type="application/atom+xml"]');
        
        if ($links->length > 0) {
            $href = $links->item(0)->getAttribute('href');
            $feedUrl = $this->resolveUrl($href, $baseUrl);
            
            return $this->parseFeed($feedUrl);
        }

        return null;
    }

    private function resolveUrl(string $href, string $baseUrl): string
    {
        if (str_starts_with($href, 'http')) {
            return $href;
        }

        $baseParts = parse_url($baseUrl);
        $scheme = $baseParts['scheme'] ?? 'https';
        $host = $baseParts['host'] ?? '';
        
        if (str_starts_with($href, '/')) {
            return "{$scheme}://{$host}{$href}";
        }

        return "{$scheme}://{$host}/" . ltrim($href, '/');
    }

    private function parseFeedContent(string $content, string $url): ?array
    {
        $xml = simplexml_load_string($content, SimpleXMLElement::class, LIBXML_NOCDATA);
        
        if (!$xml) {
            return null;
        }

        $feed = [
            'title' => '',
            'description' => '',
            'url' => $url,
            'feed_url' => $url,
            'type' => 'rss',
            'entries' => []
        ];

        // Detect feed type
        if ($xml->getName() === 'rss') {
            return $this->parseRssFeed($xml, $feed);
        } elseif ($xml->getName() === 'feed') {
            return $this->parseAtomFeed($xml, $feed);
        }

        return null;
    }

    private function parseRssFeed(SimpleXMLElement $xml, array $feed): array
    {
        $channel = $xml->channel;
        
        $feed['title'] = (string) ($channel->title ?? '');
        $feed['description'] = (string) ($channel->description ?? '');
        $feed['url'] = (string) ($channel->link ?? $feed['url']);

        foreach ($channel->item as $item) {
            $feed['entries'][] = [
                'title' => (string) ($item->title ?? ''),
                'content' => $this->getContent($item),
                'excerpt' => $this->getExcerpt($item),
                'url' => (string) ($item->link ?? ''),
                'thumbnail_url' => $this->getThumbnail($item),
                'author' => $this->getAuthor($item),
                'published_at' => $this->getPublishedDate($item),
                'guid' => (string) ($item->guid ?? (string) ($item->link ?? '')),
            ];
        }

        return $feed;
    }

    private function parseAtomFeed(SimpleXMLElement $xml, array $feed): array
    {
        $feed['title'] = (string) ($xml->title ?? '');
        $feed['description'] = (string) ($xml->subtitle ?? '');
        
        // Find the main link
        foreach ($xml->link as $link) {
            if ((string) $link['rel'] === 'alternate' || !isset($link['rel'])) {
                $feed['url'] = (string) $link['href'];
                break;
            }
        }

        foreach ($xml->entry as $entry) {
            $feed['entries'][] = [
                'title' => (string) ($entry->title ?? ''),
                'content' => $this->getAtomContent($entry),
                'excerpt' => $this->getAtomExcerpt($entry),
                'url' => $this->getAtomLink($entry),
                'thumbnail_url' => $this->getAtomThumbnail($entry),
                'author' => $this->getAtomAuthor($entry),
                'published_at' => $this->getAtomPublishedDate($entry),
                'guid' => (string) ($entry->id ?? (string) $this->getAtomLink($entry)),
            ];
        }

        return $feed;
    }

    private function getContent(SimpleXMLElement $item): string
    {
        return (string) ($item->description ?? $item->content ?? '');
    }

    private function getExcerpt(SimpleXMLElement $item): string
    {
        $content = $this->getContent($item);
        return strip_tags(substr($content, 0, 300));
    }

    private function getAuthor(SimpleXMLElement $item): string
    {
        return (string) ($item->author ?? $item->creator ?? '');
    }

    private function getPublishedDate(SimpleXMLElement $item): string
    {
        $date = $item->pubDate ?? null;
        
        // Handle Dublin Core namespace
        if (!$date && isset($item->children('dc', true)->date)) {
            $date = $item->children('dc', true)->date;
        }
        
        return $date ? (string) $date : now()->toISOString();
    }

    private function getAtomContent(SimpleXMLElement $entry): string
    {
        foreach ($entry->content as $content) {
            return (string) $content;
        }
        return (string) ($entry->summary ?? '');
    }

    private function getAtomExcerpt(SimpleXMLElement $entry): string
    {
        $content = $this->getAtomContent($entry);
        return strip_tags(substr($content, 0, 300));
    }

    private function getAtomLink(SimpleXMLElement $entry): string
    {
        foreach ($entry->link as $link) {
            if ((string) $link['rel'] === 'alternate' || !isset($link['rel'])) {
                return (string) $link['href'];
            }
        }
        return '';
    }

    private function getAtomAuthor(SimpleXMLElement $entry): string
    {
        if (isset($entry->author->name)) {
            return (string) $entry->author->name;
        }
        return '';
    }

    private function getAtomPublishedDate(SimpleXMLElement $entry): string
    {
        $date = $entry->published ?? $entry->updated ?? null;
        return $date ? (string) $date : now()->toISOString();
    }

    public function createOrUpdateFeed(array $feedData): Feed
    {
        $feed = Feed::firstOrCreate(
            ['feed_url' => $feedData['feed_url']],
            [
                'url' => $feedData['url'],
                'title' => $feedData['title'],
                'description' => $feedData['description'],
                'type' => $feedData['type'],
                'last_fetched_at' => now(),
            ]
        );

        if (!$feed->wasRecentlyCreated) {
            $feed->update(['last_fetched_at' => now()]);
        }

        return $feed;
    }

    public function createEntries(Feed $feed, array $entries): void
    {
        foreach ($entries as $entryData) {
            $entry = Entry::firstOrCreate(
                ['feed_id' => $feed->id, 'guid' => $entryData['guid']],
                [
                    'title' => $entryData['title'],
                    'content' => $entryData['content'],
                    'excerpt' => $entryData['excerpt'],
                    'url' => $entryData['url'],
                    'thumbnail_url' => $entryData['thumbnail_url'] ?? null,
                    'author' => $entryData['author'],
                    'published_at' => $entryData['published_at'],
                ]
            );
        }
    }

    private function getThumbnail(SimpleXMLElement $item): ?string
    {
        // Check for media:thumbnail
        if (isset($item->children('media', true)->thumbnail)) {
            $thumbnail = $item->children('media', true)->thumbnail;
            return (string) ($thumbnail['url'] ?? null);
        }

        // Check for enclosure with image type
        if (isset($item->enclosure) && 
            str_contains((string) $item->enclosure['type'], 'image')) {
            return (string) $item->enclosure['url'];
        }

        // Check for YouTube thumbnails in description
        if (isset($item->description)) {
            $description = (string) $item->description;
            if (preg_match('/<img[^>]+src="([^"]+youtube[^"]+)"/', $description, $matches)) {
                return $matches[1];
            }
            
            // Extract YouTube video ID for thumbnail - handle both formats
            if (preg_match('/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/', (string) $item->link, $matches)) {
                $videoId = $matches[1];
                return "https://img.youtube.com/vi/{$videoId}/maxresdefault.jpg";
            }
            
            if (preg_match('/youtu\.be\/([a-zA-Z0-9_-]+)/', (string) $item->link, $matches)) {
                $videoId = $matches[1];
                return "https://img.youtube.com/vi/{$videoId}/maxresdefault.jpg";
            }
        }

        // Also check for media:group in YouTube feeds
        if (isset($item->children('media', true)->group)) {
            $group = $item->children('media', true)->group;
            if (isset($group->thumbnail)) {
                return (string) $group->thumbnail['url'];
            }
        }

        return null;
    }

    private function getAtomThumbnail(SimpleXMLElement $entry): ?string
    {
        // Check for media:thumbnail in Atom
        if (isset($entry->children('media', true)->thumbnail)) {
            $thumbnail = $entry->children('media', true)->thumbnail;
            return (string) ($thumbnail['url'] ?? null);
        }

        // Check for enclosure with image type
        if (isset($entry->enclosure) && 
            str_contains((string) $entry->enclosure['type'], 'image')) {
            return (string) $entry->enclosure['url'];
        }

        return null;
    }
}
