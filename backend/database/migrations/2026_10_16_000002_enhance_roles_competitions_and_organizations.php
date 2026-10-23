<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Rôles sur users
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'role')) {
                $table->enum('role', ['player', 'team_manager', 'organizer', 'referee', 'spectator', 'admin'])
                    ->default('player')
                    ->after('level');
            }
        });

        // 2. Types de rencontres, participation, accès spectateurs et arbitre sur sport_sessions
        Schema::table('sport_sessions', function (Blueprint $table) {
            if (!Schema::hasColumn('sport_sessions', 'competition_type')) {
                $table->enum('competition_type', [
                    'friendly',
                    'corporate',
                    'tournament',
                    'championship',
                    'school_university',
                    'official',
                    'community'
                ])->default('friendly')->after('type');
            }

            if (!Schema::hasColumn('sport_sessions', 'participation_mode')) {
                $table->enum('participation_mode', [
                    'open',
                    'invitation',
                    'teams_assigned',
                    'approval_required'
                ])->default('open')->after('competition_type');
            }

            if (!Schema::hasColumn('sport_sessions', 'spectator_access')) {
                $table->enum('spectator_access', [
                    'free',
                    'paid',
                    'private',
                    'online_only'
                ])->default('free')->after('participation_mode');
            }

            if (!Schema::hasColumn('sport_sessions', 'referee_id')) {
                $table->unsignedBigInteger('referee_id')->nullable()->after('organizer_id');
            }

            if (!Schema::hasColumn('sport_sessions', 'location_details')) {
                $table->text('location_details')->nullable()->after('address');
            }

            if (!Schema::hasColumn('sport_sessions', 'registration_deadline')) {
                $table->dateTime('registration_deadline')->nullable()->after('session_date');
            }
        });

        // 3. Organisations et capitaines sur teams
        Schema::table('teams', function (Blueprint $table) {
            if (!Schema::hasColumn('teams', 'organization_type')) {
                $table->enum('organization_type', [
                    'enterprise',
                    'club',
                    'association',
                    'school_university',
                    'administration',
                    'independent_group'
                ])->default('independent_group')->after('sport_id');
            }

            if (!Schema::hasColumn('teams', 'organization_name')) {
                $table->string('organization_name', 191)->nullable()->after('organization_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'role')) {
                $table->dropColumn('role');
            }
        });

        Schema::table('sport_sessions', function (Blueprint $table) {
            $table->dropColumn([
                'competition_type',
                'participation_mode',
                'spectator_access',
                'referee_id',
                'location_details',
                'registration_deadline',
            ]);
        });

        Schema::table('teams', function (Blueprint $table) {
            $table->dropColumn([
                'organization_type',
                'organization_name',
                'captain_id',
            ]);
        });
    }
};
