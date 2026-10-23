<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            if (!Schema::hasColumn('teams', 'level')) {
                $table->enum('level', ['beginner', 'intermediate', 'advanced'])->nullable()->after('max_members');
            }
            if (!Schema::hasColumn('teams', 'city')) {
                $table->string('city', 100)->nullable()->after('level');
            }
            if (!Schema::hasColumn('teams', 'is_looking_for_opponent')) {
                $table->boolean('is_looking_for_opponent')->default(false)->after('city');
            }
        });

        if (!Schema::hasTable('team_invitations')) {
            Schema::create('team_invitations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('team_id')->constrained('teams')->onDelete('cascade');
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->foreignId('invited_by')->constrained('users')->onDelete('cascade');
                $table->enum('status', ['pending', 'accepted', 'declined', 'expired'])->default('pending');
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('team_invitations');
    }
};
