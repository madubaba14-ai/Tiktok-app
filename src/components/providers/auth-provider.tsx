'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuthStore, User } from '@/stores/auth-store';
import { AuthModal } from '@/components/auth/auth-modal';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  isAuthenticated: boolean;
  showAuthModal: (defaultTab?: 'login' | 'register') => void;
  hideAuthModal: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { user, isLoading, isInitialized, fetchCurrentUser, logout } = useAuthStore();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  // Initialize auth on mount
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const showAuthModal = useCallback((defaultTab: 'login' | 'register' = 'login') => {
    setAuthModalTab(defaultTab);
    setIsAuthModalOpen(true);
  }, []);

  const hideAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isInitialized,
        isAuthenticated: !!user,
        showAuthModal,
        hideAuthModal,
        logout,
      }}
    >
      {children}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={hideAuthModal}
        defaultTab={authModalTab}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
