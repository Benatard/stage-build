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
import { invalidateReferenceData } from '@/hooks/useReferenceData';
import { authService } from '@/services/auth.service';
import { dataService } from '@/services/data.service';
import { clearRememberedPasswords } from '@/services/password-vault';
import { setTenantContext } from '@/services/tenant';
import type { AuthUser, Institution } from '@/types/domain';

const ACTIVE_INSTITUTION_KEY = 'stagebuild.activeInstitutionId';

type AuthContextValue = {
  user: AuthUser | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  error: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  refresh: () => Promise<void>;
  can: (permission: string) => boolean;
  activeInstitutionId: string | null;
  activeInstitution: Institution | null;
  isSupraAdmin: boolean;
  isPlatformMode: boolean;
  setActiveInstitution: (institutionId: string | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function storedInstitutionId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACTIVE_INSTITUTION_KEY);
}

function rememberInstitutionId(institutionId: string | null): void {
  if (typeof window === 'undefined') return;
  if (institutionId) {
    window.localStorage.setItem(ACTIVE_INSTITUTION_KEY, institutionId);
  } else {
    window.localStorage.removeItem(ACTIVE_INSTITUTION_KEY);
  }
}

function resolveActiveInstitutionId(profile: AuthUser | null): string | null {
  if (!profile) return null;
  if (profile.is_supra_admin) return storedInstitutionId();
  return profile.institution_id ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');
  const [error, setError] = useState<string | null>(null);
  const [activeInstitutionId, setActiveInstitutionIdState] = useState<string | null>(null);
  const [activeInstitution, setActiveInstitutionState] = useState<Institution | null>(null);

  const applyProfile = useCallback((profile: AuthUser | null) => {
    setUser(profile);

    if (!profile) {
      setActiveInstitutionIdState(null);
      setActiveInstitutionState(null);
      setTenantContext({ institutionId: null });
      return;
    }

    const nextInstitutionId = resolveActiveInstitutionId(profile);
    setActiveInstitutionIdState(nextInstitutionId);
    setActiveInstitutionState(
      profile.institution?.id === nextInstitutionId ? profile.institution : null,
    );
    setTenantContext({
      institutionId: nextInstitutionId,
      platformMode: Boolean(profile.is_supra_admin && !nextInstitutionId),
    });
    invalidateReferenceData();
  }, []);

  useEffect(() => {
    let active = true;

    authService
      .restoreSession()
      .then((profile) => {
        if (!active) return;
        applyProfile(profile);
        setStatus(profile ? 'authenticated' : 'anonymous');
      })
      .catch(() => {
        if (!active) return;
        clearRememberedPasswords();
        applyProfile(null);
        setStatus('anonymous');
      });

    return () => {
      active = false;
    };
  }, [applyProfile]);

  useEffect(() => {
    if (!user) return;

    setTenantContext({
      institutionId: activeInstitutionId,
      platformMode: Boolean(user.is_supra_admin && !activeInstitutionId),
    });
    invalidateReferenceData();

    if (!activeInstitutionId) {
      setActiveInstitutionState(null);
      return;
    }

    if (user.institution?.id === activeInstitutionId) {
      setActiveInstitutionState(user.institution);
      return;
    }

    let active = true;
    dataService
      .findRow<Institution>('institutions', activeInstitutionId)
      .then((institution) => {
        if (active) setActiveInstitutionState(institution);
      })
      .catch(() => {
        if (!active) return;
        setActiveInstitutionState(null);
        rememberInstitutionId(null);
        setActiveInstitutionIdState(null);
      });

    return () => {
      active = false;
    };
  }, [activeInstitutionId, user]);

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null);
      setStatus('loading');

      try {
        const profile = await authService.login(email, password);
        applyProfile(profile);
        setStatus('authenticated');
        return profile;
      } catch (loginError) {
        applyProfile(null);
        setStatus('anonymous');
        const message =
          loginError instanceof Error
            ? loginError.message
            : 'Connexion impossible. VÃ©rifiez vos identifiants.';
        setError(message);
        throw loginError;
      }
    },
    [applyProfile],
  );

  const logout = useCallback(() => {
    authService.logout();
    clearRememberedPasswords();
    rememberInstitutionId(null);
    applyProfile(null);
    setError(null);
    setStatus('anonymous');
  }, [applyProfile]);

  const refresh = useCallback(async () => {
    try {
      const profile = await authService.restoreSession();
      if (profile && profile.is_supra_admin) {
        setUser(profile);
        if (profile.institution?.id === activeInstitutionId) {
          setActiveInstitutionState(profile.institution);
        }
      } else {
        applyProfile(profile);
      }
      setStatus(profile ? 'authenticated' : 'anonymous');
    } catch {
      clearRememberedPasswords();
      applyProfile(null);
      setStatus('anonymous');
    }
  }, [activeInstitutionId, applyProfile]);

  const setActiveInstitution = useCallback(
    (institutionId: string | null) => {
      const next = institutionId || null;

      if (!user?.is_supra_admin && next !== (user?.institution_id ?? null)) {
        return;
      }

      rememberInstitutionId(next);
      setActiveInstitutionIdState(next);
      setTenantContext({
        institutionId: next,
        platformMode: Boolean(user?.is_supra_admin && !next),
      });
      invalidateReferenceData();
    },
    [user?.is_supra_admin, user?.institution_id],
  );

  const can = useCallback(
    (permission: string) => (user ? hasPermission(user.permissions, permission) : false),
    [user],
  );

  const isSupraAdmin = Boolean(user?.is_supra_admin || user?.role === 'supra_admin');
  const isPlatformMode = isSupraAdmin && !activeInstitutionId;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      error,
      login,
      logout,
      refresh,
      can,
      activeInstitutionId,
      activeInstitution,
      isSupraAdmin,
      isPlatformMode,
      setActiveInstitution,
    }),
    [
      user,
      status,
      error,
      login,
      logout,
      refresh,
      can,
      activeInstitutionId,
      activeInstitution,
      isSupraAdmin,
      isPlatformMode,
      setActiveInstitution,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth doit Ãªtre utilisÃ© dans AuthProvider.');
  }

  return context;
}

