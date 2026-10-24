import { ForgeApiError, forgeHttp } from './client';
import { asRecord, flattenForgeRow } from './row';
import { forgeTokenStorage } from './token-storage';
import type { ForgeCredentials, ForgeRow, ForgeSession } from './types';

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
        const user = source.user ?? source.me;
        return {
          token,
          user: (user ? flattenForgeRow(user) : undefined) as TUser | undefined,
        };
      }
    }
  }

  return null;
}

function toAuthPayload(credentials: ForgeCredentials): Record<string, unknown> {
  const { password, ...rest } = credentials;
  return { ...rest, password_hash: password };
}

async function login<TUser = ForgeRow>(credentials: ForgeCredentials): Promise<ForgeSession<TUser>> {
  const response = await forgeHttp.post<unknown>('/auth/login', toAuthPayload(credentials));
  const session = extractSession<TUser>(response.data);

  if (!session) {
    throw new ForgeApiError('Forge Console n’a pas renvoyé de jeton d’authentification.');
  }

  forgeTokenStorage.set(session.token);
  return session;
}

async function signup<TUser = ForgeRow>(credentials: ForgeCredentials): Promise<ForgeSession<TUser>> {
  const response = await forgeHttp.post<unknown>('/auth/signup', toAuthPayload(credentials));
  const session = extractSession<TUser>(response.data);

  if (!session) {
    throw new ForgeApiError('Forge Console n’a pas renvoyé de jeton d’authentification.');
  }

  forgeTokenStorage.set(session.token);
  return session;
}

async function me<TUser = ForgeRow>(): Promise<TUser> {
  const response = await forgeHttp.get<unknown>('/auth/me');
  return flattenForgeRow(response.data) as TUser;
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
