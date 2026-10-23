export type SportSlug = 'football' | 'basketball' | 'volleyball' | 'table-tennis';

export type TournamentFormat = 'groups' | 'knockout' | 'groups_then_knockout';
export type TournamentStatus = 'draft' | 'open' | 'registration' | 'in_progress' | 'finished' | 'cancelled';
export type TournamentStage = 'group' | 'round_of_16' | 'quarter' | 'semi' | 'final' | 'third_place';

export interface Tournament {
  id: number;
  name: string;
  format: TournamentFormat;
  sport?: {
    id: number;
    name: string;
    slug: SportSlug;
    color_hex?: string;
  };
  organizer?: {
    id: number;
    username: string;
  };
  starts_on?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  city?: string;
  max_teams: number;
  teams_count: number;
  prize_pool?: string;
  status: TournamentStatus;
  is_featured: boolean;
  description?: string;
  teams?: TournamentTeam[];
}

export interface TournamentTeam {
  id: number;
  name: string;
  initials: string;
  logo_path?: string;
  group_label?: string;
  seed?: number;
  pivot_status: string;
}

export interface TournamentStanding {
  team_id: number;
  team_name: string;
  team_logo?: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points_for: number;
  points_against: number;
  goal_diff: number;
  points: number;
}

export interface TournamentMatch {
  id: number;
  stage: TournamentStage;
  round_number: number;
  status: string;
  score_team_a: number;
  score_team_b: number;
  team_a?: { id: number; name: string };
  team_b?: { id: number; name: string };
}

export interface TeamInvitation {
  id: number;
  team_id: number;
  user_id: number;
  invited_by: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  team?: {
    id: number;
    name: string;
    sport?: { name: string; slug: string };
  };
  inviter?: {
    id: number;
    username: string;
  };
  created_at?: string;
}

export interface ConversationMessage {
  id: number;
  conversation_id?: number;
  body: string;
  image_url?: string | null;
  sender_id: number;
  sender: {
    id: number;
    username: string;
    photo_path?: string;
  };
  created_at: string;
}

export interface NotificationPref {
  type: string;
  push_enabled: boolean;
}

export interface UserStatHistory {
  id: number;
  user_id: number;
  sport_id: number;
  match_id: number;
  stats_json: {
    goals?: number;
    points?: number;
    assists?: number;
    rebounds?: number;
    blocks?: number;
    steals?: number;
    result?: 'win' | 'loss' | 'draw';
  };
  played_at: string;
}
