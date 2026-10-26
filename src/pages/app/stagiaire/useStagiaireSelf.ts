import { useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useScopedRows } from '@/hooks/useScopedRows';
import type {
  Evaluation,
  Formation,
  Inscription,
  Module,
  Promotion,
  Seance,
  Stagiaire,
} from '@/types/domain';

export function useStagiaireSelf() {
  const { user } = useAuth();

  const stagiaireScope = useMemo(
    () =>
      user?.stagiaire_id
        ? { id: user.stagiaire_id }
        : { email: user?.email ?? '' },
    [user?.stagiaire_id, user?.email],
  );

  const {
    rows: stagiaires,
    loading: stagiaireLoading,
    error: stagiaireError,
    reload: reloadStagiaire,
  } = useScopedRows<Stagiaire>('stagiaires', {
    scope: stagiaireScope,
    limit: 1,
  });

  const stagiaire = stagiaires[0] ?? null;

  const {
    rows: inscriptions,
    loading: inscriptionLoading,
    error: inscriptionError,
    reload: reloadInscriptions,
  } = useScopedRows<Inscription>('inscriptions', {
    scope: { stagiaire_id: stagiaire?.id ?? '' },
    order: 'created_at.desc',
    enabled: Boolean(stagiaire?.id),
  });

  const inscription = useMemo(() => {
    const active = inscriptions.find((item) => item.status === 'validee');
    return active ?? inscriptions.find((item) => item.status !== 'annulee') ?? inscriptions[0] ?? null;
  }, [inscriptions]);

  const reload = useCallback(() => {
    reloadStagiaire();
    reloadInscriptions();
  }, [reloadStagiaire, reloadInscriptions]);

  const error =
    stagiaireError ??
    inscriptionError ??
    (!stagiaireLoading && !stagiaire
      ? 'Aucun dossier stagiaire n’est rattaché à ce compte. Contactez l’administration.'
      : null);

  return {
    user,
    stagiaire,
    inscriptions,
    inscription,
    stagiaireId: stagiaire?.id ?? '',
    formationId: inscription?.formation_id ?? '',
    promotionId: inscription?.promotion_id ?? '',
    loading: stagiaireLoading || inscriptionLoading,
    error,
    reload,
  };
}

export function useSelfAcademic() {
  const self = useStagiaireSelf();
  const formationId = self.formationId;
  const promotionId = self.promotionId;

  const {
    rows: formations,
    loading: formationLoading,
    error: formationError,
    reload: reloadFormation,
  } = useScopedRows<Formation>('formations', {
    scope: { id: formationId },
    limit: 1,
    enabled: Boolean(formationId),
  });

  const {
    rows: promotions,
    loading: promotionLoading,
    error: promotionError,
    reload: reloadPromotion,
  } = useScopedRows<Promotion>('promotions', {
    scope: { id: promotionId },
    limit: 1,
    enabled: Boolean(promotionId),
  });

  const {
    rows: modules,
    loading: modulesLoading,
    error: modulesError,
    reload: reloadModules,
  } = useScopedRows<Module>('modules', {
    scope: { formation_id: formationId },
    order: 'sort_order.asc',
    enabled: Boolean(formationId),
  });

  const {
    rows: evaluations,
    loading: evaluationsLoading,
    error: evaluationsError,
    reload: reloadEvaluations,
  } = useScopedRows<Evaluation>('evaluations', {
    scope: { formation_id: formationId },
    order: 'date.desc',
    enabled: Boolean(formationId),
  });

  const {
    rows: seances,
    loading: seancesLoading,
    error: seancesError,
    reload: seancesReload,
  } = useScopedRows<Seance>('seances', {
    scope: { promotion_id: promotionId },
    order: 'date.asc',
    enabled: Boolean(promotionId),
  });

  const reload = useCallback(() => {
    self.reload();
    reloadFormation();
    reloadPromotion();
    reloadModules();
    reloadEvaluations();
    seancesReload();
  }, [self, reloadFormation, reloadPromotion, reloadModules, reloadEvaluations, seancesReload]);

  return {
    ...self,
    formation: formations[0] ?? null,
    promotion: promotions[0] ?? null,
    modules,
    evaluations,
    seances,
    loading:
      self.loading ||
      formationLoading ||
      promotionLoading ||
      modulesLoading ||
      evaluationsLoading ||
      seancesLoading,
    error:
      self.error ??
      formationError ??
      promotionError ??
      modulesError ??
      evaluationsError ??
      seancesError,
    reload,
  };
}
