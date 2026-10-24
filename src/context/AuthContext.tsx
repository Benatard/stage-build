import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { hasPermission } from '@/config/permissions';
import { authService } from '@/services/auth.service';
import type { AuthUser } from '@/types/domain';

type AuthContextValue = {
  user: AuthUser | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  error: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  refresh: () => Promise<void>;
  can: (permission: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    authService
      .restoreSession()
      .then((profile) => {
        if (!active) return;
        setUser(profile);
        setStatus(profile ? 'authenticated' : 'anonymous');
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setStatus('anonymous');
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setStatus('loading');

    try {
      const profile = await authService.login(email, password);
      setUser(profile);
      setStatus('authenticated');
      return profile;
    } catch (loginError) {
      setUser(null);
      setStatus('anonymous');
      const message =
        loginError instanceof Error
          ? loginError.message
          : 'Connexion impossible. Vérifiez vos identifiants.';
      setError(message);
      throw loginError;
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setError(null);
    setStatus('anonymous');
  }, []);

  const refresh = useCallback(async () => {
    try {
      const profile = await authService.restoreSession();
      setUser(profile);
      setStatus(profile ? 'authenticated' : 'anonymous');
    } catch {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const can = useCallback(
    (permission: string) => (user ? hasPermission(user.permissions, permission) : false),
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, error, login, logout, refresh, can }),
    [user, status, error, login, logout, refresh, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth doit être utilisé dans AuthProvider.');
  }

  return context;
}
