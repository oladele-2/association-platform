import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch, registerAuthHooks, resolveOrgSlug } from './api';
import { defaultShell, deriveShells, type ShellId } from './shells';

export type AuthUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  mustResetPassword: boolean;
  status: string;
};

type SessionResponse = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresAt: string;
  user: AuthUser;
};

type PermissionsResponse = {
  permissions: string[];
  roles: Array<{ key?: string; name?: string; id?: string }>;
};

type AuthContextValue = {
  ready: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  shells: ShellId[];
  permissions: string[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Clear any legacy XSS-risk refresh tokens from earlier portal versions. */
function clearLegacyRefreshStorage() {
  try {
    sessionStorage.removeItem('association.refreshToken');
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [shells, setShells] = useState<ShellId[]>(['member']);
  const [permissions, setPermissions] = useState<string[]>([]);
  const accessTokenRef = useRef<string | null>(null);
  const expiresAtRef = useRef<number>(0);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hydrateEntitlements = useCallback(async (token: string) => {
    const [perms, institutions] = await Promise.all([
      apiFetch<PermissionsResponse>('/v1/me/permissions', {
        accessToken: token,
        skipAuthRetry: true,
      }),
      apiFetch<unknown[] | { items?: unknown[] }>('/v1/institutions/mine', {
        accessToken: token,
        skipAuthRetry: true,
      }).catch(() => [] as unknown[]),
    ]);
    const list = Array.isArray(institutions) ? institutions : (institutions.items ?? []);
    const nextShells = deriveShells({
      permissions: perms.permissions ?? [],
      institutionCount: list.length,
    });
    setPermissions(perms.permissions ?? []);
    setShells(nextShells);
    return nextShells;
  }, []);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const scheduleProactiveRefresh = useCallback(
    (expiresInSeconds: number, doRefresh: () => Promise<boolean>) => {
      clearRefreshTimer();
      // Refresh ~60s before expiry (minimum 15s delay).
      const delayMs = Math.max(15_000, (expiresInSeconds - 60) * 1000);
      refreshTimerRef.current = setTimeout(() => {
        void doRefresh();
      }, delayMs);
    },
    [clearRefreshTimer],
  );

  const applySession = useCallback(
    async (session: SessionResponse) => {
      accessTokenRef.current = session.accessToken;
      expiresAtRef.current = Date.now() + session.accessTokenExpiresIn * 1000;
      setAccessToken(session.accessToken);
      setUser(session.user);
      clearLegacyRefreshStorage();
      await hydrateEntitlements(session.accessToken);
    },
    [hydrateEntitlements],
  );

  const refresh = useCallback(async () => {
    try {
      const session = await apiFetch<SessionResponse>('/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({}),
        skipAuthRetry: true,
      });
      await applySession(session);
      scheduleProactiveRefresh(session.accessTokenExpiresIn, refresh);
      return true;
    } catch {
      accessTokenRef.current = null;
      expiresAtRef.current = 0;
      clearRefreshTimer();
      setAccessToken(null);
      setUser(null);
      setPermissions([]);
      setShells(['member']);
      clearLegacyRefreshStorage();
      return false;
    }
  }, [applySession, clearRefreshTimer, scheduleProactiveRefresh]);

  useEffect(() => {
    registerAuthHooks({
      getAccessToken: () => accessTokenRef.current,
      refreshAccessToken: async () => {
        const ok = await refresh();
        return ok ? accessTokenRef.current : null;
      },
    });
    return () => registerAuthHooks(null);
  }, [refresh]);

  useEffect(() => {
    void (async () => {
      clearLegacyRefreshStorage();
      const ok = await refresh();
      if (ok && expiresAtRef.current) {
        const remaining = Math.floor((expiresAtRef.current - Date.now()) / 1000);
        if (remaining > 0) scheduleProactiveRefresh(remaining, refresh);
      }
      setReady(true);
    })();
    return () => clearRefreshTimer();
  }, [refresh, scheduleProactiveRefresh, clearRefreshTimer]);

  const login = useCallback(
    async (email: string, password: string) => {
      const slug = resolveOrgSlug();
      if (!slug && typeof window !== 'undefined') {
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1') {
          throw {
            status: 400,
            message: 'Set VITE_ORG_SLUG for local portal development',
          };
        }
      }
      const session = await apiFetch<SessionResponse>('/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuthRetry: true,
      });
      await applySession(session);
      scheduleProactiveRefresh(session.accessTokenExpiresIn, refresh);
    },
    [applySession, refresh, scheduleProactiveRefresh],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch('/v1/auth/logout', {
        method: 'POST',
        body: JSON.stringify({}),
        skipAuthRetry: true,
      });
    } catch {
      /* ignore */
    }
    accessTokenRef.current = null;
    expiresAtRef.current = 0;
    clearRefreshTimer();
    setAccessToken(null);
    setUser(null);
    setPermissions([]);
    setShells(['member']);
    clearLegacyRefreshStorage();
  }, [clearRefreshTimer]);

  const value = useMemo(
    () => ({ ready, user, accessToken, shells, permissions, login, logout, refresh }),
    [ready, user, accessToken, shells, permissions, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}

export function useDefaultShellPath() {
  const { shells } = useAuth();
  return `/${defaultShell(shells)}`;
}
