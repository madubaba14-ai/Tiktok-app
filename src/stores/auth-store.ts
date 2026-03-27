import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// User type for the store
export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  isVerified: boolean;
  isPrivate: boolean;
  videosCount: number;
  likesCount: number;
  followersCount: number;
  followingCount: number;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
}

// Auth state interface
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setInitialized: (initialized: boolean) => void;
  
  // Auth actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  fetchCurrentUser: () => Promise<void>;
  reset: () => void;
}

// Initial state
const initialState = {
  user: null,
  token: null,
  isLoading: false,
  isInitialized: false,
  error: null,
};

// Create the auth store
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Setters
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setInitialized: (isInitialized) => set({ isInitialized }),
      
      // Login action
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            set({ isLoading: false, error: data.error || 'Login failed' });
            return { success: false, error: data.error || 'Login failed' };
          }
          
          set({
            user: data.user,
            token: data.token,
            isLoading: false,
            error: null,
            isInitialized: true,
          });
          
          return { success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },
      
      // Register action
      register: async (email, username, password) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, password }),
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            set({ isLoading: false, error: data.error || 'Registration failed' });
            return { success: false, error: data.error || 'Registration failed' };
          }
          
          set({
            user: data.user,
            token: data.token,
            isLoading: false,
            error: null,
            isInitialized: true,
          });
          
          return { success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Registration failed';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },
      
      // Logout action
      logout: async () => {
        set({ isLoading: true });
        
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch {
          // Ignore errors during logout
        }
        
        set({
          user: null,
          token: null,
          isLoading: false,
          error: null,
          isInitialized: false,
        });
      },
      
      // Update user action
      updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } });
        }
      },
      
      // Fetch current user
      fetchCurrentUser: async () => {
        set({ isLoading: true });
        
        try {
          const response = await fetch('/api/auth/me');
          
          if (!response.ok) {
            set({
              user: null,
              token: null,
              isLoading: false,
              isInitialized: true,
            });
            return;
          }
          
          const data = await response.json();
          
          set({
            user: data.user,
            isLoading: false,
            isInitialized: true,
          });
        } catch {
          set({
            user: null,
            token: null,
            isLoading: false,
            isInitialized: true,
          });
        }
      },
      
      // Reset store
      reset: () => set(initialState),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);
