import { permissionsForRoles, ROLE_LABELS } from '@/config/permissions';
import type { AuthUser, Institution, Role, User } from '@/types/domain';
import { dataService } from './data.service';
import { forgeAuth } from './forge/auth';
import { forgeTokenStorage } from './forge/token-storage';
import type { ForgeRow } from './forge/types';

const KNOWN_ROLES = Object.keys(ROLE_LABELS) as Role[];

const LEGACY_ROLE_MAP: Record<string, Role> = {
  admin: 'supra_admin',
  direction: 'directeur',
  administration: 'service_administratif',
  maitre_stage: 'encadreur',
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function unwrapUser(payload: unknown): ForgeRow | null {
  const record = asRecord(payload);
  if (!record) return null;

  const candidates: unknown[] = [record.user, record.me, record.data];
  for (const candidate of candidates) {
    const nested = asRecord(candidate);
    if (nested) {
      const fromData = asRecord(nested.user);
      if (fromData) return fromData;
      if (nested.email || nested.id) return nested;
    }
  }

  return record.email || record.id ? record : null;
}

export function normalizeRole(value: unknown): Role {
  const raw = typeof value === 'string' ? value.trim() : '';
  const role = LEGACY_ROLE_MAP[raw] ?? raw;
  return KNOWN_ROLES.includes(role as Role) ? (role as Role) : 'stagiaire';
}

function readRoles(row: ForgeRow): Role[] {
  const roles = new Set<Role>();
  const primary = row.role;
  if (typeof primary === 'string') roles.add(normalizeRole(primary));

  if (Array.isArray(row.roles)) {
    row.roles.forEach((entry) => {
      if (typeof entry === 'string') {
        roles.add(normalizeRole(entry));
        return;
      }
      const record = asRecord(entry);
      if (record) roles.add(normalizeRole(record.name ?? record.role ?? record.label));
    });
  }

  if (roles.size === 0) roles.add('stagiaire');
  return Array.from(roles);
}

export function normalizeAuthUser(payload: unknown): AuthUser {
  const row = unwrapUser(payload);

  if (!row) {
    throw new Error('Profil utilisateur introuvable.');
  }

  const roles = readRoles(row);
  const isSupraAdmin =
    row.is_supra_admin === true || roles.includes('supra_admin');
  const user: User = {
    id: String(row.id ?? ''),
    email: String(row.email ?? ''),
    first_name: String(row.first_name ?? ''),
    last_name: String(row.last_name ?? ''),
    phone: typeof row.phone === 'string' ? row.phone : null,
    role: roles[0],
    roles,
    statut: row.statut === 'inactive' || row.statut === 'blocked' ? row.statut : 'active',
    last_login_at: typeof row.last_login_at === 'string' ? row.last_login_at : null,
    avatar_url: typeof row.avatar_url === 'string' ? row.avatar_url : null,
    stagiaire_id: typeof row.stagiaire_id === 'string' ? row.stagiaire_id : null,
    institution_id: typeof row.institution_id === 'string' ? row.institution_id : null,
    is_supra_admin: isSupraAdmin,
    must_change_password: row.must_change_password === true,
  };

  return {
    ...user,
    roles,
    is_supra_admin: isSupraAdmin,
    permissions: permissionsForRoles(roles),
    institution: null,
  };
}

async function attachInstitution(user: AuthUser): Promise<AuthUser> {
  if (!user.institution_id) return user;

  try {
    const institution = await dataService.findRow<Institution>(
      'institutions',
      user.institution_id,
    );
    return { ...user, institution };
  } catch {
    return user;
  }
}

async function login(email: string, password: string): Promise<AuthUser> {
  const session = await forgeAuth.login<ForgeRow>({
    email: email.trim().toLowerCase(),
    password,
  });

  if (session.user) {
    try {
      const user = normalizeAuthUser(session.user);
      // Le payload de login peut être partiel : on recharge le profil complet
      // lorsqu'un utilisateur non-plateforme n'a pas encore son institution.
      if (user.is_supra_admin || user.institution_id) {
        return await attachInstitution(user);
      }
    } catch {
      // Fall back to /auth/me when the login payload is incomplete.
    }
  }

  const profile = await forgeAuth.me<unknown>();
  return attachInstitution(normalizeAuthUser(profile));
}

async function restoreSession(): Promise<AuthUser | null> {
  if (!forgeTokenStorage.get()) return null;

  try {
    const profile = await forgeAuth.me<unknown>();
    return attachInstitution(normalizeAuthUser(profile));
  } catch (error) {
    forgeTokenStorage.clear();
    throw error;
  }
}

function logout(): void {
  forgeAuth.logout();
}

async function createAccount(input: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role?: Role;
  statut?: string;
  stagiaire_id?: string;
  institution_id?: string | null;
  is_supra_admin?: boolean;
  must_change_password?: boolean;
}): Promise<ForgeRow | undefined> {
  const currentToken = forgeTokenStorage.get();

  try {
    const session = await forgeAuth.signup<ForgeRow>({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      first_name: input.first_name,
      last_name: input.last_name,
      phone: input.phone?.trim() || null,
      role: input.role ?? 'stagiaire',
      statut: input.statut ?? 'active',
      stagiaire_id: input.stagiaire_id || null,
      institution_id: input.institution_id ?? null,
      is_supra_admin: input.is_supra_admin === true,
      must_change_password: input.must_change_password === true,
    });

    return session.user;
  } finally {
    if (currentToken) {
      forgeTokenStorage.set(currentToken);
    } else {
      forgeTokenStorage.clear();
    }
  }
}

export const authService = {
  login,
  restoreSession,
  logout,
  createAccount,
};
