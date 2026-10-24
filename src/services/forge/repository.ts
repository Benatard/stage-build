import { ForgeApiError, forgeHttp } from './client';
import { asRecord, flattenForgeRow, flattenForgeRows } from './row';
import type {
  ForgeGraphQLResponse,
  ForgeId,
  ForgeListParams,
  ForgeListResult,
  ForgeSqlResponse,
} from './types';

function cleanListParams(params: ForgeListParams = {}): Record<string, string | number | boolean> {
  const output: Record<string, string | number | boolean> = {};

  if (params.limit !== undefined) output.limit = Math.min(Math.max(params.limit, 1), 200);
  if (params.offset !== undefined) output.offset = params.offset;
  if (params.order !== undefined) output.order = params.order;

  for (const [key, value] of Object.entries(params.filters ?? {})) {
    if (value !== undefined && value !== null) output[key] = value;
  }

  return output;
}

function normalizeList<T>(payload: unknown): ForgeListResult<T> {
  if (Array.isArray(payload)) {
    return { rows: flattenForgeRows(payload) as T[] };
  }

  const record = asRecord(payload);
  if (!record) {
    return { rows: [] };
  }

  const pagination = asRecord(record.pagination);
  const totalValue = pagination?.total ?? record.total ?? record.count;
  const total = typeof totalValue === 'number' ? totalValue : undefined;

  for (const key of ['data', 'rows', 'items', 'results']) {
    const candidate = record[key];
    if (Array.isArray(candidate)) {
      return { rows: flattenForgeRows(candidate) as T[], total };
    }

    const nested = asRecord(candidate);
    if (nested) {
      for (const nestedKey of ['rows', 'items', 'results']) {
        const nestedCandidate = nested[nestedKey];
        if (Array.isArray(nestedCandidate)) {
          return { rows: flattenForgeRows(nestedCandidate) as T[], total };
        }
      }
    }
  }

  return { rows: [], total };
}

async function list<T extends object>(
  table: string,
  params: ForgeListParams = {},
): Promise<ForgeListResult<T>> {
  const response = await forgeHttp.get<unknown>(`/${table}`, {
    params: cleanListParams(params),
  });
  return normalizeList<T>(response.data);
}

async function find<T extends object>(table: string, id: ForgeId): Promise<T> {
  const response = await forgeHttp.get<unknown>(`/${table}/${id}`);
  return flattenForgeRow(response.data) as T;
}

async function create<T extends object>(
  table: string,
  data: Record<string, unknown>,
): Promise<T> {
  const response = await forgeHttp.post<unknown>(`/${table}`, data);
  return flattenForgeRow(response.data) as T;
}

async function update<T extends object>(
  table: string,
  id: ForgeId,
  data: Record<string, unknown>,
): Promise<T> {
  const response = await forgeHttp.patch<unknown>(`/${table}/${id}`, data);
  return flattenForgeRow(response.data) as T;
}

async function remove(table: string, id: ForgeId): Promise<void> {
  await forgeHttp.delete(`/${table}/${id}`);
}

async function graphql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await forgeHttp.post<ForgeGraphQLResponse<T>>('/graphql', {
    query,
    variables,
  });

  if (response.data.errors?.length) {
    throw new ForgeApiError(response.data.errors.map((error) => error.message).join('; '));
  }

  if (response.data.data === undefined) {
    throw new ForgeApiError('Réponse GraphQL vide.');
  }

  return response.data.data;
}

async function sql<T = Record<string, unknown>>(query: string): Promise<ForgeSqlResponse<T>> {
  const response = await forgeHttp.post<ForgeSqlResponse<T>>('/sql', { sql: query });
  return response.data;
}

function ping(): Promise<ForgeSqlResponse<{ ok: number }>> {
  return sql<{ ok: number }>('select 1 as ok');
}

export const forgeRepository = {
  list,
  find,
  create,
  update,
  remove,
  graphql,
  sql,
  ping,
};
