import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dataService } from '@/services/data.service';
import type { ForgeListFilter, ForgeSqlResponse } from '@/services/forge/types';
import { loadScopedRows, peekScopedRows } from '@/services/scoped-cache';
import {
  getTenantId,
  isTenantColumnError,
  markTenantColumnMissing,
  withTenantScope,
} from '@/services/tenant';
import { getErrorMessage } from '@/utils/format';

type SqlLiteralValue = string | number | boolean | null;
type SqlRow = SqlLiteralValue[] | Record<string, unknown>;

type UseScopedRowsOptions = {
  scope: Record<string, ForgeListFilter | null | undefined>;
  order?: string;
  limit?: number;
  enabled?: boolean;
  autoRefreshMs?: number;
};

const DEFAULT_AUTO_REFRESH_MS = 30_000;

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

function buildWhere(scopeEntries: [string, ForgeListFilter][]): string {
  return scopeEntries
    .map(([column, value]) => `${column} = ${sqlLiteral(value)}`)
    .join(' AND ');
}

function buildQuery(table: string, scopeEntries: [string, ForgeListFilter][]): string {
  const where = buildWhere(scopeEntries);
  return where
    ? ['select * from', table, 'where', where, 'limit', '200'].join(' ')
    : ['select * from', table, 'limit', '200'].join(' ');
}

function toRows<T>(response: ForgeSqlResponse<SqlRow>): T[] {
  const columns = (response as { columns?: unknown }).columns;
  const rows = Array.isArray(response.rows)
    ? response.rows
    : Array.isArray(response.data)
      ? response.data
      : [];

  if (!Array.isArray(columns)) return rows as T[];

  return rows.map((row) => {
    if (!Array.isArray(row)) return row as T;

    const record: Record<string, unknown> = {};
    columns.forEach((column, index) => {
      record[String(column)] = row[index];
    });
    return record as T;
  });
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
  const { scope, order, limit = 200, enabled = true, autoRefreshMs = DEFAULT_AUTO_REFRESH_MS } =
    options;
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
  const query = useMemo(
    () => (usable ? buildQuery(table, entries) : null),
    [usable, table, entries],
  );
  const requestKey = useMemo(
    () => (query ? `${query}|${order ?? ''}|${limit}` : null),
    [query, order, limit],
  );
  const initialRows = useMemo(
    () => (requestKey ? peekScopedRows<T>(requestKey) : null),
    [requestKey],
  );
  const [rows, setRows] = useState<T[]>(initialRows ?? []);
  const [loading, setLoading] = useState(Boolean(requestKey) && !initialRows);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const signatureRef = useRef(JSON.stringify(rows));
  const queryRef = useRef<string | null>(null);
  const loadedRevisionRef = useRef(revision);

  useEffect(() => {
    if (!usable || !query || !requestKey) {
      queryRef.current = null;
      loadedRevisionRef.current = revision;
      signatureRef.current = '[]';
      setRows([]);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    const keyChanged = queryRef.current !== requestKey;
    queryRef.current = requestKey;

    const cached = peekScopedRows<T>(requestKey);

    if (keyChanged) {
      signatureRef.current = JSON.stringify(cached ?? []);
      setRows(cached ?? []);
      setLoading(!cached);
    } else if (!cached) {
      setLoading(rowsRef.current.length === 0);
    }

    setError(null);

    const force = loadedRevisionRef.current !== revision;

    const runQuery = (sql: string) =>
      dataService.sql<SqlRow>(sql).then((response) => toRows<T>(response));

    const fetchRows = async () => {
      const result = await (async () => {
        try {
          return await runQuery(query);
        } catch (requestError) {
          if (!isTenantColumnError(requestError)) throw requestError;
          markTenantColumnMissing();
          return runQuery(
            buildQuery(
              table,
              entries.filter(([column]) => column !== 'institution_id'),
            ),
          );
        }
      })();

      return sortRows(result, order).slice(0, Math.min(Math.max(limit, 1), 200));
    };

    loadScopedRows<T>(requestKey, fetchRows, force)
      .then((result) => {
        if (!active) return;
        loadedRevisionRef.current = revision;
        const signature = JSON.stringify(result);
        if (signature !== signatureRef.current) {
          signatureRef.current = signature;
          setRows(result);
        }
      })
      .catch((requestError) => {
        if (!active) return;
        signatureRef.current = '[]';
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
  }, [table, entries, order, limit, usable, query, requestKey, revision]);

  useEffect(() => {
    if (!usable || autoRefreshMs <= 0) return;

    const refresh = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      setRevision((value) => value + 1);
    };

    const interval = window.setInterval(refresh, autoRefreshMs);

    const handleFocus = () => refresh();
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refresh();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [usable, autoRefreshMs]);

  const reload = useCallback(() => setRevision((value) => value + 1), []);

  return { rows, loading, error, reload, setRows };
}
