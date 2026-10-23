<?php

namespace App\Services;

class SportRulesService
{
    public const CATEGORY_FOOTBALL = 'football';
    public const CATEGORY_BASKETBALL = 'basketball';
    public const CATEGORY_BASKETBALL_3X3 = 'basketball_3x3';
    public const CATEGORY_VOLLEYBALL = 'volleyball';
    public const CATEGORY_TABLE_TENNIS = 'table_tennis';

    /**
     * Resolve generic sport category from any slug
     */
    public static function getSportCategory(?string $slug): string
    {
        if (!$slug) {
            return self::CATEGORY_FOOTBALL;
        }

        $clean = strtolower(trim($slug));

        if (in_array($clean, ['football-11', 'football-5', 'football', 'futsal', 'soccer'])) {
            return self::CATEGORY_FOOTBALL;
        }

        if (in_array($clean, ['basketball-3x3', 'basket-3x3', '3x3'])) {
            return self::CATEGORY_BASKETBALL_3X3;
        }

        if (in_array($clean, ['basketball-5x5', 'basketball', 'basket-5x5', 'basket'])) {
            return self::CATEGORY_BASKETBALL;
        }

        if (in_array($clean, ['volleyball', 'volley', 'beach-volley'])) {
            return self::CATEGORY_VOLLEYBALL;
        }

        if (in_array($clean, ['tennis-de-table', 'table-tennis', 'ping-pong'])) {
            return self::CATEGORY_TABLE_TENNIS;
        }

        return self::CATEGORY_FOOTBALL;
    }

    /**
     * Check if a sport is scored with sets (sets to win, points per set)
     */
    public static function isSetSport(?string $slug): bool
    {
        $category = self::getSportCategory($slug);
        return in_array($category, [self::CATEGORY_VOLLEYBALL, self::CATEGORY_TABLE_TENNIS]);
    }

    /**
     * Get default match configuration by slug
     */
    public static function getDefaultConfig(?string $slug): array
    {
        $category = self::getSportCategory($slug);

        switch ($category) {
            case self::CATEGORY_FOOTBALL:
                $isFootball11 = ($slug === 'football-11');
                return [
                    'category' => self::CATEGORY_FOOTBALL,
                    'total_periods' => 2,
                    'period_duration_seconds' => $isFootball11 ? 2700 : 1200, // 45 min for 11v11, 20 min for 5v5/futsal
                    'target_score' => null,
                    'shot_clock_seconds' => null,
                    'rules_profile' => $isFootball11 ? 'football_11' : 'football_5',
                    'period_label' => 'Mi-Temps',
                ];

            case self::CATEGORY_BASKETBALL_3X3:
                return [
                    'category' => self::CATEGORY_BASKETBALL_3X3,
                    'total_periods' => 1,
                    'period_duration_seconds' => 600, // 10 min
                    'target_score' => 21, // First to 21 points wins
                    'shot_clock_seconds' => 12,
                    'rules_profile' => 'fiba_3x3',
                    'period_label' => 'Période',
                ];

            case self::CATEGORY_BASKETBALL:
                return [
                    'category' => self::CATEGORY_BASKETBALL,
                    'total_periods' => 4,
                    'period_duration_seconds' => 600, // 10 min per quarter
                    'target_score' => null,
                    'shot_clock_seconds' => 24,
                    'rules_profile' => 'fiba_5x5',
                    'period_label' => 'Quart-Temps',
                ];

            case self::CATEGORY_VOLLEYBALL:
                return [
                    'category' => self::CATEGORY_VOLLEYBALL,
                    'total_periods' => 5, // Best of 5 sets (first to 3)
                    'period_duration_seconds' => 0, // Untimed
                    'target_score' => null,
                    'shot_clock_seconds' => null,
                    'rules_profile' => 'fivb_sets',
                    'sets_to_win' => 3,
                    'points_per_set' => 25,
                    'tie_break_points' => 15,
                    'period_label' => 'Set',
                ];

            case self::CATEGORY_TABLE_TENNIS:
                return [
                    'category' => self::CATEGORY_TABLE_TENNIS,
                    'total_periods' => 5, // Best of 5 sets (first to 3)
                    'period_duration_seconds' => 0, // Untimed
                    'target_score' => null,
                    'shot_clock_seconds' => null,
                    'rules_profile' => 'ittf_sets',
                    'sets_to_win' => 3,
                    'points_per_set' => 11,
                    'tie_break_points' => 11,
                    'period_label' => 'Manche',
                ];
        }
    }
}
