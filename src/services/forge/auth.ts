import { ForgeApiError, forgeHttp } from './client';
import { forgeTokenStorage } from './token-storage';
import type { ForgeCredentials, ForgeRow, ForgeSession } from './types';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function extractSession<TUser>(payload: unknown): ForgeSession<TUser> | null {
  const record = asRecord(payload);
  if (!record) return null;

  const sources = [record];
  const nested = asRecord(record.data);
  if (nested) sources.push(nested);

  for (const source of sources) {
    for (const key of ['token', 'accessToken', 'access_token', 'jwt']) {
      const token = source[key];
      if (typeof token === 'string' && token.trim()) {
        return { token, user: (source.user ?? source.me) as TUser | undefined };
      }
    }
  }

  return null;
}

async function login<TUser = ForgeRow>(credentials: ForgeCredentials): Promise<ForgeSession<TUser>> {
  const response = await forgeHttp.post<unknown>('/auth/login', credentials);
  const session = extractSession<TUser>(response.data);

  if (!session) {
    throw new ForgeApiError('Forge Console n’a pas renvoyé de jeton d’authentification.');
  }

  forgeTokenStorage.set(session.token);
  return session;
}

async function signup<TUser = ForgeRow>(credentials: ForgeCredentials): Promise<ForgeSession<TUser>> {
  const response = await forgeHttp.post<unknown>('/auth/signup', credentials);
  const session = extractSession<TUser>(response.data);

  if (!session) {
    throw new ForgeApiError('Forge Console n’a pas renvoyé de jeton d’authentification.');
  }

  forgeTokenStorage.set(session.token);
  return session;
}

async function me<TUser = ForgeRow>(): Promise<TUser> {
  const response = await forgeHttp.get<TUser>('/auth/me');
  return response.data;
}

function logout(): void {
  forgeTokenStorage.clear();
}

export const forgeAuth = {
  login,
  signup,
  me,
  logout,
};
