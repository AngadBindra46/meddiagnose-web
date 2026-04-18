import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi } from './api';

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  onboarding_completed?: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  role?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  allergies?: string;
  phone?: string;
  weight_kg?: number;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  loginWithToken: (accessToken: string, refreshToken?: string) => Promise<User>;
  updateMe: (data: Partial<RegisterData> & { onboarding_completed?: boolean }) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      localStorage.removeItem('user');
      localStorage.removeItem('refresh_token');
      setLoading(false);
      return;
    }
    // Always validate token with backend; never trust localStorage user alone
    authApi.me()
      .then((res) => {
        const u = res.data;
        if (u?.role) {
          localStorage.setItem('user', JSON.stringify(u));
          setUser(u);
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await authApi.login(email, password);
    const { access_token, refresh_token, user: u } = res.data;
    if (!u.role) {
      throw new Error('Access denied. Invalid account.');
    }
    localStorage.setItem('token', access_token);
    if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    return u;
  };

  const register = async (data: RegisterData): Promise<User> => {
    const res = await authApi.register(data);
    const { access_token, refresh_token, user: u } = res.data;
    if (!u.role) {
      throw new Error('Access denied. Invalid account.');
    }
    localStorage.setItem('token', access_token);
    if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    return u;
  };

  const loginWithToken = async (accessToken: string, refreshToken?: string): Promise<User> => {
    localStorage.setItem('token', accessToken);
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
    const res = await authApi.me();
    const u = res.data;
    if (!u?.role) {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      throw new Error('Access denied. Invalid account.');
    }
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    return u;
  };

  const updateMe = async (data: Partial<RegisterData> & { onboarding_completed?: boolean }): Promise<User> => {
    const res = await authApi.updateMe(data);
    const u = res.data;
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, register, loginWithToken, updateMe, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
