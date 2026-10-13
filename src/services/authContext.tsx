import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Permission } from '../types';
import { api, ApiError } from './api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (name: string, email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Permission mappings per role
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    'TOURNAMENTS_MANAGE',
    'TEAMS_MANAGE',
    'PLAYERS_MANAGE',
    'MATCHES_MANAGE',
    'SCORING_WRITE',
    'REPORTS_VIEW',
    'GRAPHICS_MANAGE',
    'BROADCAST_MANAGE',
    'USERS_MANAGE',
    'SYSTEM_SETTINGS',
  ],
  ADMIN: [
    'TOURNAMENTS_MANAGE',
    'TEAMS_MANAGE',
    'PLAYERS_MANAGE',
    'MATCHES_MANAGE',
    'SCORING_WRITE',
    'REPORTS_VIEW',
    'GRAPHICS_MANAGE',
    'BROADCAST_MANAGE',
    'USERS_MANAGE',
  ],
  SCORER: ['MATCHES_MANAGE', 'SCORING_WRITE', 'REPORTS_VIEW'],
  BROADCASTER: ['GRAPHICS_MANAGE', 'BROADCAST_MANAGE', 'REPORTS_VIEW'],
  USER: ['REPORTS_VIEW'],
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('sportspulse_token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const res = await api.getMe();
      setUser(res.user);
    } catch (err: any) {
      console.warn('Session restoration failed:', err);
      localStorage.removeItem('sportspulse_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();

    const handleSessionExpired = (e: any) => {
      localStorage.removeItem('sportspulse_token');
      setUser(null);
      setError(e.detail?.message || 'Your session has expired. Please log in again.');
    };

    window.addEventListener('sportspulse:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('sportspulse:session-expired', handleSessionExpired);
    };
  }, []);

  const login = async (username: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const res = await api.login(username, password);
      localStorage.setItem('sportspulse_token', res.token);
      setUser(res.user);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Login failed. Please check your credentials.';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout().catch(() => {});
    } finally {
      localStorage.removeItem('sportspulse_token');
      setUser(null);
    }
  };

  const updateProfile = async (name: string, email: string) => {
    try {
      setError(null);
      const res = await api.updateProfile(name, email);
      if (res.token) {
        localStorage.setItem('sportspulse_token', res.token);
      }
      setUser(res.user);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update profile.';
      setError(msg);
      throw err;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    try {
      setError(null);
      await api.changePassword(currentPassword, newPassword, confirmPassword);
      // Update mustChangePassword flag in local state if set
      if (user) {
        setUser({ ...user, mustChangePassword: false });
      }
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Failed to change password.';
      setError(msg);
      throw err;
    }
  };

  const hasPermissionCheck = (permission: Permission): boolean => {
    if (!user) return false;
    const perms = ROLE_PERMISSIONS[user.role] || [];
    return perms.includes(permission);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        updateProfile,
        changePassword,
        hasPermission: hasPermissionCheck,
        clearError,
        refreshUser: fetchCurrentUser,
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
