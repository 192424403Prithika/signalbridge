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
  const [token, setToken] = useState<string | null>(() => {
    const isExplicitDemo = sessionStorage.getItem('signalbridge_demo_active') === 'true';
    if (isExplicitDemo) {
      return sessionStorage.getItem('signalbridge_demo_token');
    }
    return localStorage.getItem('signalbridge_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [safetyAlert, setSafetyAlert] = useState<string | null>(null);

  // Dark mode state with system preference & local storage persistence
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('signalbridge_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (darkMode) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      if (body) body.classList.add('dark');
      localStorage.setItem('signalbridge_theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      if (body) body.classList.remove('dark');
      localStorage.setItem('signalbridge_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  const fetchCurrentUser = async () => {
    const isExplicitDemo = sessionStorage.getItem('signalbridge_demo_active') === 'true';
    const localToken = localStorage.getItem('signalbridge_token');
    const demoToken = sessionStorage.getItem('signalbridge_demo_token');

    // If on landing page and not actively in an explicit demo exploration, clear demo tokens
    if (window.location.pathname === '/' && !isExplicitDemo) {
      sessionStorage.removeItem('signalbridge_demo_token');
      sessionStorage.removeItem('signalbridge_demo_active');
    }

    const currentToken = localToken || (isExplicitDemo ? demoToken : null);
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const userData = await api.getMe();
      // If it's a demo account but user didn't explicitly click demo or is on '/', clean it up
      if ((userData.role === 'guest' || userData.email === 'demo@signalbridge.health') && !isExplicitDemo) {
        localStorage.removeItem('signalbridge_token');
        sessionStorage.removeItem('signalbridge_demo_token');
        sessionStorage.removeItem('signalbridge_demo_active');
        setUser(null);
        setToken(null);
        setIsLoading(false);
        return;
      }
      setUser(userData);
    } catch (err) {
      console.warn('Session expired or invalid, logging out', err);
      localStorage.removeItem('signalbridge_token');
      sessionStorage.removeItem('signalbridge_demo_token');
      sessionStorage.removeItem('signalbridge_demo_active');
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
      sessionStorage.removeItem('signalbridge_demo_token');
      sessionStorage.removeItem('signalbridge_demo_active');
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
      sessionStorage.setItem('signalbridge_demo_token', res.access_token);
      sessionStorage.setItem('signalbridge_demo_active', 'true');
      setToken(res.access_token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData: any) => {
    setIsLoading(true);
    try {
      sessionStorage.removeItem('signalbridge_demo_token');
      sessionStorage.removeItem('signalbridge_demo_active');
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
    sessionStorage.removeItem('signalbridge_demo_token');
    sessionStorage.removeItem('signalbridge_demo_active');
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
