<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->unique()->constrained('sessions')->onDelete('cascade');
            $table->enum('status', ['pending', 'in_progress', 'paused', 'finished'])->default('pending');
            $table->unsignedSmallInteger('score_team_a')->default(0);
            $table->unsignedSmallInteger('score_team_b')->default(0);
            $table->unsignedTinyInteger('current_period')->default(1);
            $table->unsignedTinyInteger('total_periods')->default(2);
            $table->unsignedInteger('period_duration_seconds');
            $table->unsignedInteger('elapsed_seconds')->default(0);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('paused_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
        });

        Schema::create('match_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_id')->constrained('matches')->onDelete('cascade');
            $table->enum('type', ['goal', 'assist', 'basket', 'point', 'rebound', 'block', 'steal', 'foul', 'card_yellow', 'card_red', 'substitution']);
            $table->enum('team_side', ['team_a', 'team_b']);
            $table->foreignId('player_id')->nullable()->constrained('users')->onDelete('set null');
            $table->unsignedTinyInteger('points')->nullable(); // Points marqués (1, 2 ou 3 au basket-ball)
            $table->unsignedSmallInteger('minute');
            $table->timestamp('created_at')->useCurrent();

            $table->index('match_id');
        });

        Schema::create('user_sport_statistics', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('sport_id')->constrained('sports')->onDelete('cascade');
            $table->unsignedInteger('matches_played')->default(0);
            $table->unsignedInteger('wins')->default(0);
            $table->unsignedInteger('losses')->default(0);
            $table->unsignedInteger('draws')->default(0);
            $table->unsignedInteger('goals_scored')->default(0);
            $table->unsignedInteger('points_scored')->default(0);
            $table->unsignedInteger('mvp_count')->default(0);
            $table->timestamp('updated_at')->nullable();
            $table->primary(['user_id', 'sport_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_sport_statistics');
        Schema::dropIfExists('match_events');
        Schema::dropIfExists('matches');
    }
};
