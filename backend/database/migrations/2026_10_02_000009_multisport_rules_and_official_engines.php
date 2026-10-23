<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            if (!Schema::hasColumn('matches', 'sets_won_a')) {
                $table->unsignedTinyInteger('sets_won_a')->default(0)->after('score_team_b');
                $table->unsignedTinyInteger('sets_won_b')->default(0)->after('sets_won_a');
            }
            if (!Schema::hasColumn('matches', 'serving_side')) {
                $table->enum('serving_side', ['team_a', 'team_b'])->nullable()->after('sets_won_b');
            }
            if (!Schema::hasColumn('matches', 'serving_player_id')) {
                $table->foreignId('serving_player_id')->nullable()->after('serving_side')->constrained('users')->onDelete('set null');
            }
            if (!Schema::hasColumn('matches', 'shot_clock_seconds')) {
                $table->unsignedTinyInteger('shot_clock_seconds')->nullable()->after('serving_player_id');
            }
            if (!Schema::hasColumn('matches', 'target_score')) {
                $table->unsignedSmallInteger('target_score')->nullable()->after('shot_clock_seconds');
            }
            if (!Schema::hasColumn('matches', 'match_format')) {
                $table->string('match_format', 30)->nullable()->after('target_score');
            }
            if (!Schema::hasColumn('matches', 'rules_profile')) {
                $table->string('rules_profile', 50)->nullable()->after('match_format');
            }
            if (!Schema::hasColumn('matches', 'rules_state')) {
                $table->json('rules_state')->nullable()->after('rules_profile');
            }
        });

        Schema::table('match_events', function (Blueprint $table) {
            if (!Schema::hasColumn('match_events', 'set_number')) {
                $table->unsignedTinyInteger('set_number')->nullable()->after('period');
            }
            if (!Schema::hasColumn('match_events', 'action_detail')) {
                $table->string('action_detail', 50)->nullable()->after('metadata');
            }
        });

        Schema::table('match_players', function (Blueprint $table) {
            if (!Schema::hasColumn('match_players', 'rotation_position')) {
                $table->unsignedTinyInteger('rotation_position')->nullable()->after('position');
            }
            if (!Schema::hasColumn('match_players', 'is_libero')) {
                $table->boolean('is_libero')->default(false)->after('rotation_position');
            }
            if (!Schema::hasColumn('match_players', 'fouls_count')) {
                $table->unsignedTinyInteger('fouls_count')->default(0)->after('is_libero');
            }
            if (!Schema::hasColumn('match_players', 'yellow_cards')) {
                $table->unsignedTinyInteger('yellow_cards')->default(0)->after('fouls_count');
                $table->unsignedTinyInteger('red_cards')->default(0)->after('yellow_cards');
            }
        });
    }

    public function down(): void
    {
        Schema::table('match_players', function (Blueprint $table) {
            $table->dropColumn([
                'rotation_position',
                'is_libero',
                'fouls_count',
                'yellow_cards',
                'red_cards',
            ]);
        });

        Schema::table('match_events', function (Blueprint $table) {
            $table->dropColumn([
                'set_number',
                'action_detail',
            ]);
        });

        Schema::table('matches', function (Blueprint $table) {
            $table->dropForeign(['serving_player_id']);
            $table->dropColumn([
                'sets_won_a',
                'sets_won_b',
                'serving_side',
                'serving_player_id',
                'shot_clock_seconds',
                'target_score',
                'match_format',
                'rules_profile',
                'rules_state',
            ]);
        });
    }
};
