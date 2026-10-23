<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tournaments', function (Blueprint $table) {
            if (!Schema::hasColumn('tournaments', 'format')) {
                $table->enum('format', ['groups', 'knockout', 'groups_then_knockout'])->default('knockout')->after('sport_id');
            }
            if (!Schema::hasColumn('tournaments', 'starts_on')) {
                $table->date('starts_on')->nullable()->after('status');
            }
        });

        Schema::table('tournament_teams', function (Blueprint $table) {
            if (!Schema::hasColumn('tournament_teams', 'group_label')) {
                $table->char('group_label', 1)->nullable()->after('team_id');
            }
            if (!Schema::hasColumn('tournament_teams', 'seed')) {
                $table->unsignedSmallInteger('seed')->nullable()->after('group_label');
            }
        });

        Schema::table('matches', function (Blueprint $table) {
            // Rend session_id optionnel pour permettre aux matchs de tournoi d'exister indépendamment d'une session publique
            $table->unsignedBigInteger('session_id')->nullable()->change();

            if (!Schema::hasColumn('matches', 'tournament_id')) {
                $table->foreignId('tournament_id')->nullable()->constrained('tournaments')->onDelete('cascade');
                $table->enum('stage', ['group', 'round_of_16', 'quarter', 'semi', 'final', 'third_place'])->nullable();
                $table->unsignedSmallInteger('round_number')->nullable();
                $table->foreignId('team_a_id')->nullable()->constrained('teams')->onDelete('set null');
                $table->foreignId('team_b_id')->nullable()->constrained('teams')->onDelete('set null');
            }
        });

        if (!Schema::hasTable('tournament_standings')) {
            Schema::create('tournament_standings', function (Blueprint $table) {
                $table->foreignId('tournament_id')->constrained('tournaments')->onDelete('cascade');
                $table->foreignId('team_id')->constrained('teams')->onDelete('cascade');
                $table->unsignedSmallInteger('played')->default(0);
                $table->unsignedSmallInteger('wins')->default(0);
                $table->unsignedSmallInteger('draws')->default(0);
                $table->unsignedSmallInteger('losses')->default(0);
                $table->unsignedInteger('points_for')->default(0);
                $table->unsignedInteger('points_against')->default(0);
                $table->unsignedSmallInteger('points')->default(0);
                $table->primary(['tournament_id', 'team_id']);
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('tournament_standings');
    }
};
