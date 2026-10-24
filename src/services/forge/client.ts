import axios from 'axios';
import { forgeConfig } from '@/config/env';
import { forgeTokenStorage } from './token-storage';

export class ForgeApiError extends Error {
  readonly status?: number;
  readonly details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'ForgeApiError';
    this.status = status;
    this.details = details;
  }
}

function readErrorMessage(payload: unknown): string | null {
  if (typeof payload === 'string' && payload.trim()) return payload;

  if (payload && typeof payload === 'object') {
    const data = payload as Record<string, unknown>;
    for (const key of ['message', 'error', 'detail']) {
      const value = data[key];
      if (typeof value === 'string' && value.trim()) return value;
      if (value && typeof value === 'object') {
        const nested = value as Record<string, unknown>;
        if (typeof nested.message === 'string' && nested.message.trim()) return nested.message;
      }
    }
  }

  return null;
}

const baseURL = forgeConfig.projectKey
  ? `${forgeConfig.apiUrl}/${forgeConfig.projectKey}`
  : forgeConfig.apiUrl;

export const forgeHttp = axios.create({
  baseURL,
  timeout: 20_000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

forgeHttp.interceptors.request.use((config) => {
  if (forgeConfig.apiKey) {
    config.headers.set('x-api-key', forgeConfig.apiKey);
  }

  const token = forgeTokenStorage.get();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  return config;
});

forgeHttp.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const payload = error.response?.data;
      const message =
        readErrorMessage(payload) ||
        error.message ||
        'Une erreur inattendue est survenue lors de la communication avec Forge Console.';

      return Promise.reject(new ForgeApiError(message, error.response?.status, payload));
    }

    return Promise.reject(error);
  },
);
