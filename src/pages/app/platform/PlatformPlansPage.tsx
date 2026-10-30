import { useMemo, useState, type FormEvent } from 'react';
import { FiEdit2, FiPlus } from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader, StatCard } from '@/components/ui/Feedback';
import { Field, Input, Select, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import {
  BILLING_CYCLE_OPTIONS,
  SUBSCRIPTION_STATUS_OPTIONS,
  optionLabel,
} from '@/config/options';
import { useForgeTable } from '@/hooks/useForgeTable';
import { dataService } from '@/services/data.service';
import type {
  Institution,
  InstitutionSubscription,
  SaasPlan,
  SubscriptionStatus,
} from '@/types/domain';
import { notifyError, notifySuccess } from '@/utils/alerts';
import { formatDate, getErrorMessage, todayISO } from '@/utils/format';

type PlanDraft = {
  code: string;
  name: string;
  description: string;
  price_monthly: string;
  price_yearly: string;
  currency: string;
  max_users: string;
  max_stagiaires: string;
  max_formations: string;
  features: string;
  sort_order: string;
  is_active: 'true' | 'false';
};

type SubscriptionDraft = {
  institution_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  billing_cycle: 'monthly' | 'yearly';
  starts_at: string;
  ends_at: string;
  seats: string;
  amount: string;
  currency: string;
  notes: string;
};

const emptyPlan: PlanDraft = {
  code: '',
  name: '',
  description: '',
  price_monthly: '0',
  price_yearly: '0',
  currency: 'USD',
  max_users: '',
  max_stagiaires: '',
  max_formations: '',
  features: '',
  sort_order: '0',
  is_active: 'true',
};

function emptySubscription(): SubscriptionDraft {
  return {
    institution_id: '',
    plan_id: '',
    status: 'trialing',
    billing_cycle: 'monthly',
    starts_at: todayISO(),
    ends_at: '',
    seats: '',
    amount: '0',
    currency: 'USD',
    notes: '',
  };
}

export default function PlatformPlansPage() {
  const { rows: plans, loading, error, reload } = useForgeTable<SaasPlan>('saas_plans', {
    order: 'sort_order.asc',
    limit: 200,
  });
  const { rows: subscriptions, reload: reloadSubscriptions } =
    useForgeTable<InstitutionSubscription>('institution_subscriptions', {
      order: 'created_at.desc',
      limit: 500,
    });
  const { rows: institutions } = useForgeTable<Institution>('institutions', {
    order: 'name.asc',
    limit: 500,
  });

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SaasPlan | null>(null);
  const [planDraft, setPlanDraft] = useState<PlanDraft>(emptyPlan);
  const [savingPlan, setSavingPlan] = useState(false);

  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [subscriptionDraft, setSubscriptionDraft] = useState<SubscriptionDraft>(
    emptySubscription(),
  );
  const [savingSubscription, setSavingSubscription] = useState(false);

  const institutionOptions = useMemo(
    () => institutions.map((institution) => ({ value: institution.id, label: institution.name })),
    [institutions],
  );
  const planOptions = useMemo(
    () => plans.map((plan) => ({ value: plan.id, label: `${plan.name} · ${plan.price_monthly} ${plan.currency}` })),
    [plans],
  );

  const activePlans = plans.filter((plan) => plan.is_active).length;
  const activeSubscriptions = subscriptions.filter(
    (subscription) => subscription.status === 'active',
  ).length;
  const trialSubscriptions = subscriptions.filter(
    (subscription) => subscription.status === 'trialing',
  ).length;

  function openPlan(plan?: SaasPlan) {
    setEditingPlan(plan ?? null);
    setPlanDraft(
      plan
        ? {
            code: plan.code,
            name: plan.name,
            description: plan.description ?? '',
            price_monthly: String(plan.price_monthly ?? 0),
            price_yearly: String(plan.price_yearly ?? 0),
            currency: plan.currency ?? 'USD',
            max_users: plan.max_users ? String(plan.max_users) : '',
            max_stagiaires: plan.max_stagiaires ? String(plan.max_stagiaires) : '',
            max_formations: plan.max_formations ? String(plan.max_formations) : '',
            features: (plan.features ?? []).join(', '),
            sort_order: String(plan.sort_order ?? 0),
            is_active: plan.is_active ? 'true' : 'false',
          }
        : emptyPlan,
    );
    setPlanModalOpen(true);
  }

  async function savePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPlan(true);

    const payload = {
      code: planDraft.code.trim().toLowerCase(),
      name: planDraft.name.trim(),
      description: planDraft.description.trim() || null,
      price_monthly: Number(planDraft.price_monthly) || 0,
      price_yearly: Number(planDraft.price_yearly) || 0,
      currency: planDraft.currency.trim().toUpperCase() || 'USD',
      max_users: planDraft.max_users ? Number(planDraft.max_users) : null,
      max_stagiaires: planDraft.max_stagiaires ? Number(planDraft.max_stagiaires) : null,
      max_formations: planDraft.max_formations ? Number(planDraft.max_formations) : null,
      features: planDraft.features
        .split(',')
        .map((feature) => feature.trim())
        .filter(Boolean),
      sort_order: Number(planDraft.sort_order) || 0,
      is_active: planDraft.is_active === 'true',
    };

    try {
      if (editingPlan) {
        await dataService.updateRow<SaasPlan>('saas_plans', editingPlan.id, payload);
        notifySuccess('Offre mise à jour');
      } else {
        await dataService.createRow<SaasPlan>('saas_plans', payload);
        notifySuccess('Offre créée');
      }
      setPlanModalOpen(false);
      reload();
    } catch (planError) {
      notifyError('Enregistrement impossible', getErrorMessage(planError));
    } finally {
      setSavingPlan(false);
    }
  }

  function openSubscription() {
    setSubscriptionDraft(emptySubscription());
    setSubscriptionModalOpen(true);
  }

  async function saveSubscription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingSubscription(true);

    const plan = plans.find((item) => item.id === subscriptionDraft.plan_id);
    const payload = {
      institution_id: subscriptionDraft.institution_id,
      plan_id: subscriptionDraft.plan_id,
      status: subscriptionDraft.status,
      billing_cycle: subscriptionDraft.billing_cycle,
      starts_at: subscriptionDraft.starts_at,
      ends_at: subscriptionDraft.ends_at || null,
      seats: subscriptionDraft.seats ? Number(subscriptionDraft.seats) : null,
      amount:
        Number(subscriptionDraft.amount) ||
        (subscriptionDraft.billing_cycle === 'yearly'
          ? plan?.price_yearly ?? 0
          : plan?.price_monthly ?? 0),
      currency: subscriptionDraft.currency || plan?.currency || 'USD',
      notes: subscriptionDraft.notes.trim() || null,
      trial_ends_at:
        subscriptionDraft.status === 'trialing' ? subscriptionDraft.ends_at || null : null,
    };

    try {
      await dataService.createRow<InstitutionSubscription>(
        'institution_subscriptions',
        payload,
      );
      notifySuccess('Abonnement enregistré');
      setSubscriptionModalOpen(false);
      reloadSubscriptions();
    } catch (subscriptionError) {
      notifyError('Enregistrement impossible', getErrorMessage(subscriptionError));
    } finally {
      setSavingSubscription(false);
    }
  }

  async function updateSubscriptionStatus(
    subscription: InstitutionSubscription,
    status: SubscriptionStatus,
  ) {
    try {
      await dataService.updateRow<InstitutionSubscription>(
        'institution_subscriptions',
        subscription.id,
        { status },
      );
      notifySuccess('Statut de l’abonnement mis à jour');
      reloadSubscriptions();
    } catch (statusError) {
      notifyError('Mise à jour impossible', getErrorMessage(statusError));
    }
  }

  const planColumns: TableColumn<SaasPlan>[] = [
    {
      key: 'name',
      header: 'Offre',
      render: (row) => (
        <div>
          <p className="font-semibold text-black dark:text-white">{row.name}</p>
          <p className="font-mono text-xs text-body dark:text-body-dark">{row.code}</p>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Tarif mensuel',
      render: (row) => `${row.price_monthly} ${row.currency}`,
    },
    {
      key: 'yearly',
      header: 'Tarif annuel',
      hideBelow: 'md',
      render: (row) => `${row.price_yearly} ${row.currency}`,
    },
    {
      key: 'limits',
      header: 'Limites',
      hideBelow: 'lg',
      render: (row) => (
        <span className="text-xs text-body dark:text-body-dark">
          {row.max_users ?? '∞'} users · {row.max_stagiaires ?? '∞'} stagiaires ·{' '}
          {row.max_formations ?? '∞'} formations
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => (
        <Badge tone={row.is_active ? 'success' : 'neutral'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <button
          type="button"
          onClick={() => openPlan(row)}
          className="flex h-8 w-8 items-center justify-center text-body hover:bg-primary/10 hover:text-primary dark:text-body-dark"
          aria-label="Modifier l’offre"
        >
          <FiEdit2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  const subscriptionColumns: TableColumn<InstitutionSubscription>[] = [
    {
      key: 'institution',
      header: 'Institution',
      render: (row) => (
        <div>
          <p className="font-semibold text-black dark:text-white">
            {institutions.find((item) => item.id === row.institution_id)?.name ??
              row.institution_id}
          </p>
          <p className="text-xs text-body dark:text-body-dark">
            {plans.find((item) => item.id === row.plan_id)?.name ?? row.plan_id}
          </p>
        </div>
      ),
    },
    {
      key: 'cycle',
      header: 'Cycle',
      hideBelow: 'md',
      render: (row) => optionLabel(BILLING_CYCLE_OPTIONS, row.billing_cycle),
    },
    {
      key: 'period',
      header: 'Période',
      hideBelow: 'lg',
      render: (row) => `${formatDate(row.starts_at)} → ${row.ends_at ? formatDate(row.ends_at) : '∞'}`,
    },
    {
      key: 'amount',
      header: 'Montant',
      render: (row) => `${row.amount} ${row.currency}`,
    },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => (
        <Badge tone={statusTone(row.status)}>
          {optionLabel(SUBSCRIPTION_STATUS_OPTIONS, row.status)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          {row.status !== 'active' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void updateSubscriptionStatus(row, 'active')}
            >
              Activer
            </Button>
          )}
          {row.status === 'active' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void updateSubscriptionStatus(row, 'canceled')}
            >
              Résilier
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Console plateforme"
        title="Plans & abonnements"
        description="Configurez les offres commerciales, les limites par institution et les abonnements en cours."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={openSubscription} icon={<FiPlus className="h-4 w-4" />}>
              Nouvel abonnement
            </Button>
            <Button onClick={() => openPlan()} icon={<FiPlus className="h-4 w-4" />}>
              Nouvelle offre
            </Button>
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Offres" value={plans.length} tone="primary" />
        <StatCard label="Offres actives" value={activePlans} tone="success" />
        <StatCard label="Abonnements actifs" value={activeSubscriptions} tone="purple" />
        <StatCard label="En essai" value={trialSubscriptions} tone="warning" />
      </div>

      <div className="mb-6 card-root border border-stroke dark:border-white/10">
        <div className="border-b border-stroke px-5 py-4 dark:border-white/10">
          <h2 className="text-sm font-bold text-black dark:text-white">Offres</h2>
          <p className="text-xs text-body dark:text-body-dark">
            Les limites nulles signifient « illimité ».
          </p>
        </div>
        <DataTable
          columns={planColumns}
          rows={plans}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyTitle="Aucune offre"
          emptyDescription="Créez une première offre commerciale."
        />
      </div>

      <div className="card-root border border-stroke dark:border-white/10">
        <div className="border-b border-stroke px-5 py-4 dark:border-white/10">
          <h2 className="text-sm font-bold text-black dark:text-white">Abonnements</h2>
          <p className="text-xs text-body dark:text-body-dark">
            Affectation des offres aux institutions.
          </p>
        </div>
        <DataTable
          columns={subscriptionColumns}
          rows={subscriptions}
          emptyTitle="Aucun abonnement"
          emptyDescription="Affectez une offre à une institution."
        />
      </div>

      <Modal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        title={editingPlan ? 'Modifier l’offre' : 'Nouvelle offre'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setPlanModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" form="plan-form" loading={savingPlan}>
              Enregistrer
            </Button>
          </>
        }
      >
        <form id="plan-form" onSubmit={savePlan} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom" required>
            <Input
              required
              value={planDraft.name}
              onChange={(event) =>
                setPlanDraft((current) => ({ ...current, name: event.target.value }))
              }
            />
          </Field>
          <Field label="Code" required>
            <Input
              required
              value={planDraft.code}
              onChange={(event) =>
                setPlanDraft((current) => ({ ...current, code: event.target.value }))
              }
            />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={planDraft.description}
              onChange={(event) =>
                setPlanDraft((current) => ({ ...current, description: event.target.value }))
              }
            />
          </Field>
          <Field label="Prix mensuel" required>
            <Input
              type="number"
              min={0}
              step="0.01"
              required
              value={planDraft.price_monthly}
              onChange={(event) =>
                setPlanDraft((current) => ({ ...current, price_monthly: event.target.value }))
              }
            />
          </Field>
          <Field label="Prix annuel" required>
            <Input
              type="number"
              min={0}
              step="0.01"
              required
              value={planDraft.price_yearly}
              onChange={(event) =>
                setPlanDraft((current) => ({ ...current, price_yearly: event.target.value }))
              }
            />
          </Field>
          <Field label="Devise" required>
            <Input
              required
              value={planDraft.currency}
              onChange={(event) =>
                setPlanDraft((current) => ({ ...current, currency: event.target.value }))
              }
            />
          </Field>
          <Field label="Ordre d’affichage" required>
            <Input
              type="number"
              required
              value={planDraft.sort_order}
              onChange={(event) =>
                setPlanDraft((current) => ({ ...current, sort_order: event.target.value }))
              }
            />
          </Field>
          <Field label="Limite utilisateurs" hint="Vide = illimité">
            <Input
              type="number"
              min={0}
              value={planDraft.max_users}
              onChange={(event) =>
                setPlanDraft((current) => ({ ...current, max_users: event.target.value }))
              }
            />
          </Field>
          <Field label="Limite stagiaires" hint="Vide = illimité">
            <Input
              type="number"
              min={0}
              value={planDraft.max_stagiaires}
              onChange={(event) =>
                setPlanDraft((current) => ({ ...current, max_stagiaires: event.target.value }))
              }
            />
          </Field>
          <Field label="Limite formations" hint="Vide = illimité">
            <Input
              type="number"
              min={0}
              value={planDraft.max_formations}
              onChange={(event) =>
                setPlanDraft((current) => ({ ...current, max_formations: event.target.value }))
              }
            />
          </Field>
          <Field label="Statut" required>
            <Select
              value={planDraft.is_active}
              options={[
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ]}
              onChange={(event) =>
                setPlanDraft((current) => ({
                  ...current,
                  is_active: event.target.value as 'true' | 'false',
                }))
              }
            />
          </Field>
          <Field label="Fonctionnalités" hint="Séparées par des virgules" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={planDraft.features}
              onChange={(event) =>
                setPlanDraft((current) => ({ ...current, features: event.target.value }))
              }
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={subscriptionModalOpen}
        onClose={() => setSubscriptionModalOpen(false)}
        title="Nouvel abonnement"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setSubscriptionModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" form="subscription-form" loading={savingSubscription}>
              Enregistrer
            </Button>
          </>
        }
      >
        <form id="subscription-form" onSubmit={saveSubscription} className="grid gap-4 sm:grid-cols-2">
          <Field label="Institution" required className="sm:col-span-2">
            <Select
              required
              value={subscriptionDraft.institution_id}
              placeholder="Sélectionner une institution"
              options={institutionOptions}
              onChange={(event) =>
                setSubscriptionDraft((current) => ({
                  ...current,
                  institution_id: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Offre" required>
            <Select
              required
              value={subscriptionDraft.plan_id}
              placeholder="Sélectionner une offre"
              options={planOptions}
              onChange={(event) =>
                setSubscriptionDraft((current) => ({
                  ...current,
                  plan_id: event.target.value,
                  amount:
                    current.amount !== '0'
                      ? current.amount
                      : String(
                          plans.find((plan) => plan.id === event.target.value)?.price_monthly ??
                            0,
                        ),
                }))
              }
            />
          </Field>
          <Field label="Statut" required>
            <Select
              value={subscriptionDraft.status}
              options={SUBSCRIPTION_STATUS_OPTIONS}
              onChange={(event) =>
                setSubscriptionDraft((current) => ({
                  ...current,
                  status: event.target.value as SubscriptionStatus,
                }))
              }
            />
          </Field>
          <Field label="Cycle" required>
            <Select
              value={subscriptionDraft.billing_cycle}
              options={BILLING_CYCLE_OPTIONS}
              onChange={(event) =>
                setSubscriptionDraft((current) => ({
                  ...current,
                  billing_cycle: event.target.value as 'monthly' | 'yearly',
                }))
              }
            />
          </Field>
          <Field label="Date de début" required>
            <Input
              type="date"
              required
              value={subscriptionDraft.starts_at}
              onChange={(event) =>
                setSubscriptionDraft((current) => ({
                  ...current,
                  starts_at: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Date de fin">
            <Input
              type="date"
              value={subscriptionDraft.ends_at}
              onChange={(event) =>
                setSubscriptionDraft((current) => ({ ...current, ends_at: event.target.value }))
              }
            />
          </Field>
          <Field label="Places">
            <Input
              type="number"
              min={0}
              value={subscriptionDraft.seats}
              onChange={(event) =>
                setSubscriptionDraft((current) => ({ ...current, seats: event.target.value }))
              }
            />
          </Field>
          <Field label="Montant" required>
            <Input
              type="number"
              min={0}
              step="0.01"
              required
              value={subscriptionDraft.amount}
              onChange={(event) =>
                setSubscriptionDraft((current) => ({ ...current, amount: event.target.value }))
              }
            />
          </Field>
          <Field label="Devise" required>
            <Input
              required
              value={subscriptionDraft.currency}
              onChange={(event) =>
                setSubscriptionDraft((current) => ({ ...current, currency: event.target.value }))
              }
            />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={subscriptionDraft.notes}
              onChange={(event) =>
                setSubscriptionDraft((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
