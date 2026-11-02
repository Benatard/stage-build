type CacheEntry = {
  rows: unknown[];
  timestamp: number;
};

const CACHE_TTL = 30_000;
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown[]>>();
let generation = 0;

export function peekScopedRows<T>(key: string): T[] | null {
  const entry = cache.get(key);
  return entry ? (entry.rows as T[]) : null;
}

export function loadScopedRows<T>(
  key: string,
  fetcher: () => Promise<T[]>,
  force = false,
): Promise<T[]> {
  if (!force) {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return Promise.resolve(entry.rows as T[]);
    }
  }

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T[]>;

  const requestGeneration = generation;
  let request: Promise<T[]>;

  request = fetcher()
    .then((rows) => {
      if (requestGeneration === generation) {
        cache.set(key, { rows, timestamp: Date.now() });
      }
      return rows;
    })
    .finally(() => {
      if (inflight.get(key) === request) {
        inflight.delete(key);
      }
    });

  inflight.set(key, request as Promise<unknown[]>);
  return request;
}

export function invalidateScopedRowsCache(): void {
  generation += 1;
  cache.clear();
  inflight.clear();
}
