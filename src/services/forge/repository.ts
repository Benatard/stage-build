import { ForgeApiError, forgeHttp } from './client';
import { asRecord, flattenForgeRow, flattenForgeRows } from './row';
import type {
  ForgeGraphQLResponse,
  ForgeId,
  ForgeListParams,
  ForgeListResult,
  ForgeSqlResponse,
} from './types';

const LIST_PAGE_SIZE = 200;
const LIST_MAX_PAGES = 50;

function cleanListParams(params: ForgeListParams = {}): Record<string, string | number | boolean> {
  const output: Record<string, string | number | boolean> = {};

  if (params.limit !== undefined) output.limit = Math.min(Math.max(params.limit, 1), LIST_PAGE_SIZE);
  if (params.offset !== undefined) output.offset = params.offset;
  if (params.order !== undefined) output.order = params.order;

  for (const [key, value] of Object.entries(params.filters ?? {})) {
    if (value !== undefined && value !== null) output[key] = value;
  }

  return output;
}

function activeFilters(params: ForgeListParams): [string, string | number | boolean][] {
  return Object.entries(params.filters ?? {}).filter(
    (entry): entry is [string, string | number | boolean] =>
      entry[1] !== undefined && entry[1] !== null,
  );
}

function matchesFilter(value: unknown, expected: string | number | boolean): boolean {
  if (value === undefined || value === null) return false;
  if (typeof expected === 'boolean') {
    if (typeof value === 'boolean') return value === expected;
    return String(value).toLowerCase() === String(expected);
  }
  return String(value) === String(expected);
}

async function listAllRows<T>(
  table: string,
  order: string | undefined,
): Promise<T[]> {
  const rows: T[] = [];

  for (let page = 0; page < LIST_MAX_PAGES; page += 1) {
    const response = await forgeHttp.get<unknown>(`/${table}`, {
      params: {
        limit: LIST_PAGE_SIZE,
        offset: page * LIST_PAGE_SIZE,
        ...(order !== undefined ? { order } : {}),
      },
    });
    const batch = normalizeList<T>(response.data).rows;
    rows.push(...batch);

    if (batch.length < LIST_PAGE_SIZE) break;
  }

  return rows;
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
  const filters = activeFilters(params);

  if (filters.length === 0) {
    const response = await forgeHttp.get<unknown>(`/${table}`, {
      params: cleanListParams(params),
    });
    return normalizeList<T>(response.data);
  }

  const rows = (await listAllRows<T>(table, params.order)).filter((row) =>
    filters.every(([key, value]) => matchesFilter((row as Record<string, unknown>)[key], value)),
  );
  const offset = Math.max(params.offset ?? 0, 0);
  const limit = params.limit !== undefined ? Math.min(Math.max(params.limit, 1), LIST_PAGE_SIZE) : undefined;

  return {
    rows: limit === undefined ? rows.slice(offset) : rows.slice(offset, offset + limit),
    total: rows.length,
  };
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

function ping(): Promise<ForgeSqlResponse<Record<string, unknown>>> {
  return sql<Record<string, unknown>>('SELECT count(*) FROM users');
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
