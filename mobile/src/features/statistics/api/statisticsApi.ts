import { apiClient } from '../../../api/client';
import { UserStatHistory } from '../../../types';

export interface SportStat {
  sport_id: number;
  matches_played: number;
  wins: number;
  losses: number;
  draws: number;
  goals_scored: number;
  points_scored: number;
  sport: {
    id: number;
    name: string;
    slug: string;
    color_hex?: string;
  };
}

export interface PerformancePoint {
  match_index: number;
  win_rate: number;
  result: 'win' | 'loss' | 'draw';
}

export interface StatisticsResponse {
  user: {
    id: number;
    username: string;
    city: string;
    level: string;
  };
  summary: {
    matches_played: number;
    wins: number;
    losses: number;
    draws: number;
    win_rate: number;
    goals_scored: number;
    points_scored: number;
    mvp_count?: number;
    assists?: number;
    rebounds?: number;
    blocks?: number;
    steals?: number;
  };
  by_sport: SportStat[];
  recent_performance?: PerformancePoint[];
}

export const statisticsApi = {
  getUserStatistics: async (userId: number): Promise<StatisticsResponse> => {
    const response = await apiClient.get<StatisticsResponse>(`/users/${userId}/statistics`);
    return response.data;
  },

  /** Historique par match — V2 (section 5 du cahier des charges) */
  getUserStatHistory: async (userId: number, sportId?: number): Promise<UserStatHistory[]> => {
    const params = sportId ? `?sportId=${sportId}` : '';
    const response = await apiClient.get<{ data: UserStatHistory[] }>(
      `/users/${userId}/statistics/history${params}`
    );
    return response.data?.data ?? response.data as any ?? [];
  },
};

