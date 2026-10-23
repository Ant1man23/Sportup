import { apiClient } from '../../../api/client';
import { User } from '../../../store/useAuthStore';

export interface UserStats {
  matches_played: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
  goals_scored: number;
  points_scored: number;
  mvp_count?: number;
}

export interface UserBadge {
  id: string;
  name: string;
  description: string;
  category: 'milestone' | 'scoring' | 'defense' | 'leadership' | 'mvp';
  icon: string;
  color: string;
  is_unlocked: boolean;
  current: number;
  target: number;
  progress_percent: number;
  unit: string;
}

export interface GamificationData {
  total_badges: number;
  unlocked_count: number;
  completion_rate: number;
  badges: UserBadge[];
}

export interface UserStatsResponse {
  user: {
    id: number;
    username: string;
    city: string;
    level: string;
  };
  summary: UserStats;
  gamification?: GamificationData;
}

export interface RecentMatch {
  session_title: string;
  sport_name: string;
  date: string;
  score_team_a: number;
  score_team_b: number;
  is_winner: boolean;
  user_goals: number;
  user_points: number;
}

export interface UserProfileResponse {
  user: User;
  rank?: number;
  mvp_count?: number;
  favorite_sports: Array<{
    id: number;
    name: string;
    slug: string;
    icon?: string;
    color_hex?: string;
  }>;
  teams: Array<{
    id: number;
    name: string;
    initials?: string;
    sport?: {
      name: string;
      color_hex?: string;
    };
    pivot?: {
      role: string;
    };
  }>;
  recent_match: RecentMatch | null;
  recent_matches?: RecentMatch[];
  gamification?: GamificationData;
}

export const profileApi = {
  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  getUserProfile: async (userId: number): Promise<UserProfileResponse> => {
    const response = await apiClient.get<UserProfileResponse>(`/users/${userId}`);
    return response.data;
  },

  getUserStats: async (userId: number): Promise<UserStatsResponse> => {
    const response = await apiClient.get<UserStatsResponse>(`/users/${userId}/statistics`);
    return response.data;
  },

  updateProfile: async (
    data: Partial<User> & { favorite_sport_ids?: number[]; avatar_base64?: string }
  ): Promise<User> => {
    const response = await apiClient.put<User>('/profile', data);
    return response.data;
  },

  uploadAvatar: async (
    imageUri: string,
    mimeType: string = 'image/jpeg',
    base64Data?: string
  ): Promise<{ message: string; photo_path: string; photo_url: string; user: User }> => {
    if (base64Data) {
      const response = await apiClient.post<{
        message: string;
        photo_path: string;
        photo_url: string;
        user: User;
      }>('/profile/avatar', {
        avatar_base64: base64Data.startsWith('data:') ? base64Data : `data:${mimeType};base64,${base64Data}`,
      });
      return response.data;
    }

    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'avatar.jpg';

    // @ts-ignore - React Native FormData expects uri, type, and name
    formData.append('avatar', {
      uri: imageUri,
      type: mimeType,
      name: filename,
    });

    const response = await apiClient.post<{ message: string; photo_path: string; photo_url: string; user: User }>(
      '/profile/avatar',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        transformRequest: (data) => data,
      }
    );
    return response.data;
  },
};

