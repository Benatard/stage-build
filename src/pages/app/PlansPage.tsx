import { useMemo, useState } from 'react';
import { FiEdit2, FiList, FiPlus, FiTrash2 } from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/Feedback';
import { Field, Input, Select, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { PLAN_STATUS_OPTIONS, optionLabel } from '@/config/options';
import { useForgeTable } from '@/hooks/useForgeTable';
import { useReferenceData } from '@/hooks/useReferenceData';
import { dataService } from '@/services/data.service';
import type { ImprovementAction, ImprovementPlan } from '@/types/domain';
import { confirmDelete, notifyError, notifySuccess } from '@/utils/alerts';
import { formatDate, fullName } from '@/utils/format';
import { buildOptions } from '@/utils/options';

const actionStatusOptions = [
  { value: 'a_faire', label: 'À faire' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Terminé' },
  { value: 'annule', label: 'Annulé' },
];

type PlanDraft = {
  stagiaire_id: string;
  difficulty: string;
  objective: string;
  start_date: string;
  end_date: string;
  responsible_id: string;
  status: string;
  evaluation_comment: string;
};

const emptyPlan: PlanDraft = {
  stagiaire_id: '',
  difficulty: '',
  objective: '',
  start_date: '',
  end_date: '',
  responsible_id: '',
  status: 'cree',
  evaluation_comment: '',
};

type ActionDraft = {
  title: string;
  type: string;
  due_date: string;
  status: string;
  result: string;
};

const emptyAction: ActionDraft = {
  title: '',
  type: '',
  due_date: '',
  status: 'a_faire',
  result: '',
};

export default function PlansPage() {
  const { data } = useReferenceData();
  const { rows: plans, loading, error, reload } = useForgeTable<ImprovementPlan>(
    'improvement_plans',
    { order: 'created_at.desc' },
  );

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ImprovementPlan | null>(null);
  const [planDraft, setPlanDraft] = useState<PlanDraft>(emptyPlan);
  const [savingPlan, setSavingPlan] = useState(false);

  const [actionsPlan, setActionsPlan] = useState<ImprovementPlan | null>(null);
  const [actionDraft, setActionDraft] = useState<ActionDraft>(emptyAction);
  const [savingAction, setSavingAction] = useState(false);

  const {
    rows: actions,
    loading: actionsLoading,
    reload: reloadActions,
  } = useForgeTable<ImprovementAction>('improvement_actions', {
    filters: { plan_id: actionsPlan?.id },
    order: 'due_date.asc',
    enabled: Boolean(actionsPlan?.id),
  });

  const stagiaireOptions = useMemo(
    () =>
      buildOptions(
        data.stagiaires,
        (stagiaire) => `${fullName(stagiaire)} (${stagiaire.matricule})`,
      ),
    [data.stagiaires],
  );
  const responsibleOptions = useMemo(
    () =>
      buildOptions(
        data.users.filter((user) =>
          ['formateur', 'responsable_formation', 'responsable_pedagogique', 'maitre_stage'].includes(
            user.role,
          ),
        ),
        (user) => fullName(user),
      ),
    [data.users],
  );

  function openCreate() {
    setEditingPlan(null);
    setPlanDraft(emptyPlan);
    setPlanModalOpen(true);
  }

  function openEdit(plan: ImprovementPlan) {
    setEditingPlan(plan);
    setPlanDraft({
      stagiaire_id: plan.stagiaire_id,
      difficulty: plan.difficulty,
      objective: plan.objective,
      start_date: plan.start_date ?? '',
      end_date: plan.end_date ?? '',
      responsible_id: plan.responsible_id ?? '',
      status: plan.status,
      evaluation_comment: plan.evaluation_comment ?? '',
    });
    setPlanModalOpen(true);
  }

  async function savePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPlan(true);

    const payload = {
      stagiaire_id: planDraft.stagiaire_id,
      difficulty: planDraft.difficulty.trim(),
      objective: planDraft.objective.trim(),
      start_date: planDraft.start_date || null,
      end_date: planDraft.end_date || null,
      responsible_id: planDraft.responsible_id || null,
      status: planDraft.status,
      evaluation_comment: planDraft.evaluation_comment.trim() || null,
    };

    try {
      if (editingPlan) {
        await dataService.updateRow<ImprovementPlan>('improvement_plans', editingPlan.id, payload);
        notifySuccess('Plan mis à jour');
      } else {
        await dataService.createRow<ImprovementPlan>('improvement_plans', payload);
        notifySuccess('Plan créé');
      }
      setPlanModalOpen(false);
      reload();
    } catch {
      notifyError('Enregistrement impossible');
    } finally {
      setSavingPlan(false);
    }
  }

  async function deletePlan(plan: ImprovementPlan) {
    const stagiaire = data.stagiaires.find((item) => item.id === plan.stagiaire_id);
    const confirmed = await confirmDelete(`Plan de ${fullName(stagiaire)}`);
    if (!confirmed) return;
    try {
      await dataService.deleteRow('improvement_plans', plan.id);
      notifySuccess('Plan supprimé');
      reload();
    } catch {
      notifyError('Suppression impossible');
    }
  }

  async function saveAction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!actionsPlan) return;
    setSavingAction(true);

    try {
      await dataService.createRow<ImprovementAction>('improvement_actions', {
        plan_id: actionsPlan.id,
        title: actionDraft.title.trim(),
        type: actionDraft.type.trim() || null,
        due_date: actionDraft.due_date || null,
        status: actionDraft.status,
        result: actionDraft.result.trim() || null,
      });
      notifySuccess('Action ajoutée');
      setActionDraft(emptyAction);
      reloadActions();
    } catch {
      notifyError('Ajout impossible');
    } finally {
      setSavingAction(false);
    }
  }

  async function updateActionStatus(action: ImprovementAction, status: string) {
    try {
      await dataService.updateRow<ImprovementAction>('improvement_actions', action.id, {
        status,
        result: action.result ?? null,
      });
      notifySuccess('Action mise à jour');
      reloadActions();
    } catch {
      notifyError('Mise à jour impossible');
    }
  }

  async function deleteAction(action: ImprovementAction) {
    const confirmed = await confirmDelete(action.title);
    if (!confirmed) return;
    try {
      await dataService.deleteRow('improvement_actions', action.id);
      notifySuccess('Action supprimée');
      reloadActions();
    } catch {
      notifyError('Suppression impossible');
    }
  }

  const columns: TableColumn<ImprovementPlan>[] = [
    {
      key: 'stagiaire',
      header: 'Stagiaire',
      render: (row) => (
        <div>
          <p className="font-semibold text-black dark:text-white">
            {fullName(data.stagiaires.find((item) => item.id === row.stagiaire_id))}
          </p>
          <p className="text-xs text-body dark:text-body-dark">{formatDate(row.created_at)}</p>
        </div>
      ),
    },
    {
      key: 'difficulty',
      header: 'Difficulté',
      hideBelow: 'md',
      render: (row) => <span className="line-clamp-2 max-w-xs">{row.difficulty}</span>,
    },
    {
      key: 'objective',
      header: 'Objectif',
      hideBelow: 'lg',
      render: (row) => <span className="line-clamp-2 max-w-xs">{row.objective}</span>,
    },
    {
      key: 'period',
      header: 'Période',
      hideBelow: 'lg',
      render: (row) => `${formatDate(row.start_date)} → ${formatDate(row.end_date)}`,
    },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => (
        <Badge tone={statusTone(row.status)}>{optionLabel(PLAN_STATUS_OPTIONS, row.status)}</Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={() => setActionsPlan(row)}
            className="flex h-8 w-8 items-center justify-center text-body hover:bg-primary/10 hover:text-primary dark:text-body-dark"
            title="Actions du plan"
          >
            <FiList className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="flex h-8 w-8 items-center justify-center text-body hover:bg-primary/10 hover:text-primary dark:text-body-dark"
            title="Modifier"
          >
            <FiEdit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void deletePlan(row)}
            className="flex h-8 w-8 items-center justify-center text-body hover:bg-rose-50 hover:text-rose-600 dark:text-body-dark dark:hover:bg-rose-500/10"
            title="Supprimer"
          >
            <FiTrash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Suivi"
        title="Plans d’amélioration"
        description="Définissez des objectifs de remédiation, des actions concrètes et mesurez leur atteinte."
        actions={
          <Button onClick={openCreate} icon={<FiPlus className="h-4 w-4" />}>
            Nouveau plan
          </Button>
        }
      />

      <div className="card-root border border-stroke dark:border-white/10">
        <DataTable
          columns={columns}
          rows={plans}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyTitle="Aucun plan d’amélioration"
          emptyDescription="Créez un plan pour accompagner un stagiaire en difficulté."
          emptyAction={
            <Button size="sm" onClick={openCreate} icon={<FiPlus className="h-4 w-4" />}>
              Créer un plan
            </Button>
          }
        />
      </div>

      <Modal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        title={editingPlan ? 'Modifier le plan' : 'Nouveau plan d’amélioration'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setPlanModalOpen(false)}>Annuler</Button>
            <Button type="submit" form="plan-form" loading={savingPlan}>
              {editingPlan ? 'Enregistrer' : 'Créer le plan'}
            </Button>
          </>
        }
      >
        <form id="plan-form" onSubmit={savePlan} className="grid gap-4 sm:grid-cols-2">
          <Field label="Stagiaire" required className="sm:col-span-2">
            <Select
              required
              value={planDraft.stagiaire_id}
              placeholder="Sélectionner…"
              options={stagiaireOptions}
              onChange={(event) => setPlanDraft((current) => ({ ...current, stagiaire_id: event.target.value }))}
            />
          </Field>
          <Field label="Difficulté constatée" required className="sm:col-span-2">
            <Textarea
              required
              rows={3}
              value={planDraft.difficulty}
              onChange={(event) => setPlanDraft((current) => ({ ...current, difficulty: event.target.value }))}
            />
          </Field>
          <Field label="Objectif d’amélioration" required className="sm:col-span-2">
            <Textarea
              required
              rows={3}
              value={planDraft.objective}
              onChange={(event) => setPlanDraft((current) => ({ ...current, objective: event.target.value }))}
            />
          </Field>
          <Field label="Date de début">
            <Input
              type="date"
              value={planDraft.start_date}
              onChange={(event) => setPlanDraft((current) => ({ ...current, start_date: event.target.value }))}
            />
          </Field>
          <Field label="Date de fin">
            <Input
              type="date"
              value={planDraft.end_date}
              onChange={(event) => setPlanDraft((current) => ({ ...current, end_date: event.target.value }))}
            />
          </Field>
          <Field label="Responsable du suivi">
            <Select
              value={planDraft.responsible_id}
              placeholder="Sélectionner…"
              options={responsibleOptions}
              onChange={(event) => setPlanDraft((current) => ({ ...current, responsible_id: event.target.value }))}
            />
          </Field>
          <Field label="Statut" required>
            <Select
              value={planDraft.status}
              options={PLAN_STATUS_OPTIONS}
              onChange={(event) => setPlanDraft((current) => ({ ...current, status: event.target.value }))}
            />
          </Field>
          <Field label="Commentaire d’évaluation" className="sm:col-span-2">
            <Textarea
              rows={3}
              value={planDraft.evaluation_comment}
              onChange={(event) => setPlanDraft((current) => ({ ...current, evaluation_comment: event.target.value }))}
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={Boolean(actionsPlan)}
        onClose={() => setActionsPlan(null)}
        title="Actions du plan"
        description={
          actionsPlan
            ? `Plan de ${fullName(data.stagiaires.find((item) => item.id === actionsPlan.stagiaire_id))}`
            : undefined
        }
        size="xl"
        footer={
          <Button variant="outline" onClick={() => setActionsPlan(null)}>
            Fermer
          </Button>
        }
      >
        <form onSubmit={saveAction} className="mb-6 grid gap-3 border border-stroke p-4 dark:border-white/10 sm:grid-cols-2">
          <Field label="Action" required className="sm:col-span-2">
            <Input
              required
              value={actionDraft.title}
              onChange={(event) => setActionDraft((current) => ({ ...current, title: event.target.value }))}
            />
          </Field>
          <Field label="Type">
            <Input
              value={actionDraft.type}
              placeholder="Entraînement, tutorat…"
              onChange={(event) => setActionDraft((current) => ({ ...current, type: event.target.value }))}
            />
          </Field>
          <Field label="Échéance">
            <Input
              type="date"
              value={actionDraft.due_date}
              onChange={(event) => setActionDraft((current) => ({ ...current, due_date: event.target.value }))}
            />
          </Field>
          <Field label="Statut">
            <Select
              value={actionDraft.status}
              options={actionStatusOptions}
              onChange={(event) => setActionDraft((current) => ({ ...current, status: event.target.value }))}
            />
          </Field>
          <Field label="Résultat">
            <Input
              value={actionDraft.result}
              onChange={(event) => setActionDraft((current) => ({ ...current, result: event.target.value }))}
            />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" loading={savingAction} icon={<FiPlus className="h-4 w-4" />}>
              Ajouter l’action
            </Button>
          </div>
        </form>

        {actionsLoading ? (
          <p className="py-8 text-center text-sm text-body dark:text-body-dark">Chargement…</p>
        ) : actions.length === 0 ? (
          <p className="py-8 text-center text-sm text-body dark:text-body-dark">
            Aucune action définie pour ce plan.
          </p>
        ) : (
          <div className="space-y-2">
            {actions.map((action) => (
              <div key={action.id} className="flex flex-wrap items-start justify-between gap-3 border border-stroke p-3 dark:border-white/10">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-black dark:text-white">{action.title}</p>
                  <p className="text-xs text-body dark:text-body-dark">
                    {action.type ?? 'Action'} · échéance {formatDate(action.due_date)}
                  </p>
                  {action.result && <p className="mt-1 text-xs text-body dark:text-body-dark">{action.result}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={action.status}
                    onChange={(event) => void updateActionStatus(action, event.target.value)}
                    className="border border-stroke bg-white px-2 py-1.5 text-xs dark:border-white/10 dark:bg-[#242936] dark:text-white"
                  >
                    {actionStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void deleteAction(action)}
                    className="text-body hover:text-rose-500 dark:text-body-dark"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
