import { apiClient } from '../../../api/client';
import { User } from '../../../store/useAuthStore';

export type MatchEventType =
  | 'basket'
  | 'free_throw'
  | 'missed_shot'
  | 'rebound'
  | 'assist'
  | 'foul'
  | 'steal'
  | 'block'
  | 'turnover'
  | 'substitution'
  | 'period_started'
  | 'period_ended'
  | 'match_paused'
  | 'match_resumed'
  | 'match_ended'
  | 'goal'
  | 'point'
  | 'card_yellow'
  | 'card_red'
  | 'shot_on_target'
  | 'shot_off_target'
  | 'save'
  | 'corner'
  | 'offside'
  | 'ace'
  | 'attack_kill'
  | 'winner'
  | 'fault';

export type ShotType = '2pt' | '3pt' | 'free_throw';
export type ShotResult = 'made' | 'missed';
export type ReboundType = 'offensive' | 'defensive';
export type FoulType = 'personal' | 'shooting' | 'technical' | 'offensive';

export interface SetScore {
  setNumber: number;
  scoreA: number;
  scoreB: number;
}

export interface MatchEvent {
  id: number;
  match_id: number;
  type: MatchEventType;
  team_side: 'team_a' | 'team_b';
  player_id?: number | null;
  player?: User | null;
  sub_in_player_id?: number | null;
  sub_in_player?: User | null;
  sub_out_player_id?: number | null;
  sub_out_player?: User | null;
  related_player_id?: number | null;
  related_player?: User | null;
  points?: number | null;
  shot_type?: ShotType | null;
  shot_result?: ShotResult | null;
  rebound_type?: ReboundType | null;
  foul_type?: FoulType | null;
  period?: number;
  minute: number;
  match_time_seconds?: number;
  is_cancelled?: boolean;
  cancelled_at?: string | null;
  idempotency_key?: string | null;
  created_at: string;
}

export interface MatchPlayer {
  id: number;
  username: string;
  jersey_number?: number;
  position?: string;
  is_starter?: boolean;
  is_on_court?: boolean;
  seconds_played?: number;
}

export interface TeamCollectiveStats {
  points: number;
  fg_made: number;
  fg_attempted: number;
  fg_pct: number;
  two_pt_made: number;
  two_pt_attempted: number;
  two_pt_pct: number;
  three_pt_made: number;
  three_pt_attempted: number;
  three_pt_pct: number;
  ft_made: number;
  ft_attempted: number;
  ft_pct: number;
  rebounds_offensive: number;
  rebounds_defensive: number;
  rebounds_total: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;

  // Basketball 3x3
  one_pt_made?: number;
  one_pt_attempted?: number;
  one_pt_pct?: number;

  // Football / Futsal
  goals?: number;
  shots_on_target?: number;
  shots_off_target?: number;
  total_shots?: number;
  shot_accuracy_pct?: number;
  saves?: number;
  corners?: number;
  offsides?: number;
  yellow_cards?: number;
  red_cards?: number;

  // Volleyball / Table Tennis
  aces?: number;
  attack_kills?: number;
  winners?: number;
}

export interface PeriodScore {
  period: number;
  team_a: number;
  team_b: number;
}

export interface PlayerBoxscore {
  user_id: number;
  username: string;
  photo_url?: string | null;
  jersey_number?: number;
  position?: string;
  team_side: 'team_a' | 'team_b';
  is_on_court: boolean;
  seconds_played: number;
  minutes_formatted: string;
  points: number;
  fg_made: number;
  fg_attempted: number;
  fg_pct: number;
  two_pt_made: number;
  two_pt_attempted: number;
  two_pt_pct: number;
  three_pt_made: number;
  three_pt_attempted: number;
  three_pt_pct: number;
  ft_made: number;
  ft_attempted: number;
  ft_pct: number;
  rebounds_offensive: number;
  rebounds_defensive: number;
  rebounds_total: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;

  // Basketball 3x3
  one_pt_made?: number;
  one_pt_attempted?: number;
  one_pt_pct?: number;

  // Football / Futsal fields
  goals?: number;
  shots_on_target?: number;
  shots_off_target?: number;
  total_shots?: number;
  shot_accuracy_pct?: number;
  saves?: number;
  corners?: number;
  offsides?: number;
  yellow_cards?: number;
  red_cards?: number;

  // Volleyball / Table Tennis
  aces?: number;
  attack_kills?: number;
  winners?: number;
}

export interface MatchStatisticsResponse {
  collective: {
    team_a: TeamCollectiveStats;
    team_b: TeamCollectiveStats;
  };
  period_scores: PeriodScore[];
  players: {
    team_a: PlayerBoxscore[];
    team_b: PlayerBoxscore[];
    all: PlayerBoxscore[];
  };
}

