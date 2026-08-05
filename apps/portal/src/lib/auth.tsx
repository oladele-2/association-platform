import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch, ORG_SLUG } from './api';
import { defaultShell, deriveShells, type ShellId } from './shells';

const REFRESH_KEY = 'association.refreshToken';

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

function readStoredRefresh(): string | null {
  try {
    return sessionStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

function writeStoredRefresh(token: string | null) {
  try {
    if (token) sessionStorage.setItem(REFRESH_KEY, token);
    else sessionStorage.removeItem(REFRESH_KEY);
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

  const hydrateEntitlements = useCallback(async (token: string) => {
    const [perms, institutions] = await Promise.all([
      apiFetch<PermissionsResponse>('/v1/me/permissions', { accessToken: token }),
      apiFetch<unknown[] | { items?: unknown[] }>('/v1/institutions/mine', {
        accessToken: token,
      }).catch(() => [] as unknown[]),
    ]);
    const list = Array.isArray(institutions) ? institutions : (institutions.items ?? []);
    const nextShells = deriveShells({
      permissions: perms.permissions ?? [],
      roles: perms.roles ?? [],
      institutionCount: list.length,
    });
    setPermissions(perms.permissions ?? []);
    setShells(nextShells);
    return nextShells;
  }, []);

  const applySession = useCallback(
    async (session: SessionResponse) => {
      setAccessToken(session.accessToken);
      setUser(session.user);
      writeStoredRefresh(session.refreshToken);
      await hydrateEntitlements(session.accessToken);
    },
    [hydrateEntitlements],
  );

  const refresh = useCallback(async () => {
    const stored = readStoredRefresh();
    try {
      const session = await apiFetch<SessionResponse>('/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify(stored ? { refreshToken: stored } : {}),
      });
      await applySession(session);
      return true;
    } catch {
      setAccessToken(null);
      setUser(null);
      setPermissions([]);
      setShells(['member']);
      writeStoredRefresh(null);
      return false;
    }
  }, [applySession]);

  useEffect(() => {
    void (async () => {
      await refresh();
      setReady(true);
    })();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await apiFetch<SessionResponse>('/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        orgSlug: ORG_SLUG,
      });
      await applySession(session);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    const stored = readStoredRefresh();
    try {
      await apiFetch('/v1/auth/logout', {
        method: 'POST',
        body: JSON.stringify(stored ? { refreshToken: stored } : {}),
      });
    } catch {
      /* ignore */
    }
    setAccessToken(null);
    setUser(null);
    setPermissions([]);
    setShells(['member']);
    writeStoredRefresh(null);
  }, []);

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
