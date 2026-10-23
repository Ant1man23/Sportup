<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment('SportUp: Trouve ton match. Joue. Progresse.');
})->purpose('Display an inspiring quote');

Schedule::command('sportup:send-session-reminders')->everyFifteenMinutes();