export interface LiveMatchResponse {
  match_id: number;
  status: 'pending' | 'in_progress' | 'paused' | 'finished';
  score_team_a: number;
  score_team_b: number;
  current_period: number;
  total_periods: number;
  period_duration_seconds: number;
  period_elapsed_seconds: number;
  remaining_period_seconds: number;
  is_paused: boolean;
  last_resumed_at?: string | null;
  server_timestamp: string;
  team_a: {
    name: string;
    logo?: string | null;
    color: string;
    score: number;
    fouls: number;
    timeouts: number;
  };
  team_b: {
    name: string;
    logo?: string | null;
    color: string;
    score: number;
    fouls: number;
    timeouts: number;
  };
  collective_stats: {
    team_a: TeamCollectiveStats;
    team_b: TeamCollectiveStats;
  };
  period_scores: PeriodScore[];
  last_event?: {
    id: number;
    type: MatchEventType;
    team_side: 'team_a' | 'team_b';
    player_id?: number | null;
    player_name?: string | null;
    points?: number | null;
    minute: number;
    period: number;
    created_at?: string;
  } | null;
}

export interface Match {
  id: number;
  session_id: number;
  status: 'pending' | 'in_progress' | 'paused' | 'finished';
  score_team_a: number;
  score_team_b: number;
  current_period: number;
  total_periods: number;
  period_duration_seconds: number;
  elapsed_seconds: number;
  period_elapsed_seconds?: number;
  remaining_period_seconds?: number;
  team_a_fouls?: number;
  team_b_fouls?: number;
  team_a_timeouts?: number;
  team_b_timeouts?: number;
  team_a_color?: string;
  team_b_color?: string;
  team_a_logo?: string;
  team_b_logo?: string;
  started_at?: string;
  paused_at?: string;
  finished_at?: string;
  period_started_at?: string;
  last_resumed_at?: string;
  events?: MatchEvent[];
  session?: any;
  team_a_players?: MatchPlayer[];
  team_b_players?: MatchPlayer[];
  team_a_name?: string;
  team_b_name?: string;
  sets_won_a?: number;
  sets_won_b?: number;
  set_scores?: SetScore[];
}

export interface StartMatchPayload {
  total_periods?: number;
  period_duration_seconds?: number;
}

export interface AddMatchEventPayload {
  type: MatchEventType;
  team_side: 'team_a' | 'team_b';
  player_id?: number;
  sub_in_player_id?: number;
  sub_out_player_id?: number;
  related_player_id?: number;
  points?: number;
  shot_type?: ShotType;
  shot_result?: ShotResult;
  rebound_type?: ReboundType;
  foul_type?: FoulType;
  period?: number;
  minute?: number;
  match_time_seconds?: number;
  idempotency_key?: string;
  metadata?: Record<string, any>;
}

export const matchesApi = {
  getMatchDetails: async (id: number): Promise<Match> => {
    const response = await apiClient.get<Match>(`/matches/${id}`);
    return response.data;
  },

  getLiveMatch: async (id: number): Promise<LiveMatchResponse> => {
    const response = await apiClient.get<LiveMatchResponse>(`/matches/${id}/live`);
    return response.data;
  },

  getMatchStatistics: async (id: number): Promise<MatchStatisticsResponse> => {
    const response = await apiClient.get<MatchStatisticsResponse>(`/matches/${id}/statistics`);
    return response.data;
  },

  startMatch: async (sessionId: number, payload?: StartMatchPayload): Promise<Match> => {
    const response = await apiClient.post<Match>(`/sessions/${sessionId}/match/start`, payload || {});
    return response.data;
  },

  pauseMatch: async (matchId: number): Promise<Match> => {
    const response = await apiClient.post<Match>(`/matches/${matchId}/pause`);
    return response.data;
  },

  resumeMatch: async (matchId: number): Promise<Match> => {
    const response = await apiClient.post<Match>(`/matches/${matchId}/resume`);
    return response.data;
  },

  nextPeriod: async (matchId: number): Promise<Match> => {
    const response = await apiClient.post<Match>(`/matches/${matchId}/next-period`);
    return response.data;
  },

  addMatchEvent: async (matchId: number, payload: AddMatchEventPayload): Promise<MatchEvent> => {
    const response = await apiClient.post<MatchEvent>(`/matches/${matchId}/events`, payload);
    return response.data;
  },

  cancelMatchEvent: async (matchId: number, eventId: number): Promise<{ message: string; match: Match }> => {
    const response = await apiClient.delete<{ message: string; match: Match }>(`/matches/${matchId}/events/${eventId}`);
    return response.data;
  },

  finishMatch: async (matchId: number): Promise<Match> => {
    const response = await apiClient.post<Match>(`/matches/${matchId}/finish`);
    return response.data;
  },

  updatePlayers: async (matchId: number, players: Array<{
    user_id: number;
    team_side: 'team_a' | 'team_b';
    jersey_number?: number;
    position?: string;
    is_starter?: boolean;
    is_on_court?: boolean;
  }>): Promise<void> => {
    await apiClient.post(`/matches/${matchId}/players`, { players });
  },
};
