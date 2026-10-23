import { apiClient } from '../../../api/client';

export interface TournamentSport {
  id: number;
  name: string;
  slug: string;
  color_hex?: string | null;
}

export interface TournamentOrganizer {
  id: number;
  username: string;
}

export interface Tournament {
  id: number;
  name: string;
  sport: TournamentSport | null;
  organizer: TournamentOrganizer | null;
  start_date: string;       // YYYY-MM-DD
  end_date?: string | null;
  location?: string | null;
  city?: string | null;
  max_teams: number;
  teams_count: number;
  prize_pool?: string | null;
  status: 'open' | 'in_progress' | 'finished';
  is_featured: boolean;
  description?: string | null;
  teams?: Array<{
    id: number;
    name: string;
    initials?: string;
    logo_path?: string | null;
    pivot_status: 'pending' | 'accepted' | 'eliminated' | 'winner';
  }>;
}

export interface CreateTournamentPayload {
  name: string;
  sport_id: number;
  start_date: string;
  end_date?: string;
  location?: string;
  city?: string;
  max_teams: number;
  prize_pool?: string;
  description?: string;
}

export const tournamentsApi = {
  listTournaments: async (params?: { sport_id?: number; status?: string }): Promise<Tournament[]> => {
    const response = await apiClient.get<Tournament[]>('/tournaments', { params });
    return Array.isArray(response.data) ? response.data : [];
  },

  getTournamentDetails: async (id: number): Promise<Tournament> => {
    const response = await apiClient.get<Tournament>(`/tournaments/${id}`);
    return response.data;
  },

  createTournament: async (payload: CreateTournamentPayload): Promise<Tournament> => {
    const response = await apiClient.post<Tournament>('/tournaments', payload);
    return response.data;
  },

  registerTeam: async (tournamentId: number, teamId: number): Promise<{ message: string; teams_count: number }> => {
    const response = await apiClient.post(`/tournaments/${tournamentId}/register`, { team_id: teamId });
    return response.data;
  },
};
