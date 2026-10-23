export type SportCategory =
  | 'football'
  | 'basketball'
  | 'basketball_3x3'
  | 'volleyball'
  | 'table_tennis';

export interface SportActionConfig {
  label: string;
  points: number;
}

export interface SportConfig {
  category: SportCategory;
  displayName: string;
  scoring: 'cumulative' | 'sets';
  periodType: 'half' | 'quarter' | 'period' | 'set' | 'manche';
  periodName: string;
  periods: number;
  periodDurationSeconds: number;
  scoreUnit: string;
  setsToWin?: number;
  pointsPerSet?: number;
  tieBreakPoints?: number;
  targetScore?: number;
  shotClockSeconds?: number;
  scoreActions: SportActionConfig[];
}

/**
 * Normalizes any database sport slug into one of the 5 canonical sport categories
 */
export function getSportCategory(slug?: string): SportCategory {
  if (!slug) return 'football';
  const clean = slug.toLowerCase().trim();

  if (
    clean === 'football-11' ||
    clean === 'football-5' ||
    clean === 'football' ||
    clean === 'futsal' ||
    clean === 'soccer'
  ) {
    return 'football';
  }

  if (
    clean === 'basketball-3x3' ||
    clean === 'basket-3x3' ||
    clean === '3x3'
  ) {
    return 'basketball_3x3';
  }

  if (
    clean === 'basketball-5x5' ||
    clean === 'basketball' ||
    clean === 'basket-5x5' ||
    clean === 'basket'
  ) {
    return 'basketball';
  }

  if (
    clean === 'volleyball' ||
    clean === 'volley' ||
    clean === 'beach-volley'
  ) {
    return 'volleyball';
  }

  if (
    clean === 'tennis-de-table' ||
    clean === 'table-tennis' ||
    clean === 'ping-pong'
  ) {
    return 'table_tennis';
  }

  return 'football';
}

/**
 * Returns true if the sport uses sets (Volleyball, Table Tennis)
 */
export function isSetSport(slug?: string): boolean {
  const cat = getSportCategory(slug);
  return cat === 'volleyball' || cat === 'table_tennis';
}

export const sportMatchConfig: Record<SportCategory, SportConfig> = {
  football: {
    category: 'football',
    displayName: 'Football',
    scoring: 'cumulative',
    periodType: 'half',
    periodName: 'Mi-Temps',
    periods: 2,
    periodDurationSeconds: 1200, // 20 min default (45 for 11v11)
    scoreUnit: 'But',
    scoreActions: [{ label: '+1 But', points: 1 }],
  },
  basketball: {
    category: 'basketball',
    displayName: 'Basket 5×5',
    scoring: 'cumulative',
    periodType: 'quarter',
    periodName: 'Quart-Temps',
    periods: 4,
    periodDurationSeconds: 600, // 10 min
    scoreUnit: 'Point',
    shotClockSeconds: 24,
    scoreActions: [
      { label: '+1 LF', points: 1 },
      { label: '+2 Pts', points: 2 },
      { label: '+3 Pts', points: 3 },
    ],
  },
  basketball_3x3: {
    category: 'basketball_3x3',
    displayName: 'Basket 3×3',
    scoring: 'cumulative',
    periodType: 'period',
    periodName: 'Période',
    periods: 1,
    periodDurationSeconds: 600, // 10 min
    scoreUnit: 'Point',
    targetScore: 21,
    shotClockSeconds: 12,
    scoreActions: [
      { label: '+1 Pt (LF/Arc)', points: 1 },
      { label: '+2 Pts (Ext.)', points: 2 },
    ],
  },
  volleyball: {
    category: 'volleyball',
    displayName: 'Volleyball',
    scoring: 'sets',
    periodType: 'set',
    periodName: 'Set',
    periods: 5,
    periodDurationSeconds: 0,
    scoreUnit: 'Point',
    setsToWin: 3,
    pointsPerSet: 25,
    tieBreakPoints: 15,
    scoreActions: [{ label: '+1 Point', points: 1 }],
  },
  table_tennis: {
    category: 'table_tennis',
    displayName: 'Tennis de table',
    scoring: 'sets',
    periodType: 'manche',
    periodName: 'Manche',
    periods: 5,
    periodDurationSeconds: 0,
    scoreUnit: 'Point',
    setsToWin: 3,
    pointsPerSet: 11,
    tieBreakPoints: 11,
    scoreActions: [{ label: '+1 Point', points: 1 }],
  },
};

/**
 * Returns formatted period label according to category and number
 */
export function formatPeriodLabel(category: SportCategory, periodNumber: number): string {
  switch (category) {
    case 'football':
      return periodNumber === 1 ? '1ère Mi-Temps' : periodNumber === 2 ? '2e Mi-Temps' : `Prolongation ${periodNumber - 2}`;
    case 'basketball':
      return periodNumber <= 4 ? `Quart-Temps ${periodNumber}` : `Prolongation ${periodNumber - 4} (OT)`;
    case 'basketball_3x3':
      return periodNumber === 1 ? 'Période Réglementaire (10m)' : `Prolongation ${periodNumber - 1}`;
    case 'volleyball':
      return `Set ${periodNumber}`;
    case 'table_tennis':
      return `Manche ${periodNumber}`;
  }
}
