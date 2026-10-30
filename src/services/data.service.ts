import { isForgeConfigured } from '@/config/env';
import { forgeRepository } from '@/services/forge';
import type { ForgeListParams, ForgeSqlResponse } from '@/services/forge/types';
import {
  assertRowInTenant,
  getTenantId,
  isTenantColumnError,
  markTenantColumnMissing,
  shouldScopeTable,
  withTenantFilter,
  withTenantPayload,
} from '@/services/tenant';

const PAGE_SIZE = 200;
const MAX_PAGES = 20;

export function ensureForgeConfigured(): void {
  if (!isForgeConfigured) {
    throw new Error(
      'Forge Console n’est pas configuré. Renseignez VITE_FORGE_PROJECT_KEY et VITE_FORGE_API_KEY dans .env.local.',
    );
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function unwrapRow<T>(payload: unknown): T {
  const record = asRecord(payload);

  if (record) {
    for (const key of ['data', 'row', 'item', 'result']) {
      const candidate = record[key];
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
        return candidate as T;
      }
    }
  }

  return payload as T;
}

async function listRows<T extends { id: string }>(
  table: string,
  params: ForgeListParams = {},
): Promise<T[]> {
  ensureForgeConfigured();
  const scopedParams = withTenantFilter(table, params);

  try {
    const result = await forgeRepository.list<T>(table, scopedParams);
    return result.rows;
  } catch (error) {
    if (scopedParams !== params && isTenantColumnError(error)) {
      markTenantColumnMissing();
      const fallback = await forgeRepository.list<T>(table, params);
      return fallback.rows;
    }
    throw error;
  }
}

async function listAll<T extends { id: string }>(
  table: string,
  params: Omit<ForgeListParams, 'limit' | 'offset'> = {},
): Promise<T[]> {
  const rows: T[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const batch = await listRows<T>(table, {
      ...params,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    });

    rows.push(...batch);

    if (batch.length < PAGE_SIZE) break;
  }

  return rows;
}

async function findRow<T extends { id: string }>(table: string, id: string): Promise<T> {
  ensureForgeConfigured();
  const payload = await forgeRepository.find<Record<string, unknown>>(table, id);
  const row = unwrapRow<T>(payload);
  assertRowInTenant(table, row as unknown as Record<string, unknown>);
  return row;
}

async function createRow<T extends { id: string }>(
  table: string,
  data: Record<string, unknown>,
): Promise<T> {
  ensureForgeConfigured();
  const scopedData = withTenantPayload(table, data);

  try {
    const payload = await forgeRepository.create<Record<string, unknown>>(table, scopedData);
    return unwrapRow<T>(payload);
  } catch (error) {
    if (scopedData !== data && isTenantColumnError(error)) {
      markTenantColumnMissing();
      const payload = await forgeRepository.create<Record<string, unknown>>(table, data);
      return unwrapRow<T>(payload);
    }
    throw error;
  }
}

async function updateRow<T extends { id: string }>(
  table: string,
  id: string,
  data: Record<string, unknown>,
): Promise<T> {
  ensureForgeConfigured();

  if ('institution_id' in data && shouldScopeTable(table)) {
    const tenantId = getTenantId();
    if (data.institution_id && data.institution_id !== tenantId) {
      throw new Error(
        'Le rattachement à une institution ne peut pas être modifié depuis le client.',
      );
    }
  }

  const current = await findRow<T>(table, id);
  assertRowInTenant(table, current as unknown as Record<string, unknown>);

  const payloadData = { ...data };
  delete payloadData.institution_id;

  const payload = await forgeRepository.update<Record<string, unknown>>(
    table,
    id,
    payloadData,
  );
  return unwrapRow<T>(payload);
}

async function deleteRow(table: string, id: string): Promise<void> {
  ensureForgeConfigured();
  const current = await findRow<{ id: string }>(table, id);
  assertRowInTenant(table, current as unknown as Record<string, unknown>);
  await forgeRepository.remove(table, id);
}

async function sql<T = Record<string, unknown>>(query: string): Promise<ForgeSqlResponse<T>> {
  ensureForgeConfigured();
  return forgeRepository.sql<T>(query);
}

export const dataService = {
  listRows,
  listAll,
  findRow,
  createRow,
  updateRow,
  deleteRow,
  sql,
};
