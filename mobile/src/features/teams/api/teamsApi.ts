import { apiClient } from '../../../api/client';
import { User } from '../../../store/useAuthStore';
import { Sport } from '../../sessions/api/sessionsApi';
import { TeamInvitation } from '../../../types';

export interface TeamMember {
  user: User;
  role: 'captain' | 'vice_captain' | 'member';
  joined_at: string;
}

export interface Team {
  id: number;
  name: string;
  initials?: string;
  invite_code?: string;
  sport: Sport;
  captain: User;
  logo_path?: string | null;
  level?: 'beginner' | 'intermediate' | 'advanced';
  city?: string | null;
  is_looking_for_opponent?: boolean;
  members_count: number;
  max_members?: number;
  matches_count?: number;
  wins_count?: number;
  losses_count?: number;
  members?: TeamMember[];
}

export interface CreateTeamPayload {
  name: string;
  sport_id: number;
  level?: string;
  city?: string;
  is_looking_for_opponent?: boolean;
  logo_path?: string;
}

export interface UpdateTeamPayload {
  name?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  city?: string;
  is_looking_for_opponent?: boolean;
  organization_type?: string;
  organization_name?: string;
  max_members?: number;
}

export const teamsApi = {
  // ─── Listing & Details ────────────────────────────────────────────────────

  listTeams: async (): Promise<Team[]> => {
    const response = await apiClient.get<Team[]>('/teams');
    return response.data;
  },

  getTeams: async (lookingForOpponent?: boolean, level?: string, city?: string): Promise<Team[]> => {
    const params: Record<string, any> = {};
    if (lookingForOpponent) params.lookingForOpponent = true;
    if (level) params.level = level;
    if (city) params.city = city;
    const response = await apiClient.get<Team[]>('/teams', { params });
    return response.data;
  },

  getTeamDetails: async (id: number): Promise<Team> => {
    const response = await apiClient.get<Team>(`/teams/${id}`);
    return response.data;
  },

  getTeamByCode: async (code: string): Promise<Team> => {
    const response = await apiClient.get<Team>(`/teams/by-code/${encodeURIComponent(code)}`);
    return response.data;
  },

  // ─── Create / Update / Delete ─────────────────────────────────────────────

  createTeam: async (payload: CreateTeamPayload): Promise<Team> => {
    const response = await apiClient.post<Team>('/teams', payload);
    return response.data;
  },

  updateTeam: async (teamId: number, payload: UpdateTeamPayload): Promise<{ message: string; team: Team }> => {
    const response = await apiClient.put<{ message: string; team: Team }>(`/teams/${teamId}`, payload);
    return response.data;
  },

  deleteTeam: async (teamId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/teams/${teamId}`);
    return response.data;
  },

  updateOpponentStatus: async (teamId: number, isLooking: boolean, level?: string, city?: string): Promise<any> => {
    const response = await apiClient.put(`/teams/${teamId}/opponent-status`, {
      is_looking_for_opponent: isLooking,
      level,
      city,
    });
    return response.data;
  },

  // ─── Members ──────────────────────────────────────────────────────────────

  joinTeamByCode: async (code: string): Promise<{ message: string; team: Team }> => {
    const response = await apiClient.post<{ message: string; team: Team }>('/teams/join-by-code', { code });
    return response.data;
  },

  addMember: async (teamId: number, userId: number): Promise<TeamMember> => {
    const response = await apiClient.post<TeamMember>(`/teams/${teamId}/members`, { user_id: userId });
    return response.data;
  },

  inviteMember: async (teamId: number, userId: number): Promise<any> => {
    const response = await apiClient.post(`/teams/${teamId}/invitations`, { user_id: userId });
    return response.data;
  },

  // ─── Invitations ──────────────────────────────────────────────────────────

  getMyInvitations: async (): Promise<TeamInvitation[]> => {
    const response = await apiClient.get<TeamInvitation[]>('/teams/invitations/my');
    return response.data;
  },

  respondInvitation: async (invitationId: number, action: 'accept' | 'decline'): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/teams/invitations/${invitationId}/respond`, { action });
    return response.data;
  },
};
