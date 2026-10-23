<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organizer_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('sport_id')->constrained('sports')->onDelete('restrict');
            $table->enum('type', ['find_players', 'find_opponent', 'free_match']);
            $table->string('format', 20); // Format de jeu (ex: "5v5", "3v3", "7v7", "11v11")
            $table->date('session_date');
            $table->time('start_time');
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->string('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('region', 100)->nullable();
            $table->char('country', 2)->default('MG');
            $table->enum('level', ['beginner', 'intermediate', 'advanced', 'all'])->default('all');
            $table->unsignedSmallInteger('max_participants');
            $table->unsignedSmallInteger('current_participants')->default(1);
            $table->text('description')->nullable();
            $table->enum('status', ['open', 'full', 'cancelled', 'in_progress', 'finished'])->default('open');
            $table->string('cancelled_reason')->nullable();
            $table->timestamps();

            $table->index(['status', 'session_date']);
            $table->index(['latitude', 'longitude']);
        });

        Schema::create('session_participants', function (Blueprint $table) {
            $table->foreignId('session_id')->constrained('sessions')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->timestamp('joined_at')->useCurrent();
            $table->primary(['session_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('session_participants');
        Schema::dropIfExists('sessions');
    }
};
