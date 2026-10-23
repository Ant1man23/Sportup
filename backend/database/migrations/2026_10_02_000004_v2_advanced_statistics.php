<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_sport_statistics', function (Blueprint $table) {
            if (!Schema::hasColumn('user_sport_statistics', 'assists')) {
                $table->unsignedInteger('assists')->default(0);
                $table->unsignedInteger('rebounds')->default(0);
                $table->unsignedInteger('blocks')->default(0);
                $table->unsignedInteger('steals')->default(0);
            }
        });

        if (!Schema::hasTable('user_statistics_history')) {
            Schema::create('user_statistics_history', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->foreignId('sport_id')->constrained('sports')->onDelete('cascade');
                $table->foreignId('match_id')->constrained('matches')->onDelete('cascade');
                $table->json('stats_json');
                $table->timestamp('played_at')->useCurrent();
                $table->timestamps();

                $table->index(['user_id', 'sport_id', 'played_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('user_statistics_history');
    }
};
