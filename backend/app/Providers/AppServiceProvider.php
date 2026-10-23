<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        Schema::defaultStringLength(191);

        // Anti Brute-force Rate Limiter on /auth/login (5 attempts per minute per IP)
        RateLimiter::for('login', function (Request $request) {
            if (app()->environment('testing') && !$request->header('X-Test-Rate-Limit')) {
                return Limit::none();
            }

            return Limit::perMinute(5)
                ->by($request->ip())
                ->response(function (Request $request, array $headers) {
                    return response()->json([
                        'message'     => 'Trop de tentatives de connexion. Veuillez patienter 1 minute avant de réessayer.',
                        'error'       => 'rate_limit_exceeded',
                        'retry_after' => $headers['Retry-After'] ?? 60,
                    ], 429, $headers);
                });
        });

        // Global API rate limiter (60 requests per minute per user or IP)
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });
    }
}
