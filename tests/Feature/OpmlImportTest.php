<?php

use App\Models\Category;
use App\Models\Feed;
use App\Models\User;
use App\Services\OpmlService;
use Illuminate\Http\UploadedFile;

test('users can import feeds from OPML file', function () {
    $user = User::factory()->create();

    // Create a sample OPML content with mockable feeds
    $opmlContent = '<?xml version="1.0" encoding="UTF-8"?>
    <opml version="2.0">
        <head>
            <title>Sample Feeds</title>
        </head>
        <body>
            <outline text="Tech Blogs" title="Tech Blogs">
                <outline text="Local Feed" title="Local Feed" type="rss" 
                         xmlUrl="https://localhost/feed1.xml" htmlUrl="https://localhost"/>
                <outline text="Another Local Feed" title="Another Local Feed" type="rss" 
                         xmlUrl="https://localhost/feed2.xml" htmlUrl="https://localhost2"/>
            </outline>
            <outline text="News" title="News">
                <outline text="Local News" title="Local News" type="rss" 
                         xmlUrl="https://localhost/news.xml" htmlUrl="https://localhost/news"/>
            </outline>
            <outline text="Uncategorized Feed" title="Uncategorized Feed" type="rss" 
                     xmlUrl="https://localhost/uncategorized.xml" htmlUrl="https://localhost/uncategorized"/>
        </body>
    </opml>';

    // Create a fake file
    $file = UploadedFile::fake()->createWithContent('feeds.opml', $opmlContent);

    // Act as the user and make the request
    $response = $this->actingAs($user)
        ->post('/feeds/import-opml', [
            'opml_file' => $file,
        ]);

    // Assert the request was successful
    $response->assertRedirect();

    // Check that categories were created
    $this->assertDatabaseHas('categories', [
        'user_id' => $user->id,
        'name' => 'Tech Blogs',
    ]);

    $this->assertDatabaseHas('categories', [
        'user_id' => $user->id,
        'name' => 'News',
    ]);

    // Check that the import attempted to process feeds
    // Note: Since we're using localhost URLs, they won't actually be fetched
    // But we can verify the categories were created correctly
    $techCrunchCategory = Category::where('user_id', $user->id)->where('name', 'Tech Blogs')->first();
    $newsCategory = Category::where('user_id', $user->id)->where('name', 'News')->first();

    expect($techCrunchCategory)->not->toBeNull();
    expect($newsCategory)->not->toBeNull();
});

test('users cannot import invalid OPML files', function () {
    $user = User::factory()->create();

    // Create an invalid XML file
    $invalidContent = 'This is not valid XML';
    $file = UploadedFile::fake()->createWithContent('invalid.opml', $invalidContent);

    $response = $this->actingAs($user)
        ->post('/feeds/import-opml', [
            'opml_file' => $file,
        ]);

    $response->assertSessionHasErrors('opml');
});

test('OPML import skips already subscribed feeds', function () {
    $user = User::factory()->create();

    // Create an existing feed and subscription
    $existingFeed = Feed::factory()->create([
        'feed_url' => 'https://localhost/feed1.xml',
    ]);

    \App\Models\UserFeed::create([
        'user_id' => $user->id,
        'feed_id' => $existingFeed->id,
    ]);

    // OPML with the same feed
    $opmlContent = '<?xml version="1.0" encoding="UTF-8"?>
    <opml version="2.0">
        <head>
            <title>Sample Feeds</title>
        </head>
        <body>
            <outline text="Tech" title="Tech">
                <outline text="Local Feed" title="Local Feed" type="rss" 
                         xmlUrl="https://localhost/feed1.xml" htmlUrl="https://localhost"/>
            </outline>
        </body>
    </opml>';

    $file = UploadedFile::fake()->createWithContent('feeds.opml', $opmlContent);

    $response = $this->actingAs($user)
        ->post('/feeds/import-opml', [
            'opml_file' => $file,
        ]);

    $response->assertRedirect();

    // Should only have one subscription (the existing one)
    $this->assertDatabaseCount('user_feeds', 1);
});

test('OPML service parses categories and feeds correctly', function () {
    $service = new OpmlService;

    $opmlContent = '<?xml version="1.0" encoding="UTF-8"?>
    <opml version="2.0">
        <head>
            <title>Test Feeds</title>
        </head>
        <body>
            <outline text="Category 1" title="Category 1">
                <outline text="Feed 1" title="Feed 1" type="rss" 
                         xmlUrl="https://example1.com/feed.xml" htmlUrl="https://example1.com"/>
                <outline text="Feed 2" title="Feed 2" type="rss" 
                         xmlUrl="https://example2.com/feed.xml" htmlUrl="https://example2.com"/>
            </outline>
            <outline text="Feed 3" title="Feed 3" type="rss" 
                     xmlUrl="https://example3.com/feed.xml" htmlUrl="https://example3.com"/>
        </body>
    </opml>';

    $result = $service->parseOpml($opmlContent);

    expect($result)->toHaveKey('categories');
    expect($result)->toHaveKey('feeds');

    expect($result['categories'])->toHaveKey('Category 1');
    expect($result['categories']['Category 1']['name'])->toBe('Category 1');
    expect($result['categories']['Category 1']['feeds'])->toHaveCount(2);

    expect($result['feeds'])->toHaveCount(3);
    expect($result['feeds'][0]['category'])->toBe('Category 1');
    expect($result['feeds'][2]['category'])->toBeNull();
});
