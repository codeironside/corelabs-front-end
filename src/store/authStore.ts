import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StudioRole } from '@/config/roles';
import { normalizeStudioRole } from '@/config/roles';

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  role: StudioRole;
  workspaceId: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setTokens: (accessToken: string, refreshToken: string): void => {
        set({ accessToken, refreshToken });
      },
      setUser: (user: AuthUser): void => {
        set({
          user: {
            ...user,
            role: normalizeStudioRole(user.role),
          },
        });
      },
      logout: (): void => {
        set({ accessToken: null, refreshToken: null, user: null });
      },
    }),
    {
      name: 'corelabs-studio-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
);
