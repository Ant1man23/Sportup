import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { secureStorage } from '../services/secureStorage';
import { setAuthToken } from '../api/client';

export interface User {
  id: number;
  username: string;
  email: string;
  photo_path?: string | null;
  photo_url?: string | null;
  city?: string | null;
  level?: 'beginner' | 'intermediate' | 'advanced' | null;
  role?: 'player' | 'team_manager' | 'organizer' | 'referee' | 'spectator' | 'admin' | null;
  favorite_sports?: Array<{
    id: number;
    name: string;
    slug: string;
    color_hex?: string;
  }>;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  /** true une fois qu'AsyncStorage a fini de rehydrater le store */
  isHydrated: boolean;
  setAuth: (token: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isHydrated: false,
      setAuth: (token, user) => {
        setAuthToken(token);
        set({ token, user, isAuthenticated: true });
      },
      setUser: (user) => {
        set({ user });
      },
      logout: () => {
        setAuthToken(null);
        set({ token: null, user: null, isAuthenticated: false });
      },
    }),
    {
      name: '@sportup_auth_storage',
      storage: createJSONStorage(() => secureStorage),
      onRehydrateStorage: () => (state) => {
        // Restaurer le token dans l'interceptor axios AVANT tout appel API
        if (state?.token) {
          setAuthToken(state.token);
        }
        // Marquer la rehydration comme terminée
        state?.setUser && useAuthStore.setState({ isHydrated: true });
      },
    }
  )
);
