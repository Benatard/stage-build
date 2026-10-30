import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FiActivity,
  FiArrowRight,
  FiBriefcase,
  FiCheckCircle,
  FiCreditCard,
  FiLayers,
  FiSettings,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { PageHeader, StatCard } from '@/components/ui/Feedback';
import { INSTITUTION_STATUS_OPTIONS, SUBSCRIPTION_STATUS_OPTIONS, optionLabel } from '@/config/options';
import { useAuth } from '@/context/AuthContext';
import { useForgeTable } from '@/hooks/useForgeTable';
import type {
  Institution,
  InstitutionSubscription,
  SaasPlan,
  Stagiaire,
  User,
} from '@/types/domain';
import { formatDate, fullName } from '@/utils/format';

export default function PlatformDashboardPage() {
  const { user } = useAuth();
  const { rows: institutions } = useForgeTable<Institution>('institutions', {
    order: 'name.asc',
    limit: 500,
  });
  const { rows: users } = useForgeTable<User>('users', { limit: 500 });
  const { rows: stagiaires } = useForgeTable<Stagiaire>('stagiaires', { limit: 500 });
  const { rows: plans } = useForgeTable<SaasPlan>('saas_plans', {
    order: 'sort_order.asc',
    limit: 100,
  });
  const { rows: subscriptions } = useForgeTable<InstitutionSubscription>(
    'institution_subscriptions',
    { limit: 500 },
  );

  const stats = useMemo(() => {
    const active = institutions.filter((institution) => institution.status === 'active').length;
    const trial = institutions.filter((institution) => institution.status === 'essai').length;
    const suspended = institutions.filter(
      (institution) => institution.status === 'suspendue',
    ).length;
    const activeSubscriptions = subscriptions.filter(
      (subscription) => subscription.status === 'active',
    ).length;
    const trialSubscriptions = subscriptions.filter(
      (subscription) => subscription.status === 'trialing',
    ).length;

    return {
      active,
      trial,
      suspended,
      activeSubscriptions,
      trialSubscriptions,
      activePlans: plans.filter((plan) => plan.is_active).length,
    };
  }, [institutions, plans, subscriptions]);

  const recentInstitutions = useMemo(
    () =>
      [...institutions]
        .sort((left, right) => (right.created_at ?? '').localeCompare(left.created_at ?? ''))
        .slice(0, 5),
    [institutions],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Console plateforme"
        title={`Plateforme StageBuild`}
        description={`Bienvenue ${fullName(user)}. Pilotez les institutions, les abonnements et les paramètres globaux de la plateforme.`}
        actions={
          <Link
            to="/app/plateforme/institutions"
            className="inline-flex items-center gap-2 bg-primary px-5 py-2.5 text-sm font-semibold text-white"
          >
            Gérer les institutions <FiArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Institutions"
          value={institutions.length}
          hint={`${stats.active} active(s) · ${stats.trial} en essai`}
          tone="primary"
          icon={<FiBriefcase className="h-4 w-4" />}
        />
        <StatCard
          label="Comptes utilisateurs"
          value={users.length}
          hint={`${stagiaires.length} dossier(s) stagiaire`}
          tone="purple"
          icon={<FiUsers className="h-4 w-4" />}
        />
        <StatCard
          label="Abonnements actifs"
          value={stats.activeSubscriptions}
          hint={`${stats.trialSubscriptions} en essai`}
          tone="success"
          icon={<FiCheckCircle className="h-4 w-4" />}
        />
        <StatCard
          label="Offres disponibles"
          value={stats.activePlans}
          hint={`${plans.length} offre(s) configurée(s)`}
          tone="warning"
          icon={<FiLayers className="h-4 w-4" />}
        />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="card-root border border-stroke p-5 dark:border-white/10">
          <h2 className="mb-4 text-sm font-bold text-black dark:text-white">Accès rapides</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: 'Institutions', path: '/app/plateforme/institutions', icon: FiBriefcase },
              { label: 'Plans & abonnements', path: '/app/plateforme/plans', icon: FiCreditCard },
              { label: 'Paramètres plateforme', path: '/app/plateforme/parametres', icon: FiSettings },
              { label: 'Utilisateurs globaux', path: '/app/utilisateurs', icon: FiUsers },
              { label: 'Audit', path: '/app/audit', icon: FiActivity },
              { label: 'Rapports', path: '/app/rapports', icon: FiTrendingUp },
            ].map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="flex items-center gap-3 border border-stroke px-3 py-3 text-xs font-semibold text-dark transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:text-white"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="card-root border border-stroke p-5 dark:border-white/10">
          <h2 className="mb-4 text-sm font-bold text-black dark:text-white">État du parc</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-body dark:text-body-dark">Institutions actives</span>
              <strong className="text-dark dark:text-white">{stats.active}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-body dark:text-body-dark">Périodes d’essai</span>
              <strong className="text-dark dark:text-white">{stats.trial}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-body dark:text-body-dark">Institutions suspendues</span>
              <strong className="text-dark dark:text-white">{stats.suspended}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-body dark:text-body-dark">Utilisateurs</span>
              <strong className="text-dark dark:text-white">{users.length}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-body dark:text-body-dark">Stagiaires</span>
              <strong className="text-dark dark:text-white">{stagiaires.length}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="card-root border border-stroke dark:border-white/10">
        <div className="flex items-center justify-between border-b border-stroke px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-sm font-bold text-black dark:text-white">
              Dernières institutions
            </h2>
            <p className="text-xs text-body dark:text-body-dark">
              Les espaces institutionnels récemment créés.
            </p>
          </div>
          <Link
            to="/app/plateforme/institutions"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Tout voir
          </Link>
        </div>

        {recentInstitutions.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-body dark:text-body-dark">
            Aucune institution enregistrée.
          </p>
        ) : (
          <div className="divide-y divide-stroke dark:divide-white/5">
            {recentInstitutions.map((institution) => (
              <div key={institution.id} className="flex items-center gap-4 px-5 py-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: institution.primary_color ?? '#2563eb' }}
                >
                  {(institution.code ?? '?').slice(0, 3).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-black dark:text-white">
                    {institution.name ?? 'Institution sans nom'}
                  </p>
                  <p className="text-xs text-body dark:text-body-dark">
                    {institution.code ?? '—'} · {institution.city ?? '—'} · créée le{' '}
                    {formatDate(institution.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge tone={statusTone(institution.status)}>
                    {optionLabel(INSTITUTION_STATUS_OPTIONS, institution.status)}
                  </Badge>
                  <Link
                    to="/app/plateforme/institutions"
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Gérer
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="card-root border border-stroke p-5 dark:border-white/10">
          <h2 className="mb-3 text-sm font-bold text-black dark:text-white">
            Abonnements récents
          </h2>
          {subscriptions.length === 0 ? (
            <p className="text-xs text-body dark:text-body-dark">Aucun abonnement enregistré.</p>
          ) : (
            <div className="space-y-2">
              {subscriptions.slice(0, 5).map((subscription) => {
                const institution = institutions.find(
                  (item) => item.id === subscription.institution_id,
                );
                return (
                  <div
                    key={subscription.id}
                    className="flex items-center justify-between gap-3 border border-stroke px-3 py-2 dark:border-white/10"
                  >
                    <span className="min-w-0 truncate text-xs font-medium text-dark dark:text-white">
                      {institution?.name ?? subscription.institution_id}
                    </span>
                    <Badge tone={statusTone(subscription.status)}>
                      {optionLabel(SUBSCRIPTION_STATUS_OPTIONS, subscription.status)}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card-root border border-stroke p-5 dark:border-white/10">
          <h2 className="mb-3 text-sm font-bold text-black dark:text-white">Offres</h2>
          {plans.length === 0 ? (
            <p className="text-xs text-body dark:text-body-dark">Aucune offre configurée.</p>
          ) : (
            <div className="space-y-2">
              {plans.slice(0, 5).map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between gap-3 border border-stroke px-3 py-2 dark:border-white/10"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-dark dark:text-white">
                      {plan.name}
                    </p>
                    <p className="text-[10px] text-body dark:text-body-dark">
                      {plan.max_users ? `${plan.max_users} utilisateurs` : 'Utilisateurs illimités'} ·{' '}
                      {plan.max_stagiaires ? `${plan.max_stagiaires} stagiaires` : 'Stagiaires illimités'}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-primary">
                    {plan.price_monthly} {plan.currency}/mois
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
