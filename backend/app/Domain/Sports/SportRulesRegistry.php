<?php

namespace App\Domain\Sports;

use App\Domain\Sports\Contracts\SportRulesEngineInterface;
use App\Domain\Sports\Engines\Basketball3x3RulesEngine;
use App\Domain\Sports\Engines\Basketball5x5RulesEngine;
use App\Domain\Sports\Engines\FutsalRulesEngine;
use App\Domain\Sports\Engines\TableTennisRulesEngine;
use App\Domain\Sports\Engines\VolleyballRulesEngine;
use App\Models\SportMatch;
use InvalidArgumentException;

class SportRulesRegistry
{
    /**
     * @var array<string, SportRulesEngineInterface>
     */
    private array $engines = [];

    /**
     * Alias mapping for sport identifiers
     */
    private array $slugAliases = [
        'futsal' => 'futsal',
        'football-5' => 'futsal',
        'futsal-fifa' => 'futsal',
        'basketball-3x3' => 'basketball-3x3',
        'basket-3x3' => 'basketball-3x3',
        '3x3' => 'basketball-3x3',
        'basketball-5x5' => 'basketball-5x5',
        'basketball' => 'basketball-5x5',
        'basket' => 'basketball-5x5',
        'volleyball' => 'volleyball',
        'volley' => 'volleyball',
        'table-tennis' => 'table-tennis',
        'tennis-de-table' => 'table-tennis',
        'ping-pong' => 'table-tennis',
    ];

    public function __construct()
    {
        $this->registerEngine(new FutsalRulesEngine());
        $this->registerEngine(new Basketball3x3RulesEngine());
        $this->registerEngine(new Basketball5x5RulesEngine());
        $this->registerEngine(new VolleyballRulesEngine());
        $this->registerEngine(new TableTennisRulesEngine());
    }

    public function registerEngine(SportRulesEngineInterface $engine): void
    {
        $this->engines[$engine->getSportSlug()] = $engine;
    }

    public function getEngine(string $slug): SportRulesEngineInterface
    {
        $normalized = strtolower(trim($slug));
        $resolvedKey = $this->slugAliases[$normalized] ?? $normalized;

        if (isset($this->engines[$resolvedKey])) {
            return $this->engines[$resolvedKey];
        }

        // If unknown, fallback or throw
        throw new InvalidArgumentException("Aucun moteur de règles officielles n'est enregistré pour la discipline '{$slug}'.");
    }

    public function getEngineForMatch(SportMatch $match): SportRulesEngineInterface
    {
        // 1. Try match's sport relation
        if ($match->relationLoaded('sport') && $match->sport) {
            $slug = $match->sport->slug;
            if ($this->hasEngine($slug)) {
                return $this->getEngine($slug);
            }
        } elseif ($match->sport_id) {
            $sport = $match->sport()->first();
            if ($sport && $this->hasEngine($sport->slug)) {
                return $this->getEngine($sport->slug);
            }
        }

        // 2. Try rules_profile or format string
        if (!empty($match->rules_profile)) {
            if (str_contains($match->rules_profile, 'futsal')) return $this->getEngine('futsal');
            if (str_contains($match->rules_profile, '3x3')) return $this->getEngine('basketball-3x3');
            if (str_contains($match->rules_profile, '5x5') || str_contains($match->rules_profile, 'basketball')) return $this->getEngine('basketball-5x5');
            if (str_contains($match->rules_profile, 'volleyball')) return $this->getEngine('volleyball');
            if (str_contains($match->rules_profile, 'table_tennis') || str_contains($match->rules_profile, 'tennis_de_table')) return $this->getEngine('table-tennis');
        }

        if (!empty($match->match_format)) {
            if (str_contains($match->match_format, '3x3')) return $this->getEngine('basketball-3x3');
            if (str_contains($match->match_format, '5x5')) return $this->getEngine('basketball-5x5');
        }

        // Default fallback to futsal/football-5 if undetermined
        return $this->getEngine('futsal');
    }

    public function hasEngine(string $slug): bool
    {
        $normalized = strtolower(trim($slug));
        $resolvedKey = $this->slugAliases[$normalized] ?? $normalized;
        return isset($this->engines[$resolvedKey]);
    }

    /**
     * Récupère la liste de toutes les disciplines officielles supportées et de leurs fédérations de tutelle (FIBA, FIFA, FIVB, ITTF).
     */
    public function getSupportedSports(): array
    {
        $list = [];
        foreach ($this->engines as $slug => $engine) {
            $list[$slug] = [
                'slug' => $engine->getSportSlug(),
                'official_body' => $engine->getOfficialBody(),
                'rules_version' => $engine->getOfficialRulesVersion(),
                'default_profile' => $engine->getDefaultRulesProfile(),
            ];
        }
        return $list;
    }
}
