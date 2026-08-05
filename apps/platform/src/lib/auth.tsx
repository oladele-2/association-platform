import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch, setOnUnauthorized } from './api';

const TOKEN_KEY = 'platform.accessToken';
const EXPIRES_KEY = 'platform.accessExpiresAt';

export type PlatformUser = {
  id: string;
  email: string;
  roles?: string[];
};

type LoginResponse = {
  accessToken: string;
  accessTokenExpiresIn: number;
  user: PlatformUser;
};

type MeResponse = {
  id?: string;
  userId?: string;
  email: string;
  roles?: string[];
};

type AuthContextValue = {
  ready: boolean;
  user: PlatformUser | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Normalize `/me` (userId) and login (id) into one PlatformUser shape. */
export function normalizePlatformUser(raw: MeResponse | PlatformUser): PlatformUser {
  const id = 'id' in raw && raw.id ? raw.id : (raw as MeResponse).userId;
  if (!id) {
    throw new Error('Platform user id missing');
  }
  return {
    id,
    email: raw.email,
    roles: raw.roles,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(EXPIRES_KEY);
    setAccessToken(null);
    setUser(null);
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  useEffect(() => {
    setOnUnauthorized(() => {
      clearSession();
    });
    return () => setOnUnauthorized(null);
  }, [clearSession]);

  useEffect(() => {
    void (async () => {
      const stored = sessionStorage.getItem(TOKEN_KEY);
      const expiresRaw = sessionStorage.getItem(EXPIRES_KEY);
      if (!stored) {
        setReady(true);
        return;
      }
      if (expiresRaw) {
        const expiresAt = Date.parse(expiresRaw);
        if (!Number.isNaN(expiresAt) && Date.now() >= expiresAt) {
          clearSession();
          setReady(true);
          return;
        }
      }
      try {
        const me = await apiFetch<MeResponse>('/v1/platform/auth/me', {
          accessToken: stored,
        });
        setAccessToken(stored);
        setUser(normalizePlatformUser(me));
      } catch {
        clearSession();
      } finally {
        setReady(true);
      }
    })();
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    const session = await apiFetch<LoginResponse>('/v1/platform/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    sessionStorage.setItem(TOKEN_KEY, session.accessToken);
    if (session.accessTokenExpiresIn > 0) {
      const expiresAt = new Date(Date.now() + session.accessTokenExpiresIn * 1000).toISOString();
      sessionStorage.setItem(EXPIRES_KEY, expiresAt);
    }
    setAccessToken(session.accessToken);
    setUser(normalizePlatformUser(session.user));
  }, []);

  const value = useMemo(
    () => ({ ready, user, accessToken, login, logout }),
    [ready, user, accessToken, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
