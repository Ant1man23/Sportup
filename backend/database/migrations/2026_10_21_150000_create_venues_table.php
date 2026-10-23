<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('venues', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('district');                // Antananarivo Renivohitra, Atsimondrano...
            $table->string('city')->default('Antananarivo');
            $table->string('address');
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();

            // Sports disponibles (JSON array of sport slugs)
            $table->json('sports')->nullable();

            // Caractéristiques
            $table->enum('surface_type', ['gazon_naturel', 'gazon_synthetique', 'beton', 'parquet', 'sable', 'ciment'])->default('gazon_synthetique');
            $table->integer('capacity')->nullable();   // nb joueurs max simultanés
            $table->boolean('has_lighting')->default(false);
            $table->boolean('has_changing_rooms')->default(false);
            $table->boolean('has_parking')->default(false);
            $table->boolean('has_tribunes')->default(false);
            $table->boolean('has_canteen')->default(false);
            $table->boolean('is_indoor')->default(false);

            // Tarifs
            $table->integer('price_per_hour')->nullable();   // en Ariary
            $table->string('price_currency')->default('MGA');

            // Contact & réservation
            $table->string('phone_primary')->nullable();
            $table->string('phone_secondary')->nullable();
            $table->string('whatsapp_number')->nullable();
            $table->string('email')->nullable();
            $table->string('facebook_url')->nullable();
            $table->text('booking_notes')->nullable();        // "Réserver 24h à l'avance"

            // Horaires
            $table->string('opening_time')->default('07:00');
            $table->string('closing_time')->default('22:00');
            $table->json('open_days')->nullable();

            // Médias
            $table->string('cover_image')->nullable();
            $table->json('gallery')->nullable();

            // Avis & popularité
            $table->decimal('rating', 3, 2)->default(0.00);
            $table->integer('review_count')->default(0);
            $table->integer('booking_count')->default(0);   // nb de sessions créées ici

            $table->boolean('is_active')->default(true);
            $table->boolean('is_verified')->default(false);  // terrain vérifié par SportUp

            $table->timestamps();
        });

        // Soft link : sessions créées dans ce terrain
        Schema::table('sport_sessions', function (Blueprint $table) {
            $table->foreignId('venue_id')->nullable()->constrained('venues')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('sport_sessions', function (Blueprint $table) {
            $table->dropForeign(['venue_id']);
            $table->dropColumn('venue_id');
        });
        Schema::dropIfExists('venues');
    }
};
