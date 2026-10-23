import { apiClient } from '../../../api/client';
import { User } from '../../../store/useAuthStore';

export interface Sport {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  color_hex?: string;
}

export type CompetitionType =
  | 'friendly'
  | 'corporate'
  | 'tournament'
  | 'championship'
  | 'school_university'
  | 'official'
  | 'community';

export type ParticipationMode =
  | 'open'
  | 'invitation'
  | 'teams_assigned'
  | 'approval_required';

export type SpectatorAccess =
  | 'free'
  | 'paid'
  | 'private'
  | 'online_only';

export interface Session {
  id: number;
  organizer: User;
  sport: Sport;
  type: 'find_players' | 'find_opponent' | 'free_match';
  competition_type?: CompetitionType;
  participation_mode?: ParticipationMode;
  spectator_access?: SpectatorAccess;
  referee_id?: number;
  format: string;
  session_date: string;
  registration_deadline?: string;
  start_time: string;
  latitude: number;
  longitude: number;
  address?: string;
  location_details?: string;
  city?: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'all';
  max_participants: number;
  current_participants: number;
  description?: string;
  status: 'open' | 'full' | 'cancelled' | 'in_progress' | 'finished' | 'scheduled';
  distance_km?: number;
  participants?: User[];
  match?: { id: number; status: string } | null;
}

export interface CreateSessionPayload {
  sport_id: number;
  type?: 'find_players' | 'find_opponent' | 'free_match';
  competition_type?: CompetitionType;
  participation_mode?: ParticipationMode;
  spectator_access?: SpectatorAccess;
  referee_id?: number;
  format: string;
  session_date: string;
  registration_deadline?: string;
  start_time: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  location_details?: string;
  city?: string;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'all';
  max_participants: number;
  description?: string;
}

export const sessionsApi = {
  listSessions: async (params?: Record<string, any>): Promise<{ data: Session[] }> => {
    const response = await apiClient.get('/sessions', { params });
    return response.data;
  },

  getCalendar: async (params?: Record<string, any>): Promise<Session[]> => {
    const response = await apiClient.get<Session[]>('/calendar', { params });
    return response.data;
  },

  getSessionDetails: async (id: number): Promise<Session> => {
    const response = await apiClient.get<Session>(`/sessions/${id}`);
    return response.data;
  },

  createSession: async (payload: CreateSessionPayload): Promise<Session> => {
    const response = await apiClient.post<Session>('/sessions', payload);
    return response.data;
  },

  joinSession: async (id: number): Promise<Session> => {
    const response = await apiClient.post<Session>(`/sessions/${id}/join`);
    return response.data;
  },

  leaveSession: async (id: number): Promise<Session> => {
    const response = await apiClient.delete<Session>(`/sessions/${id}/leave`);
    return response.data;
  },
};
