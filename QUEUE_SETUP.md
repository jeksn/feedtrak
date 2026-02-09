# Feed Refresh Optimization Guide

## The Problem
The feed refresh was taking too long and generating errors because:
1. No queue worker was running to process jobs
2. Jobs were timing out and failing
3. No rate limiting or smart refresh logic

## The Solution

### 1. Start the Queue Worker
```bash
# Option 1: Run in the foreground (for development)
php artisan queue:work --queue=feeds,default --timeout=60 --sleep=3 --tries=3

# Option 2: Use the custom command
php artisan queue:start

# Option 3: Run in the background (for production)
nohup php artisan queue:work --queue=feeds,default --timeout=60 --sleep=3 --tries=3 --daemon > /dev/null 2>&1 &
```

### 2. Optimizations Implemented

#### Backend Changes:
1. **Smart Refresh**: Only refresh feeds that haven't been updated in the last 5 minutes
2. **Job Timeouts**: Each job times out after 30 seconds
3. **Retry Logic**: Failed jobs retry with exponential backoff (10s, 30s, 60s)
4. **Error Handling**: Better error handling for connection and HTTP errors
5. **Entry Limit**: Limit to 100 entries per refresh to improve performance
6. **Queue Separation**: Feed jobs use a dedicated 'feeds' queue

#### Frontend Improvements:
1. **Better Feedback**: Shows how many feeds are being refreshed vs skipped
2. **Loading States**: Individual feed refresh buttons show loading state

### 3. Production Setup

For production, you should run the queue worker as a service:

#### Using Supervisor (recommended):
```ini
# /etc/supervisor/conf.d/feedtrak-worker.conf
[program:feedtrak-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /path/to/feedtrak/artisan queue:work --queue=feeds,default --sleep=3 --tries=3 --max-time=3600
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

#### Using Systemd:
```ini
# /etc/systemd/system/feedtrak-queue.service
[Unit]
Description=FeedTrak Queue Worker

[Service]
User=www-data
Group=www-data
Restart=always
ExecStart=/usr/bin/php /path/to/feedtrak/artisan queue:work --queue=feeds,default --sleep=3 --tries=3
WorkingDirectory=/path/to/feedtrak

[Install]
WantedBy=multi-user.target
```

### 4. Monitoring

Check queue status:
```bash
# See failed jobs
php artisan queue:failed

# Clear failed jobs
php artisan queue:flush

# Monitor queue in real-time
php artisan queue:monitor feeds,default
```

### 5. Performance Tips

1. **Database Optimization**: Ensure jobs table has proper indexes
2. **Memory Limit**: Queue worker restarts if memory exceeds 256MB
3. **Time Limit**: Worker restarts every hour to prevent memory leaks
4. **Concurrent Workers**: For high traffic, run multiple workers:
   ```bash
   php artisan queue:work --queue=feeds,default --timeout=60 --sleep=3 --tries=3 &
   php artisan queue:work --queue=feeds,default --timeout=60 --sleep=3 --tries=3 &
   php artisan queue:work --queue=feeds,default --timeout=60 --sleep=3 --tries=3 &
   ```

## Quick Fix

To immediately fix the refresh issue:

1. Clear failed jobs:
   ```bash
   php artisan queue:flush
   ```

2. Start the queue worker:
   ```bash
   php artisan queue:work --queue=feeds,default --timeout=60 --sleep=3 --tries=3
   ```

3. In another terminal, test the refresh:
   ```bash
   php artisan tinker
   >>> \App\Jobs\FetchFeedJob::dispatch('https://example.com/feed.xml')->onQueue('feeds');
   ```

The refresh should now work much faster and more reliably!
