import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch } from './api';

const TOKEN_KEY = 'platform.accessToken';

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

type AuthContextValue = {
  ready: boolean;
  user: PlatformUser | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const stored = sessionStorage.getItem(TOKEN_KEY);
      if (!stored) {
        setReady(true);
        return;
      }
      try {
        const me = await apiFetch<PlatformUser>('/v1/platform/auth/me', {
          accessToken: stored,
        });
        setAccessToken(stored);
        setUser(me);
      } catch {
        sessionStorage.removeItem(TOKEN_KEY);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = await apiFetch<LoginResponse>('/v1/platform/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    sessionStorage.setItem(TOKEN_KEY, session.accessToken);
    setAccessToken(session.accessToken);
    setUser(session.user);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setAccessToken(null);
    setUser(null);
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
