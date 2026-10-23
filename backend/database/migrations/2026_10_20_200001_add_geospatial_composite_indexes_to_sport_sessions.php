<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sport_sessions', function (Blueprint $table) {
            // Index composite optimisé pour les requêtes géospatiales de proximité (ST_Distance_Sphere) et le filtrage par date/statut
            $table->index(
                ['latitude', 'longitude', 'status', 'session_date'],
                'idx_sessions_geo_composite'
            );

            // Index pour le filtrage rapide par ville, statut et date de session
            $table->index(
                ['city', 'status', 'session_date'],
                'idx_sessions_city_status_date'
            );
        });
    }

    public function down(): void
    {
        Schema::table('sport_sessions', function (Blueprint $table) {
            $table->dropIndex('idx_sessions_geo_composite');
            $table->dropIndex('idx_sessions_city_status_date');
        });
    }
};
