'use client';

import React, { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserSession } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: UserSession | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refetchUser: () => void;
  setSession: (userData: UserSession | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();

  const { data: user = null, isLoading, refetch } = useQuery<UserSession | null>({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return null;
      const data = await res.json();
      return data.user;
    },
    staleTime: 5 * 60 * 1000,
  });

  const setSession = (userData: UserSession | null) => {
    queryClient.setQueryData(['auth-me'], userData);
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.setQueryData(['auth-me'], null);
      queryClient.clear();
      toast('Logged out', 'You have been logged out of DocAvail.', 'info');
      router.push('/login');
      router.refresh();
    },
  });

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        logout,
        refetchUser: refetch,
        setSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
