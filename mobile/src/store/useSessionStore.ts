import { create } from 'zustand';

export interface SessionFilters {
  sportId?: number;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'all';
  type?: 'find_players' | 'find_opponent' | 'free_match';
  radiusKm?: number;
}

interface SessionStoreState {
  viewMode: 'list' | 'map';
  filters: SessionFilters;
  setViewMode: (mode: 'list' | 'map') => void;
  setFilters: (filters: Partial<SessionFilters>) => void;
  resetFilters: () => void;
}

export const useSessionStore = create<SessionStoreState>((set) => ({
  viewMode: 'list',
  filters: {
    level: 'all',
    radiusKm: 15,
  },
  setViewMode: (mode) => set({ viewMode: mode }),
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),
  resetFilters: () =>
    set({
      filters: { level: 'all', radiusKm: 15 },
    }),
}));
