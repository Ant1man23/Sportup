import { apiClient } from './client';
import { Tournament, TournamentStanding, TournamentMatch } from '../types';

export const tournamentsApi = {
  async getTournaments(sportId?: number, status?: string): Promise<Tournament[]> {
    const params: any = {};
    if (sportId) params.sport_id = sportId;
    if (status) params.status = status;
    const response = await apiClient.get('/tournaments', { params });
    return response.data;
  },

  async getTournamentDetails(id: number): Promise<Tournament> {
    const response = await apiClient.get(`/tournaments/${id}`);
    return response.data;
  },

  async createTournament(payload: any): Promise<Tournament> {
    const response = await apiClient.post('/tournaments', payload);
    return response.data;
  },

  async registerTeam(tournamentId: number, teamId: number): Promise<any> {
    const response = await apiClient.post(`/tournaments/${tournamentId}/register`, { team_id: teamId });
    return response.data;
  },

  async drawTournament(tournamentId: number): Promise<any> {
    const response = await apiClient.post(`/tournaments/${tournamentId}/draw`);
    return response.data;
  },

  async getStandings(tournamentId: number): Promise<TournamentStanding[]> {
    const response = await apiClient.get(`/tournaments/${tournamentId}/standings`);
    return response.data;
  },

  async getBracket(tournamentId: number): Promise<TournamentMatch[]> {
    const response = await apiClient.get(`/tournaments/${tournamentId}/bracket`);
    return response.data;
  },

  async getMatches(tournamentId: number): Promise<TournamentMatch[]> {
    const response = await apiClient.get(`/tournaments/${tournamentId}/matches`);
    return response.data;
  },
};
