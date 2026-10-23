import { apiClient } from '../../../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SurfaceType =
  | 'gazon_naturel'
  | 'gazon_synthetique'
  | 'beton'
  | 'parquet'
  | 'sable'
  | 'ciment';

export interface Venue {
  id: number;
  name: string;
  slug: string;
  district: string;
  city: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  sports: string[];
  surface_type: SurfaceType;
  surface_label: string;
  capacity: number | null;
  is_indoor: boolean;
  has_lighting: boolean;
  has_changing_rooms: boolean;
  has_parking: boolean;
  has_tribunes: boolean;
  has_canteen: boolean;
  price_per_hour: number | null;
  price_currency: string;
  rating: number;
  review_count: number;
  booking_count: number;
  is_verified: boolean;
  submitted_by?: number | null;
  phone_primary: string | null;
  whatsapp_number: string | null;
  whatsapp_link: string | null;
  opening_time: string;
  closing_time: string;
  open_days: string[];
  cover_image: string | null;
  // Détail uniquement
  email?: string | null;
  phone_secondary?: string | null;
  facebook_url?: string | null;
  booking_notes?: string | null;
  gallery?: string[];
}

export interface VenueFormPayload {
  name: string;
  district: string;
  city: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  sports?: string[];
  surface_type?: SurfaceType;
  capacity?: number | null;
  has_lighting?: boolean;
  has_changing_rooms?: boolean;
  has_parking?: boolean;
  has_tribunes?: boolean;
  has_canteen?: boolean;
  is_indoor?: boolean;
  price_per_hour?: number | null;
  price_currency?: string;
  phone_primary?: string | null;
  phone_secondary?: string | null;
  whatsapp_number?: string | null;
  email?: string | null;
  facebook_url?: string | null;
  booking_notes?: string | null;
  opening_time?: string;
  closing_time?: string;
  open_days?: string[];
}

export interface VenueMutationResponse {
  message: string;
  data: Venue;
}

export interface VenueListResponse {
  data: Venue[];
  count: number;
}

export interface VenueDetailResponse {
  data: Venue;
}

export interface VenueFilters {
  sport?: string;
  surface?: SurfaceType;
  indoor?: boolean;
  lighting?: boolean;
  changing_rooms?: boolean;
  max_price?: number;
  search?: string;
  district?: string;
  sort?: 'rating' | 'price_asc' | 'price_desc' | 'popular' | 'newest';
}

// ─── Surface labels ───────────────────────────────────────────────────────────

export const SURFACE_LABELS: Record<SurfaceType, string> = {
  gazon_naturel:     'Gazon naturel',
  gazon_synthetique: 'Gazon synthétique',
  beton:             'Béton',
  parquet:           'Parquet',
  sable:             'Sable',
  ciment:            'Ciment',
};

// ─── Day labels ───────────────────────────────────────────────────────────────

export const DAY_LABELS: Record<string, string> = {
  lun: 'Lun',
  mar: 'Mar',
  mer: 'Mer',
  jeu: 'Jeu',
  ven: 'Ven',
  sam: 'Sam',
  dim: 'Dim',
};

// ─── Sport display ────────────────────────────────────────────────────────────

export const SPORT_DISPLAY: Record<string, { label: string; color: string; emoji: string }> = {
  football:       { label: 'Football', color: '#1456D9', emoji: '⚽' },
  football5:      { label: 'Foot 5', color: '#0F44B3', emoji: '🏟️' },
  basketball:     { label: 'Basketball', color: '#F28B2E', emoji: '🏀' },
  basketball3x3:  { label: 'Basket 3x3', color: '#E06D12', emoji: '🏀' },
  volleyball:     { label: 'Volleyball', color: '#10B981', emoji: '🏐' },
  table_tennis:   { label: 'Ping-Pong', color: '#8B5CF6', emoji: '🏓' },
  athletics:      { label: 'Athlétisme', color: '#EF4444', emoji: '🏃' },
};

// ─── API calls ────────────────────────────────────────────────────────────────

export const venueApi = {
  /**
   * Liste les terrains avec filtres optionnels
   */
  getVenues: async (filters: VenueFilters = {}): Promise<VenueListResponse> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params.append(key, String(val));
      }
    });
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await apiClient.get<VenueListResponse>(`/venues${qs}`);
    return response.data;
  },

  /**
   * Détail complet d'un terrain
   */
  getVenue: async (id: number): Promise<Venue> => {
    const response = await apiClient.get<VenueDetailResponse>(`/venues/${id}`);
    return response.data.data;
  },

  /**
   * Soumettre un nouveau terrain (authentifié)
   */
  createVenue: async (payload: VenueFormPayload): Promise<VenueMutationResponse> => {
    const response = await apiClient.post<VenueMutationResponse>('/venues', payload);
    return response.data;
  },

  /**
   * Modifier un terrain existant (authentifié, créateur uniquement)
   */
  updateVenue: async (id: number, payload: Partial<VenueFormPayload>): Promise<VenueMutationResponse> => {
    const response = await apiClient.put<VenueMutationResponse>(`/venues/${id}`, payload);
    return response.data;
  },
};

// ─── Format helpers ───────────────────────────────────────────────────────────

export const formatPrice = (price: number | null): string => {
  if (!price) return 'Tarif non précisé';
  return `${price.toLocaleString('fr-MG')} Ar/h`;
};

export const formatRating = (rating: number): string =>
  rating > 0 ? rating.toFixed(1) : '—';
