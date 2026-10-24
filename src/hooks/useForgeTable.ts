import { useCallback, useEffect, useMemo, useState } from 'react';
import { dataService } from '@/services/data.service';
import { getErrorMessage } from '@/utils/format';
import type { ForgeListFilter, ForgeListParams } from '@/services/forge/types';

type UseForgeTableOptions = {
  filters?: Record<string, ForgeListFilter | null | undefined>;
  order?: string;
  limit?: number;
  enabled?: boolean;
};

export function useForgeTable<T extends { id: string }>(
  table: string,
  options: UseForgeTableOptions = {},
) {
  const { filters, order, limit = 200, enabled = true } = options;
  const filterKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);
  const stableFilters = useMemo(() => filters ?? {}, [filterKey]);
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!enabled) {
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

    dataService
      .listRows<T>(table, params)
      .then((result) => {
        if (!active) return;
        setRows(result);
      })
      .catch((requestError) => {
        if (!active) return;
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
  }, [table, limit, order, filterKey, enabled, revision, stableFilters]);

  const reload = useCallback(() => setRevision((value) => value + 1), []);

  return { rows, loading, error, reload, setRows };
}
