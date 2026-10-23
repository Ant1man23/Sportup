<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Initialisation des nouvelles disciplines sportives (Volleyball, Tennis de table)
        $sports = [
            ['name' => 'Volleyball', 'slug' => 'volleyball', 'icon' => 'volleyball', 'color_hex' => '#9C27B0', 'is_active' => true],
            ['name' => 'Tennis de table', 'slug' => 'table-tennis', 'icon' => 'table-tennis', 'color_hex' => '#FF9800', 'is_active' => true],
        ];

        foreach ($sports as $s) {
            if (!DB::table('sports')->where('slug', $s['slug'])->exists()) {
                DB::table('sports')->insert(array_merge($s, ['created_at' => now(), 'updated_at' => now()]));
            }
        }

        if (!Schema::hasTable('match_sets')) {
            Schema::create('match_sets', function (Blueprint $table) {
                $table->id();
                $table->foreignId('match_id')->constrained('matches')->onDelete('cascade');
                $table->unsignedTinyInteger('set_number');
                $table->unsignedSmallInteger('score_team_a')->default(0);
                $table->unsignedSmallInteger('score_team_b')->default(0);
                $table->timestamps();

                $table->unique(['match_id', 'set_number']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('match_sets');
    }
};
