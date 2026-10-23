<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE match_events MODIFY COLUMN type ENUM('goal', 'assist', 'basket', 'point', 'rebound', 'block', 'steal', 'foul', 'card_yellow', 'card_red', 'substitution') NOT NULL");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE match_events MODIFY COLUMN type ENUM('goal', 'basket', 'foul', 'card_yellow', 'card_red', 'substitution') NOT NULL");
        }
    }
};
