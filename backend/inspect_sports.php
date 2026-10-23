<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== SPORTS & REGLES DISCIPLINAIRES V2 ===" . PHP_EOL;
$sports = \App\Models\Sport::all();
foreach ($sports as $s) {
    echo sprintf(
        "ID: %d | Nom: %-15s | Slug: %-12s | Scoring: %-10s | Périodes: %d | Durée: %ds | Config: %s\n",
        $s->id,
        $s->name,
        $s->slug,
        $s->scoring_type ?? 'goals',
        $s->default_periods ?? 2,
        $s->period_duration_seconds ?? 1200,
        json_encode($s->rules_config ?? [])
    );
}
