# FeedTrak

FeedTrak is a self-hosted feed reader for YouTube channels, RSS/Atom feeds, and podcasts. Subscribe to your sources, organize them into categories, track what you've seen, and save items for later — all from one unified inbox.

Built with [Laravel](https://laravel.com), [Inertia.js](https://inertiajs.com) + [React 19](https://react.dev), [TypeScript](https://www.typescriptlang.org), and [Tailwind CSS v4](https://tailwindcss.com).

## Features

- **YouTube sources** — Subscribe to any YouTube channel by URL and automatically track new videos.
- **RSS / Atom feeds** — Follow blogs, news sites, or any feed that exposes RSS or Atom.
- **Podcasts** — Subscribe to podcast feeds and keep up with new episodes.
- **Unified inbox** — All content from every source in one chronological feed.
- **Read tracking** — Mark items as seen so you only see what's new.
- **Save for later** — Bookmark entries to revisit any time.
- **Categories** — Organize your subscriptions into custom categories.
- **OPML import** — Bring your existing subscriptions across from another reader.
- **Daily digest emails** — Optional email summary of new entries.
- **Multi-user** — Feeds and entries are shared resources, but each user's reads, saves, categories, and preferences are isolated. See [`MULTI_TENANCY.md`](MULTI_TENANCY.md).

## Requirements

- PHP 8.2+ (8.4 recommended; CI runs on 8.4)
- Composer 2
- Node.js 22+ and npm
- A database supported by Laravel (SQLite by default; MySQL/PostgreSQL also work)

## Quick start

```bash
git clone https://github.com/jeksn/feedtrak.git
cd feedtrak

# Install PHP and JS dependencies, create .env, generate app key, run migrations, build assets
composer setup

# Start the app (Laravel server + queue worker + Vite dev server)
composer run dev
```

The app will be available at <http://localhost:8000>. Register an account at `/register` to get started.

## Manual setup

If you'd rather run the steps yourself:

```bash
composer install
npm install

cp .env.example .env
php artisan key:generate

# SQLite database (default)
touch database/database.sqlite
php artisan migrate

npm run build
```

Then run the dev stack:

```bash
composer run dev
```

This uses [`concurrently`](https://www.npmjs.com/package/concurrently) to start three processes side-by-side:

- `php artisan serve` — the Laravel app
- `php artisan queue:work --queue=feeds` — the background worker that fetches feeds
- `npm run dev` — Vite dev server with HMR

## Background jobs and scheduling

FeedTrak relies on Laravel's scheduler and queue to keep feeds fresh:

- `feeds:refresh` — dispatches a fetch job per feed (runs every 5 minutes)
- `entries:fetch-thumbnails --limit=50` — backfills missing entry thumbnails (hourly)
- `feeds:send-daily-digest` — sends the daily digest email (08:00)

For development, `composer run dev` runs the queue worker for you, and you can run `php artisan schedule:work` in a separate terminal if you want the scheduler too.

For production deployment (cron + Supervisor), see [`QUEUE_SETUP.md`](QUEUE_SETUP.md).

## Project structure

```
app/
  Console/Commands/  Artisan commands (RefreshFeeds, FetchMissingThumbnails, SendDailyDigest, …)
  Http/Controllers/  HTTP controllers (Inertia responses)
  Jobs/              Queue jobs (FetchFeedJob, FetchEntryThumbnail)
  Models/            Eloquent models (Feed, Entry, Category, UserFeed, …)
  Policies/          Authorization policies
  Scopes/            Global query scopes (UserScope)
  Services/          FeedService, OpmlService
resources/
  js/pages/          Inertia React pages (Home, Sources, Categories, …)
routes/
  web.php            Web routes
  console.php        Scheduler entries
tests/               Pest tests
```

## Useful commands

```bash
# Backend
php artisan migrate                       # Run database migrations
php artisan feeds:refresh                 # Dispatch a refresh for every feed
php artisan feeds:refresh --feed=<id>     # Refresh a single feed
php artisan queue:work --queue=feeds      # Run the queue worker
php artisan schedule:work                 # Run the scheduler locally

# Tests and code quality
./vendor/bin/pest                         # Run the PHP test suite
./vendor/bin/pint                         # Format PHP (Laravel Pint)
npm run lint                              # ESLint (auto-fix)
npm run format                            # Prettier (write)
npm run format:check                      # Prettier (check only)
npm run types                             # TypeScript type-check

# Frontend
npm run dev                               # Vite dev server
npm run build                             # Production build
npm run build:ssr                         # Build with SSR bundle
```

## Testing

The PHP test suite uses [Pest](https://pestphp.com):

```bash
./vendor/bin/pest
```

To run a single test or group:

```bash
./vendor/bin/pest --filter=MultiTenancyTest
```

## Documentation

- [`MULTI_TENANCY.md`](MULTI_TENANCY.md) — how feeds, entries, and user data are isolated.
- [`QUEUE_SETUP.md`](QUEUE_SETUP.md) — production setup for cron and the queue worker.
- [`AGENTS.md`](AGENTS.md) / [`CLAUDE.md`](CLAUDE.md) — coding conventions for this codebase.

## License

This project is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
