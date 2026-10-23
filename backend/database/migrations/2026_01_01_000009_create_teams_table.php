<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teams', function (Blueprint $table) {
            $table->id();
            $table->string('name', 80);
            $table->foreignId('sport_id')->constrained('sports')->onDelete('restrict');
            $table->foreignId('captain_id')->constrained('users')->onDelete('cascade');
            $table->string('logo_path')->nullable();
            $table->unsignedSmallInteger('max_members')->default(15);
            $table->timestamps();

            $table->index('sport_id');
            $table->index('captain_id');
        });

        Schema::create('team_members', function (Blueprint $table) {
            $table->foreignId('team_id')->constrained('teams')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->enum('role', ['captain', 'member'])->default('member');
            $table->timestamp('joined_at')->useCurrent();
            $table->primary(['team_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_members');
        Schema::dropIfExists('teams');
    }
};
