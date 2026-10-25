import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isDemo: boolean;
  isLoading: boolean;
  darkMode: boolean;
  toggleDarkMode: () => void;
  safetyAlert: string | null;
  setSafetyAlert: (msg: string | null) => void;
  login: (credentials: any) => Promise<void>;
  loginDemo: () => Promise<void>;
  signup: (userData: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('signalbridge_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [safetyAlert, setSafetyAlert] = useState<string | null>(null);

  // Dark mode state with system preference & local storage persistence
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('signalbridge_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('signalbridge_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('signalbridge_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  const fetchCurrentUser = async () => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const userData = await api.getMe();
      setUser(userData);
    } catch (err) {
      console.warn('Session expired or invalid, logging out', err);
      localStorage.removeItem('signalbridge_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, [token]);

  const login = async (credentials: any) => {
    setIsLoading(true);
    try {
      const res = await api.login(credentials);
      localStorage.setItem('signalbridge_token', res.access_token);
      setToken(res.access_token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const loginDemo = async () => {
    setIsLoading(true);
    try {
      const res = await api.demoLogin();
      localStorage.setItem('signalbridge_token', res.access_token);
      setToken(res.access_token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData: any) => {
    setIsLoading(true);
    try {
      const res = await api.signup(userData);
      localStorage.setItem('signalbridge_token', res.access_token);
      setToken(res.access_token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('signalbridge_token');
    setToken(null);
    setUser(null);
    setSafetyAlert(null);
  };

  const isDemo = Boolean(user?.role === 'guest' || user?.email === 'demo@signalbridge.health');

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isDemo,
        isLoading,
        darkMode,
        toggleDarkMode,
        safetyAlert,
        setSafetyAlert,
        login,
        loginDemo,
        signup,
        logout,
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
