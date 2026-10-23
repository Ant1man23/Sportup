<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * BUGFIX : La table 'sessions' entre en conflit avec la table système de Laravel
 * utilisée par SESSION_DRIVER=database. On la renomme en 'sport_sessions' et on
 * met à jour la table pivot 'session_participants' en conséquence.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('sessions', 'sport_sessions');
        Schema::rename('session_participants', 'sport_session_participants');
    }

    public function down(): void
    {
        Schema::rename('sport_session_participants', 'session_participants');
        Schema::rename('sport_sessions', 'sessions');
    }
};
