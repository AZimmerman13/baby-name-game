import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { getCurrentUser, login as apiLogin, register as apiRegister, logout as apiLogout } from '../services/api';
import type { UserResponse, UserLogin, UserRegister } from '../types/api';

interface AuthContextType {
  user: UserResponse | null;
  loading: boolean;
  login: (credentials: UserLogin) => Promise<UserResponse>;
  register: (userData: UserRegister) => Promise<UserResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to load user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: UserLogin): Promise<UserResponse> => {
    const userData = await apiLogin(credentials);
    setUser(userData);
    return userData;
  };

  const register = async (userData: UserRegister): Promise<UserResponse> => {
    const newUser = await apiRegister(userData);
    setUser(newUser);
    return newUser;
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  const refreshUser = async () => {
    await loadUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
