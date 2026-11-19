import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch } from '../lib/api';
import type {
  AuthPortalName,
  AuthUser,
  SessionResponse,
  AnalystRegistrationPayload,
  AdminRegistrationPayload,
  UserRole,
} from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string, portal: AuthPortalName) => Promise<void>;
  registerCivic: (username: string, password: string) => Promise<void>;
  registerAnalyst: (payload: AnalystRegistrationPayload) => Promise<void>;
  registerAdmin: (payload: AdminRegistrationPayload) => Promise<void>;
  registerUser: (payload: {
    username: string;
    password: string;
    role: UserRole;
    phone_number?: string;
    employee_id?: string;
    department?: string;
    assigned_zone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUser(await apiFetch<AuthUser>('/api/v1/auth/me'));
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string, portal: AuthPortalName) => {
    try {
      const session = await apiFetch<SessionResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password, portal }),
      });
      if (session.access_token) {
        localStorage.setItem('uwai_token', session.access_token);
      }
      setUser(session.user);
    } catch (err: any) {
      if (err?.message?.includes('not authorized for this portal')) {
        for (const altPortal of ['operations', 'admin', 'civic'] as AuthPortalName[]) {
          if (altPortal === portal) continue;
          try {
            const altSession = await apiFetch<SessionResponse>('/api/v1/auth/login', {
              method: 'POST',
              body: JSON.stringify({ username, password, portal: altPortal }),
            });
            if (altSession.access_token) {
              localStorage.setItem('uwai_token', altSession.access_token);
            }
            setUser(altSession.user);
            return;
          } catch {
            // continue fallback
          }
        }
      }
      throw err;
    }
  }, []);

  const registerCivic = useCallback(
    async (username: string, password: string) => {
      await apiFetch<AuthUser>('/api/v1/auth/register/civic', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      await login(username, password, 'civic');
    },
    [login],
  );

  const registerAnalyst = useCallback(
    async (payload: AnalystRegistrationPayload) => {
      await apiFetch<AuthUser>('/api/v1/auth/register/analyst', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await login(payload.username, payload.password, 'operations');
    },
    [login],
  );

  const registerAdmin = useCallback(
    async (payload: AdminRegistrationPayload) => {
      await apiFetch<AuthUser>('/api/v1/auth/register/admin', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await login(payload.username, payload.password, 'admin');
    },
    [login],
  );

  const registerUser = useCallback(
    async (payload: {
      username: string;
      password: string;
      role: UserRole;
      phone_number?: string;
      employee_id?: string;
      department?: string;
      assigned_zone?: string;
    }) => {
      await apiFetch<AuthUser>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const portal = payload.role === 'admin' ? 'admin' : payload.role === 'civic' ? 'civic' : 'operations';
      await login(payload.username, payload.password, portal);
    },
    [login],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch<void>('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('uwai_token');
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, registerCivic, registerAnalyst, registerAdmin, registerUser, logout, refresh }),
    [user, loading, login, registerCivic, registerAnalyst, registerAdmin, registerUser, logout, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
