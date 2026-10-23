<?php

namespace App\Domain\Sports\Contracts;

use App\Models\MatchEvent;
use App\Models\SportMatch;

interface SportRulesEngineInterface
{
    public function getSportSlug(): string;

    public function getOfficialBody(): string; // 'FIFA' | 'FIBA' | 'FIVB' | 'ITTF'

    public function getOfficialRulesVersion(): string;

    public function getDefaultRulesProfile(): array;

    public function initializeMatch(SportMatch $match, array $options = []): void;

    /**
     * Validates whether an event complies with official discipline rules
     * Throws \Illuminate\Validation\ValidationException if illegal
     */
    public function validateEvent(SportMatch $match, array $eventData): void;

    /**
     * Applies the event to match score, sets, fouls, shot clock, rotation, etc.
     */
    public function applyEvent(SportMatch $match, array $eventData): array;

    /**
     * Recalculates match state after an event cancellation/correction
     */
    public function cancelEvent(SportMatch $match, MatchEvent $event): void;

    /**
     * Computes collective and individual player statistics according to official definitions
     */
    public function calculateStatistics(SportMatch $match): array;

    /**
     * Checks if official victory or completion conditions have been reached
     * Returns 'team_a', 'team_b', 'draw' or null if match continues
     */
    public function checkVictoryConditions(SportMatch $match): ?string;

    /**
     * Returns specific payload for live scoreboard
     */
    public function getScoreboardData(SportMatch $match): array;
}
