<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tournaments', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->foreignId('sport_id')->constrained('sports')->onDelete('restrict');
            $table->foreignId('organizer_id')->constrained('users')->onDelete('cascade');
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->string('location', 120)->nullable();       // Ville / Stade
            $table->string('city', 80)->nullable();
            $table->unsignedSmallInteger('max_teams')->default(16);
            $table->string('prize_pool', 60)->nullable();      // Ex: "1 500 000 Ar"
            $table->enum('status', ['open', 'in_progress', 'finished'])->default('open');
            $table->boolean('is_featured')->default(false);
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index('sport_id');
            $table->index('status');
        });

        // Pivot: teams inscrits dans un tournoi
        Schema::create('tournament_teams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tournament_id')->constrained('tournaments')->onDelete('cascade');
            $table->foreignId('team_id')->constrained('teams')->onDelete('cascade');
            $table->enum('status', ['pending', 'accepted', 'eliminated', 'winner'])->default('accepted');
            $table->timestamp('registered_at')->useCurrent();
            $table->unique(['tournament_id', 'team_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tournament_teams');
        Schema::dropIfExists('tournaments');
    }
};
