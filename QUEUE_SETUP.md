# Production Setup Guide

## How It Works

FeedTrak uses two background systems to keep feeds updated automatically:

1. **Laravel Scheduler** — runs `feeds:refresh` every 30 minutes, dispatching a job per feed
2. **Queue Worker** — processes those jobs (fetching RSS, parsing entries, fetching thumbnails)

## Development

```bash
# Start everything (server + queue + scheduler) in one command:
composer run dev
```

Or run each piece separately:

```bash
# Terminal 1: Queue worker
php artisan queue:work --timeout=60 --sleep=3 --tries=3

# Terminal 2: Scheduler (runs every minute, checks what's due)
php artisan schedule:work
```

## Production

You need two things running at all times:

### 1. Cron entry (triggers the scheduler)

Add this single cron entry — Laravel handles the rest:

```cron
* * * * * cd /path/to/feedtrak && php artisan schedule:run >> /dev/null 2>&1
```

This runs every minute. Laravel checks internally what's actually due:
- `feeds:refresh` — every 30 minutes
- `entries:fetch-thumbnails --limit=50` — every hour

### 2. Queue worker (processes jobs)

#### Option A: Supervisor (recommended)
```ini
# /etc/supervisor/conf.d/feedtrak-worker.conf
[program:feedtrak-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /path/to/feedtrak/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=1
redirect_stderr=true
stdout_logfile=/path/to/feedtrak/storage/logs/worker.log
stopwaitsecs=3600
```

Then:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start feedtrak-worker:*
```

#### Option B: Systemd
```ini
# /etc/systemd/system/feedtrak-queue.service
[Unit]
Description=FeedTrak Queue Worker
After=network.target

[Service]
User=www-data
Group=www-data
Restart=always
ExecStart=/usr/bin/php /path/to/feedtrak/artisan queue:work --sleep=3 --tries=3 --max-time=3600
WorkingDirectory=/path/to/feedtrak

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable feedtrak-queue
sudo systemctl start feedtrak-queue
```

## Scheduled Tasks

| Command | Frequency | Purpose |
|---------|-----------|---------|
| `feeds:refresh` | Every 30 min | Dispatches a FetchFeedJob for every active feed |
| `entries:fetch-thumbnails --limit=50` | Hourly | Fetches og:image for entries missing thumbnails |

## Artisan Commands

```bash
# Manually refresh all feeds
php artisan feeds:refresh

# Refresh a specific feed
php artisan feeds:refresh --feed=42

# Backfill thumbnails
php artisan entries:fetch-thumbnails --limit=100

# Check queue status
php artisan queue:failed
php artisan queue:flush
```

## After Deploying

Always restart the queue worker after deploying new code:

```bash
php artisan queue:restart
```

This gracefully finishes the current job, then restarts with the new code.
