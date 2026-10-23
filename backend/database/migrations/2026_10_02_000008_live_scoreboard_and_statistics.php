<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Enrichissement de la table des matchs (matches) : chronométrage précis, fautes d'équipe, temps morts et identité visuelle
        Schema::table('matches', function (Blueprint $table) {
            if (!Schema::hasColumn('matches', 'period_started_at')) {
                $table->timestamp('period_started_at')->nullable()->after('started_at');
            }
            if (!Schema::hasColumn('matches', 'last_resumed_at')) {
                $table->timestamp('last_resumed_at')->nullable()->after('period_started_at');
            }
            if (!Schema::hasColumn('matches', 'period_elapsed_seconds')) {
                $table->unsignedInteger('period_elapsed_seconds')->default(0)->after('elapsed_seconds');
            }
            if (!Schema::hasColumn('matches', 'team_a_fouls')) {
                $table->unsignedTinyInteger('team_a_fouls')->default(0)->after('score_team_b');
                $table->unsignedTinyInteger('team_b_fouls')->default(0)->after('team_a_fouls');
            }
            if (!Schema::hasColumn('matches', 'team_a_timeouts')) {
                $table->unsignedTinyInteger('team_a_timeouts')->default(0)->after('team_b_fouls');
                $table->unsignedTinyInteger('team_b_timeouts')->default(0)->after('team_a_timeouts');
            }
            if (!Schema::hasColumn('matches', 'team_a_color')) {
                $table->string('team_a_color', 7)->nullable()->after('team_b_timeouts');
                $table->string('team_b_color', 7)->nullable()->after('team_a_color');
            }
            if (!Schema::hasColumn('matches', 'team_a_logo')) {
                $table->string('team_a_logo')->nullable()->after('team_b_color');
                $table->string('team_b_logo')->nullable()->after('team_a_logo');
            }
        });

        // 2. Ajustements des événements de match (match_events) : statistiques avancées multi-sports
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE match_events MODIFY COLUMN type VARCHAR(32) NOT NULL");
        }

        Schema::table('match_events', function (Blueprint $table) {
            if (!Schema::hasColumn('match_events', 'shot_type')) {
                $table->string('shot_type', 20)->nullable()->after('points'); // Type de tir : '2pt', '3pt', 'free_throw'
            }
            if (!Schema::hasColumn('match_events', 'shot_result')) {
                $table->string('shot_result', 20)->nullable()->after('shot_type'); // Résultat du tir : 'made' (réussi), 'missed' (manqué)
            }
            if (!Schema::hasColumn('match_events', 'rebound_type')) {
                $table->string('rebound_type', 20)->nullable()->after('shot_result'); // Type de rebond : 'offensive', 'defensive'
            }
            if (!Schema::hasColumn('match_events', 'foul_type')) {
                $table->string('foul_type', 20)->nullable()->after('rebound_type'); // Type de faute : 'personal', 'shooting', 'technical', 'offensive'
            }
            if (!Schema::hasColumn('match_events', 'sub_in_player_id')) {
                $table->foreignId('sub_in_player_id')->nullable()->after('player_id')->constrained('users')->onDelete('set null');
            }
            if (!Schema::hasColumn('match_events', 'sub_out_player_id')) {
                $table->foreignId('sub_out_player_id')->nullable()->after('sub_in_player_id')->constrained('users')->onDelete('set null');
            }
            if (!Schema::hasColumn('match_events', 'related_player_id')) {
                $table->foreignId('related_player_id')->nullable()->after('sub_out_player_id')->constrained('users')->onDelete('set null');
            }
            if (!Schema::hasColumn('match_events', 'period')) {
                $table->unsignedTinyInteger('period')->default(1)->after('minute');
            }
            if (!Schema::hasColumn('match_events', 'match_time_seconds')) {
                $table->unsignedSmallInteger('match_time_seconds')->default(0)->after('period');
            }
            if (!Schema::hasColumn('match_events', 'recorded_by')) {
                $table->foreignId('recorded_by')->nullable()->after('match_time_seconds')->constrained('users')->onDelete('set null');
            }
            if (!Schema::hasColumn('match_events', 'is_cancelled')) {
                $table->boolean('is_cancelled')->default(false)->after('recorded_by');
                $table->timestamp('cancelled_at')->nullable()->after('is_cancelled');
            }
            if (!Schema::hasColumn('match_events', 'idempotency_key')) {
                $table->string('idempotency_key', 64)->nullable()->after('cancelled_at');
                $table->index(['match_id', 'idempotency_key']);
            }
            if (!Schema::hasColumn('match_events', 'metadata')) {
                $table->json('metadata')->nullable()->after('idempotency_key');
            }
        });

        // 3. Table des effectifs de match (match_players) : composition des équipes, numéros de maillot et temps de jeu
        if (!Schema::hasTable('match_players')) {
            Schema::create('match_players', function (Blueprint $table) {
                $table->id();
                $table->foreignId('match_id')->constrained('matches')->onDelete('cascade');
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->enum('team_side', ['team_a', 'team_b']);
                $table->unsignedSmallInteger('jersey_number')->nullable();
                $table->string('position', 30)->nullable();
                $table->boolean('is_starter')->default(true);
                $table->boolean('is_on_court')->default(true);
                $table->unsignedInteger('seconds_played')->default(0);
                $table->unsignedSmallInteger('last_subbed_in_at')->nullable();
                $table->timestamps();

                $table->unique(['match_id', 'user_id']);
                $table->index(['match_id', 'team_side']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('match_players');

        Schema::table('match_events', function (Blueprint $table) {
            $table->dropForeign(['sub_in_player_id']);
            $table->dropForeign(['sub_out_player_id']);
            $table->dropForeign(['related_player_id']);
            $table->dropForeign(['recorded_by']);
            $table->dropColumn([
                'shot_type',
                'shot_result',
                'rebound_type',
                'foul_type',
                'sub_in_player_id',
                'sub_out_player_id',
                'related_player_id',
                'period',
                'match_time_seconds',
                'recorded_by',
                'is_cancelled',
                'cancelled_at',
                'idempotency_key',
                'metadata',
            ]);
        });

        Schema::table('matches', function (Blueprint $table) {
            $table->dropColumn([
                'period_started_at',
                'last_resumed_at',
                'period_elapsed_seconds',
                'team_a_fouls',
                'team_b_fouls',
                'team_a_timeouts',
                'team_b_timeouts',
                'team_a_color',
                'team_b_color',
                'team_a_logo',
                'team_b_logo',
            ]);
        });
    }
};
