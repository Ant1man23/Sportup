<?php

namespace Tests\Unit;

use App\Domain\Sports\Engines\Basketball3x3RulesEngine;
use App\Domain\Sports\Engines\Basketball5x5RulesEngine;
use App\Domain\Sports\Engines\FutsalRulesEngine;
use App\Domain\Sports\Engines\TableTennisRulesEngine;
use App\Domain\Sports\Engines\VolleyballRulesEngine;
use App\Domain\Sports\SportRulesRegistry;
use PHPUnit\Framework\TestCase;

class SportRulesEnginesTest extends TestCase
{
    private SportRulesRegistry $registry;

    protected function setUp(): void
    {
        parent::setUp();
        $this->registry = new SportRulesRegistry();
    }

    public function test_registry_resolves_all_official_disciplines(): void
    {
        $this->assertInstanceOf(FutsalRulesEngine::class, $this->registry->getEngine('futsal'));
        $this->assertInstanceOf(FutsalRulesEngine::class, $this->registry->getEngine('football-5'));
        $this->assertInstanceOf(Basketball3x3RulesEngine::class, $this->registry->getEngine('basketball-3x3'));
        $this->assertInstanceOf(Basketball3x3RulesEngine::class, $this->registry->getEngine('3x3'));
        $this->assertInstanceOf(Basketball5x5RulesEngine::class, $this->registry->getEngine('basketball-5x5'));
        $this->assertInstanceOf(Basketball5x5RulesEngine::class, $this->registry->getEngine('basket'));
        $this->assertInstanceOf(VolleyballRulesEngine::class, $this->registry->getEngine('volleyball'));
        $this->assertInstanceOf(VolleyballRulesEngine::class, $this->registry->getEngine('volley'));
        $this->assertInstanceOf(TableTennisRulesEngine::class, $this->registry->getEngine('table-tennis'));
        $this->assertInstanceOf(TableTennisRulesEngine::class, $this->registry->getEngine('ping-pong'));
    }

    public function test_table_tennis_default_profile(): void
    {
        $engine = new TableTennisRulesEngine();
        $profile = $engine->getDefaultRulesProfile();

        $this->assertSame('ITTF', $engine->getOfficialBody());
        $this->assertSame(3, $profile['games_to_win']);
        $this->assertSame(11, $profile['points_per_game']);
        $this->assertSame(2, $profile['minimum_point_lead']);
        $this->assertSame(2, $profile['service_alternation_regular']);
        $this->assertSame(1, $profile['service_alternation_deuce']);
    }

    public function test_volleyball_default_profile(): void
    {
        $engine = new VolleyballRulesEngine();
        $profile = $engine->getDefaultRulesProfile();

        $this->assertSame('FIVB', $engine->getOfficialBody());
        $this->assertSame(3, $profile['sets_to_win']);
        $this->assertSame(25, $profile['points_per_regular_set']);
        $this->assertSame(15, $profile['points_per_tie_break_set']);
        $this->assertSame(6, $profile['players_on_court']);
        $this->assertSame(6, $profile['max_substitutions_per_set']);
    }

    public function test_basketball_3x3_default_profile(): void
    {
        $engine = new Basketball3x3RulesEngine();
        $profile = $engine->getDefaultRulesProfile();

        $this->assertSame('FIBA', $engine->getOfficialBody());
        $this->assertSame(21, $profile['target_score']);
        $this->assertSame(600, $profile['period_duration_seconds']);
        $this->assertSame(12, $profile['shot_clock_seconds']);
        $this->assertSame(7, $profile['team_foul_penalty_threshold_1']);
        $this->assertSame(10, $profile['team_foul_penalty_threshold_2']);
    }

    public function test_futsal_default_profile(): void
    {
        $engine = new FutsalRulesEngine();
        $profile = $engine->getDefaultRulesProfile();

        $this->assertSame('FIFA', $engine->getOfficialBody());
        $this->assertSame(5, $profile['max_accumulated_fouls_before_10m']);
        $this->assertSame(120, $profile['red_card_penalty_seconds']);
        $this->assertSame(1, $profile['timeouts_per_period']);
    }
}
