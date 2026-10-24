import { useCallback, useEffect, useState } from 'react';
import { dataService } from '@/services/data.service';
import { getErrorMessage } from '@/utils/format';
import type {
  Competence,
  Evaluation,
  Formation,
  Inscription,
  Module,
  Promotion,
  Seance,
  Stagiaire,
  User,
} from '@/types/domain';

export type ReferenceData = {
  stagiaires: Stagiaire[];
  formations: Formation[];
  modules: Module[];
  promotions: Promotion[];
  users: User[];
  competences: Competence[];
  evaluations: Evaluation[];
  inscriptions: Inscription[];
  seances: Seance[];
};

const emptyData: ReferenceData = {
  stagiaires: [],
  formations: [],
  modules: [],
  promotions: [],
  users: [],
  competences: [],
  evaluations: [],
  inscriptions: [],
  seances: [],
};

let cache: ReferenceData | null = null;
let cacheTimestamp = 0;
let inflight: Promise<ReferenceData> | null = null;
const CACHE_TTL = 60_000;

async function safeList<T extends { id: string }>(request: Promise<T[]>): Promise<T[]> {
  try {
    return await request;
  } catch {
    return [];
  }
}

async function fetchAll(): Promise<ReferenceData> {
  const [
    stagiaires,
    formations,
    modules,
    promotions,
    users,
    competences,
    evaluations,
    inscriptions,
    seances,
  ] = await Promise.all([
    safeList(dataService.listAll<Stagiaire>('stagiaires', { order: 'nom.asc' })),
    safeList(dataService.listAll<Formation>('formations', { order: 'name.asc' })),
    safeList(dataService.listAll<Module>('modules', { order: 'sort_order.asc' })),
    safeList(dataService.listAll<Promotion>('promotions', { order: 'start_date.desc' })),
    safeList(dataService.listAll<User>('users', { order: 'last_name.asc' })),
    safeList(dataService.listAll<Competence>('competences', { order: 'sort_order.asc' })),
    safeList(dataService.listAll<Evaluation>('evaluations', { order: 'date.desc' })),
    safeList(dataService.listAll<Inscription>('inscriptions', { order: 'created_at.desc' })),
    safeList(dataService.listAll<Seance>('seances', { order: 'date.desc' })),
  ]);

  return {
    stagiaires,
    formations,
    modules,
    promotions,
    users,
    competences,
    evaluations,
    inscriptions,
    seances,
  };
}

export async function loadReferenceData(force = false): Promise<ReferenceData> {
  const fresh = Date.now() - cacheTimestamp < CACHE_TTL;

  if (!force && cache && fresh) return cache;
  if (inflight) return inflight;

  inflight = fetchAll()
    .then((data) => {
      cache = data;
      cacheTimestamp = Date.now();
      return data;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function invalidateReferenceData(): void {
  cache = null;
  cacheTimestamp = 0;
}

export function useReferenceData() {
  const [data, setData] = useState<ReferenceData>(cache ?? emptyData);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (force = true) => {
    setLoading(true);
    setError(null);

    try {
      const result = await loadReferenceData(force);
      setData(result);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Référentiels indisponibles.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    setLoading(!cache);
    loadReferenceData()
      .then((result) => {
        if (!active) return;
        setData(result);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(getErrorMessage(requestError, 'Référentiels indisponibles.'));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { data, loading, error, refresh };
}
