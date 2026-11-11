import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dataService } from '@/services/data.service';
import { getErrorMessage } from '@/utils/format';
import type { ForgeListFilter, ForgeListParams } from '@/services/forge/types';

type UseForgeTableOptions = {
  filters?: Record<string, ForgeListFilter | null | undefined>;
  order?: string;
  limit?: number;
  enabled?: boolean;
  all?: boolean;
  autoRefreshMs?: number;
};

const DEFAULT_AUTO_REFRESH_MS = 30_000;

export function useForgeTable<T extends { id: string }>(
  table: string,
  options: UseForgeTableOptions = {},
) {
  const {
    filters,
    order,
    limit = 200,
    enabled = true,
    all = false,
    autoRefreshMs = DEFAULT_AUTO_REFRESH_MS,
  } = options;
  const filterKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);
  const stableFilters = useMemo(() => filters ?? {}, [filterKey]);
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const signatureRef = useRef<string>('[]');

  const applyRows = useCallback((next: T[]) => {
    const signature = JSON.stringify(next);
    if (signature === signatureRef.current) return;
    signatureRef.current = signature;
    setRows(next);
  }, []);

  useEffect(() => {
    if (!enabled) {
      signatureRef.current = '[]';
      setRows([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    const params: ForgeListParams = {
      limit,
      order,
      filters: stableFilters,
    };

    const request = all
      ? dataService.listAll<T>(table, { order, filters: stableFilters })
      : dataService.listRows<T>(table, params);

    request
      .then((result) => {
        if (!active) return;
        applyRows(result);
      })
      .catch((requestError) => {
        if (!active) return;
        signatureRef.current = '[]';
        setRows([]);
        setError(getErrorMessage(requestError, 'Chargement impossible.'));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [table, limit, order, filterKey, enabled, all, revision, stableFilters, applyRows]);

  useEffect(() => {
    if (!enabled || autoRefreshMs <= 0) return;

    let active = true;
    let running = false;

    const refresh = async () => {
      if (!active || running) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

      running = true;

      try {
        const params: ForgeListParams = {
          limit,
          order,
          filters: stableFilters,
        };

        const result = all
          ? await dataService.listAll<T>(table, { order, filters: stableFilters })
          : await dataService.listRows<T>(table, params);

        if (!active) return;
        applyRows(result);
        setError(null);
      } catch (requestError) {
        if (!active) return;
        if (rowsRef.current.length === 0) {
          setError(getErrorMessage(requestError, 'Chargement impossible.'));
        }
      } finally {
        running = false;
      }
    };

    const interval = window.setInterval(() => void refresh(), autoRefreshMs);

    const handleFocus = () => void refresh();
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void refresh();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [table, limit, order, filterKey, enabled, all, autoRefreshMs, stableFilters, applyRows]);

  const reload = useCallback(() => setRevision((value) => value + 1), []);

  return { rows, loading, error, reload, setRows };
}
