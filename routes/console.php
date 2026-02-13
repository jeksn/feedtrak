<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('feeds:refresh')->everyThirtyMinutes()->withoutOverlapping();
Schedule::command('entries:fetch-thumbnails --limit=50')->hourly()->withoutOverlapping();
