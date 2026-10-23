<?php

namespace App\Actions\Users;

use App\Models\User;
use App\Models\UserSportStatistics;

class CalculateUserBadgesAction
{
    /**
     * Compute earned badges and progression for a given user.
     *
     * @param User $user
     * @return array
     */
    public function execute(User $user): array
    {
        $stats = UserSportStatistics::where('user_id', $user->id)->get();

        $totalPlayed   = (int) $stats->sum('matches_played');
        $totalWins     = (int) $stats->sum('wins');
        $totalGoals    = (int) $stats->sum('goals_scored');
        $totalPoints   = (int) $stats->sum('points_scored');
        $totalScoring  = $totalGoals + $totalPoints;
        $totalAssists  = (int) $stats->sum('assists');
        $totalRebounds = (int) $stats->sum('rebounds');
        $totalBlocks   = (int) $stats->sum('blocks');
        $totalSteals   = (int) $stats->sum('steals');
        $totalDefense  = $totalRebounds + $totalBlocks + $totalSteals;
        $totalMvp      = (int) $stats->sum('mvp_count');

        $badgeDefinitions = [
            [
                'id'          => 'first_win',
                'name'        => 'Première Victoire',
                'description' => 'Remporter votre tout premier match officiel',
                'category'    => 'milestone',
                'icon'        => 'Rocket',
                'color'       => '#10B981',
                'target'      => 1,
                'current'     => $totalWins,
                'unit'        => 'victoire',
            ],
            [
                'id'          => 'sniper',
                'name'        => 'Sniper',
                'description' => 'Inscrire 20 buts ou points en compétition',
                'category'    => 'scoring',
                'icon'        => 'Target',
                'color'       => '#F59E0B',
                'target'      => 20,
                'current'     => $totalScoring,
                'unit'        => 'pts/buts',
            ],
            [
                'id'          => 'centurion',
                'name'        => 'Centurion',
                'description' => 'Franchir la barre légendaire des 100 points ou buts en carrière',
                'category'    => 'scoring',
                'icon'        => 'Zap',
                'color'       => '#EF4444',
                'target'      => 100,
                'current'     => $totalScoring,
                'unit'        => 'pts/buts',
            ],
            [
                'id'          => 'mur_de_tana',
                'name'        => 'Mur de Tanà',
                'description' => 'Cumuler 15 actions défensives (rebonds, contres et interceptions)',
                'category'    => 'defense',
                'icon'        => 'Shield',
                'color'       => '#3B82F6',
                'target'      => 15,
                'current'     => $totalDefense,
                'unit'        => 'actions',
            ],
            [
                'id'          => 'exemplary_captain',
                'name'        => 'Capitaine Exemplaire',
                'description' => 'Mener son collectif à 5 victoires en matchs réels',
                'category'    => 'leadership',
                'icon'        => 'Crown',
                'color'       => '#8B5CF6',
                'target'      => 5,
                'current'     => $totalWins,
                'unit'        => 'victoires',
            ],
            [
                'id'          => 'maestro',
                'name'        => 'Maestro Passeur',
                'description' => 'Délivrer 10 passes décisives à vos coéquipiers',
                'category'    => 'leadership',
                'icon'        => 'Award',
                'color'       => '#06B6D4',
                'target'      => 10,
                'current'     => $totalAssists,
                'unit'        => 'passes',
            ],
            [
                'id'          => 'mvp_gold',
                'name'        => 'MVP d\'Or',
                'description' => 'Élu 3 fois Meilleur Joueur du match par les capitaines',
                'category'    => 'mvp',
                'icon'        => 'Trophy',
                'color'       => '#EAB308',
                'target'      => 3,
                'current'     => $totalMvp,
                'unit'        => 'MVP',
            ],
            [
                'id'          => 'court_warrior',
                'name'        => 'Guerrier des Terrains',
                'description' => 'Disputer 10 matchs complets sur SportUp',
                'category'    => 'milestone',
                'icon'        => 'Flame',
                'color'       => '#EC4899',
                'target'      => 10,
                'current'     => $totalPlayed,
                'unit'        => 'matchs',
            ],
        ];

        $badges = [];
        $unlockedCount = 0;

        foreach ($badgeDefinitions as $def) {
            $current = min($def['current'], $def['target']);
            $progressPercent = $def['target'] > 0 ? (int) min(100, round(($def['current'] / $def['target']) * 100)) : 0;
            $isUnlocked = $def['current'] >= $def['target'];

            if ($isUnlocked) {
                $unlockedCount++;
            }

            $badges[] = [
                'id'               => $def['id'],
                'name'             => $def['name'],
                'description'      => $def['description'],
                'category'         => $def['category'],
                'icon'             => $def['icon'],
                'color'            => $def['color'],
                'is_unlocked'      => $isUnlocked,
                'current'          => $def['current'],
                'target'           => $def['target'],
                'progress_percent' => $progressPercent,
                'unit'             => $def['unit'],
            ];
        }

        return [
            'total_badges'    => count($badges),
            'unlocked_count'  => $unlockedCount,
            'completion_rate' => count($badges) > 0 ? round(($unlockedCount / count($badges)) * 100, 1) : 0,
            'badges'          => $badges,
        ];
    }
}
