import { useCallback, useEffect, useMemo, useState } from 'react';
import { dataService } from '@/services/data.service';
import type { ForgeListFilter } from '@/services/forge/types';
import {
  getTenantId,
  isTenantColumnError,
  markTenantColumnMissing,
  withTenantScope,
} from '@/services/tenant';
import { getErrorMessage } from '@/utils/format';

type SqlTuple = Array<string | number | boolean | null>;

type UseScopedRowsOptions = {
  scope: Record<string, ForgeListFilter | null | undefined>;
  order?: string;
  limit?: number;
  enabled?: boolean;
};

function sqlLiteral(value: ForgeListFilter): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '0';
  return `'${value.replace(/'/g, "''")}'`;
}

function activeScope(scope: Record<string, ForgeListFilter | null | undefined>) {
  return Object.entries(scope).filter(
    (entry): entry is [string, ForgeListFilter] =>
      entry[1] !== undefined && entry[1] !== null && entry[1] !== '',
  );
}

function sortRows<T>(rows: T[], order?: string): T[] {
  const match = order?.match(/^([a-z_]+)\.(asc|desc)$/i);
  if (!match) return rows;

  const [, field, direction] = match;
  const factor = direction.toLowerCase() === 'asc' ? 1 : -1;

  return [...rows].sort((left, right) => {
    const leftValue = (left as Record<string, unknown>)[field];
    const rightValue = (right as Record<string, unknown>)[field];

    if (leftValue === rightValue) return 0;
    if (leftValue === null || leftValue === undefined) return 1;
    if (rightValue === null || rightValue === undefined) return -1;

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return (leftValue - rightValue) * factor;
    }

    return String(leftValue).localeCompare(String(rightValue)) * factor;
  });
}

export function useScopedRows<T extends { id: string }>(
  table: string,
  options: UseScopedRowsOptions,
) {
  const { scope, order, limit = 200, enabled = true } = options;
  const tenantId = getTenantId();
  const scopeKey = useMemo(() => JSON.stringify(scope), [scope]);
  const stableScope = useMemo(
    () => withTenantScope(table, scope),
    // The tenant id is intentionally part of the key so the query re-runs
    // when a platform administrator switches institution.
    [table, scopeKey, tenantId],
  );
  const entries = useMemo(() => activeScope(stableScope), [stableScope]);
  const usable = enabled && entries.length > 0;
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(usable);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!usable) {
      setRows([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    const buildWhere = (scopeEntries: typeof entries) =>
      scopeEntries
        .map(([column, value]) => `${column} = ${sqlLiteral(value)}`)
        .join(' and ');

    const runQuery = (scopeEntries: typeof entries) => {
      const where = buildWhere(scopeEntries);
      const query = where
        ? ['select id from', table, 'where', where, 'limit', '200'].join(' ')
        : ['select id from', table, 'limit', '200'].join(' ');
      return dataService.sql<SqlTuple>(query);
    };

    runQuery(entries)
      .catch((requestError) => {
        if (!isTenantColumnError(requestError)) throw requestError;
        markTenantColumnMissing();
        return runQuery(entries.filter(([column]) => column !== 'institution_id'));
      })
      .then(async (response) => {
        const ids = (response.rows ?? [])
          .map((row) => String(row[0] ?? ''))
          .filter(Boolean);

        if (ids.length === 0) return [];

        return Promise.all(ids.map((id) => dataService.findRow<T>(table, id)));
      })
      .then((result) => {
        if (!active) return;
        const ordered = sortRows(result, order);
        setRows(ordered.slice(0, Math.min(Math.max(limit, 1), 200)));
      })
      .catch((requestError) => {
        if (!active) return;
        setRows([]);
        setError(getErrorMessage(requestError, 'Chargement sécurisé impossible.'));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [table, entries, order, limit, usable, revision]);

  const reload = useCallback(() => setRevision((value) => value + 1), []);

  return { rows, loading, error, reload, setRows };
}
