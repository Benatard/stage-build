import { useMemo } from 'react';
import { FiActivity, FiFlag, FiShield, FiTarget } from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { PageHeader, StatCard } from '@/components/ui/Feedback';
import { OBJECTIVE_STATUS_OPTIONS, PLAN_STATUS_OPTIONS, optionLabel } from '@/config/options';
import { useScopedRows } from '@/hooks/useScopedRows';
import type {
  Comportement,
  FinalProject,
  ImprovementAction,
  ImprovementPlan,
  Implication,
  Observation,
  StageObjective,
} from '@/types/domain';
import { average, formatDate, formatDateTime } from '@/utils/format';
import { DefinitionGrid, SelfGate, SectionCard } from './StagiaireShared';
import { useSelfAcademic } from './useStagiaireSelf';

const implicationFields: Array<[keyof Implication, string]> = [
  ['participation', 'Participation'],
  ['assiduite', 'Assiduité'],
  ['curiosite', 'Curiosité'],
  ['questions', 'Questions'],
  ['travail_personnel', 'Travail personnel'],
  ['collaboration', 'Collaboration'],
  ['respect_consignes', 'Respect des consignes'],
  ['autonomie', 'Autonomie'],
];

const comportementFields: Array<[keyof Comportement, string]> = [
  ['ponctualite', 'Ponctualité'],
  ['discipline', 'Discipline'],
  ['respect', 'Respect'],
  ['communication', 'Communication'],
  ['esprit_equipe', 'Esprit d’équipe'],
  ['autonomie', 'Autonomie'],
  ['responsabilite', 'Responsabilité'],
  ['attitude_professionnelle', 'Attitude professionnelle'],
  ['respect_materiel', 'Respect du matériel'],
  ['capacite_adaptation', 'Capacité d’adaptation'],
];

export function StagiaireImplication() {
  const academic = useSelfAcademic();
  const stagiaireId = academic.stagiaireId;
  const { rows, loading, error } = useScopedRows<Implication>('implications', {
    scope: { stagiaire_id: stagiaireId },
    order: 'created_at.desc',
    enabled: Boolean(stagiaireId),
  });

  const averages = rows
    .map((row) => row.average)
    .filter((value): value is number => typeof value === 'number');

  return (
    <SelfGate loading={academic.loading || loading} error={academic.error ?? error} onRetry={academic.reload}>
      <PageHeader
        eyebrow="Mon suivi"
        title="Mon implication"
        description="Consultez les évaluations de votre participation et de votre engagement."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Évaluations" value={rows.length} tone="primary" icon={<FiActivity className="h-4 w-4" />} />
        <StatCard label="Moyenne" value={averages.length ? `${average(averages).toFixed(2)}/5` : '—'} tone="success" />
        <StatCard label="Dernière période" value={rows[0]?.period ?? '—'} tone="purple" />
      </div>

      {rows.length === 0 ? (
        <SectionCard title="Évaluations d’implication">
          <p className="px-5 py-12 text-center text-sm text-body dark:text-body-dark">
            Aucune évaluation d’implication disponible.
          </p>
        </SectionCard>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <SectionCard
              key={row.id}
              title={row.period ? `Période ${row.period}` : 'Évaluation d’implication'}
              actions={row.average !== null ? <Badge tone="success">{row.average}/5</Badge> : undefined}
            >
              <div className="grid gap-4 p-5 sm:grid-cols-4">
                {implicationFields.map(([key, label]) => (
                  <div key={String(key)}>
                    <p className="text-[11px] uppercase tracking-wide text-body dark:text-body-dark">{label}</p>
                    <p className="mt-1 font-semibold text-dark dark:text-white">
                      {row[key] !== null && row[key] !== undefined ? `${row[key]}/5` : '—'}
                    </p>
                  </div>
                ))}
              </div>
              {row.comment && (
                <p className="border-t border-stroke px-5 py-4 text-sm text-body dark:border-white/10 dark:text-body-dark">
                  {row.comment}
                </p>
              )}
            </SectionCard>
          ))}
        </div>
      )}
    </SelfGate>
  );
}

export function StagiaireComportement() {
  const academic = useSelfAcademic();
  const stagiaireId = academic.stagiaireId;
  const { rows, loading, error } = useScopedRows<Comportement>('comportements', {
    scope: { stagiaire_id: stagiaireId },
    order: 'created_at.desc',
    enabled: Boolean(stagiaireId),
  });

  const averages = rows
    .map((row) => row.average)
    .filter((value): value is number => typeof value === 'number');

  return (
    <SelfGate loading={academic.loading || loading} error={academic.error ?? error} onRetry={academic.reload}>
      <PageHeader
        eyebrow="Mon suivi"
        title="Mon comportement"
        description="Consultez les évaluations relatives à votre attitude professionnelle."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Évaluations" value={rows.length} tone="primary" icon={<FiShield className="h-4 w-4" />} />
        <StatCard label="Moyenne" value={averages.length ? `${average(averages).toFixed(2)}/5` : '—'} tone="success" />
        <StatCard label="Dernière période" value={rows[0]?.period ?? '—'} tone="purple" />
      </div>

      {rows.length === 0 ? (
        <SectionCard title="Évaluations de comportement">
          <p className="px-5 py-12 text-center text-sm text-body dark:text-body-dark">
            Aucune évaluation de comportement disponible.
          </p>
        </SectionCard>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <SectionCard
              key={row.id}
              title={row.period ? `Période ${row.period}` : 'Évaluation de comportement'}
              actions={row.average !== null ? <Badge tone="success">{row.average}/5</Badge> : undefined}
            >
              <div className="grid gap-4 p-5 sm:grid-cols-5">
                {comportementFields.map(([key, label]) => (
                  <div key={String(key)}>
                    <p className="text-[11px] uppercase tracking-wide text-body dark:text-body-dark">{label}</p>
                    <p className="mt-1 font-semibold text-dark dark:text-white">
                      {row[key] !== null && row[key] !== undefined ? `${row[key]}/5` : '—'}
                    </p>
                  </div>
                ))}
              </div>
              {row.appreciation && (
                <p className="border-t border-stroke px-5 py-4 text-sm text-body dark:border-white/10 dark:text-body-dark">
                  {row.appreciation}
                </p>
              )}
            </SectionCard>
          ))}
        </div>
      )}
    </SelfGate>
  );
}

export function StagiaireObservations() {
  const academic = useSelfAcademic();
  const stagiaireId = academic.stagiaireId;
  const { rows, loading, error } = useScopedRows<Observation>('observations', {
    scope: { stagiaire_id: stagiaireId },
    order: 'created_at.desc',
    enabled: Boolean(stagiaireId),
  });

  const visible = useMemo(
    () => rows.filter((observation) => observation.visibility !== 'interne'),
    [rows],
  );

  return (
    <SelfGate loading={academic.loading || loading} error={academic.error ?? error} onRetry={academic.reload}>
      <PageHeader
        eyebrow="Mon suivi"
        title="Mes observations"
        description="Seules les observations partagées avec vous sont affichées. Les notes internes restent confidentielles."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Observations partagées" value={visible.length} tone="primary" />
        <StatCard label="Dernière observation" value={visible[0] ? formatDate(visible[0].created_at) : '—'} tone="purple" />
        <StatCard label="Visibilité" value="Publique / stagiaire" tone="success" />
      </div>

      {visible.length === 0 ? (
        <SectionCard title="Observations">
          <p className="px-5 py-12 text-center text-sm text-body dark:text-body-dark">
            Aucune observation partagée pour le moment.
          </p>
        </SectionCard>
      ) : (
        <div className="space-y-3">
          {visible.map((observation) => {
            const module = academic.modules.find((item) => item.id === observation.module_id);
            const evaluation = academic.evaluations.find(
              (item) => item.id === observation.evaluation_id,
            );
            return (
              <div key={observation.id} className="card-root border border-stroke p-5 dark:border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-body dark:text-body-dark">
                    {formatDateTime(observation.created_at)}
                  </p>
                  <Badge tone="info">{observation.visibility === 'stagiaire' ? 'Visible par vous' : 'Publiée'}</Badge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-dark dark:text-white">
                  {observation.content}
                </p>
                {(module || evaluation) && (
                  <p className="mt-2 text-xs text-body dark:text-body-dark">
                    Contexte : {module?.name ?? evaluation?.title ?? '—'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-4 text-xs text-body dark:text-body-dark">
        Les observations internes, confidentielles ou disciplinaires ne sont jamais affichées dans cet espace.
      </p>
    </SelfGate>
  );
}

function PlanActions({ planId }: { planId: string }) {
  const { rows, loading } = useScopedRows<ImprovementAction>('improvement_actions', {
    scope: { plan_id: planId },
    order: 'due_date.asc',
  });

  if (loading) {
    return <p className="px-5 py-3 text-xs text-body dark:text-body-dark">Chargement des actions…</p>;
  }

  if (rows.length === 0) {
    return <p className="px-5 py-3 text-xs text-body dark:text-body-dark">Aucune action associée.</p>;
  }

  return (
    <div className="divide-y divide-stroke border-t border-stroke dark:divide-white/5 dark:border-white/10">
      {rows.map((action) => (
        <div key={action.id} className="flex items-start justify-between gap-3 px-5 py-3">
          <div>
            <p className="text-sm font-medium text-black dark:text-white">{action.title}</p>
            <p className="text-xs text-body dark:text-body-dark">
              {action.type ?? 'Action'} · échéance {formatDate(action.due_date)}
              {action.result ? ` · ${action.result}` : ''}
            </p>
          </div>
          <Badge tone={statusTone(action.status)}>{action.status.replace('_', ' ')}</Badge>
        </div>
      ))}
    </div>
  );
}

export function StagiairePlans() {
  const academic = useSelfAcademic();
  const stagiaireId = academic.stagiaireId;
  const { rows, loading, error } = useScopedRows<ImprovementPlan>('improvement_plans', {
    scope: { stagiaire_id: stagiaireId },
    order: 'created_at.desc',
    enabled: Boolean(stagiaireId),
  });

  return (
    <SelfGate loading={academic.loading || loading} error={academic.error ?? error} onRetry={academic.reload}>
      <PageHeader
        eyebrow="Mon suivi"
        title="Mes plans d’amélioration"
        description="Consultez les plans définis avec l’équipe pédagogique et les actions à mener."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Plans" value={rows.length} tone="primary" icon={<FiTarget className="h-4 w-4" />} />
        <StatCard label="En cours" value={rows.filter((plan) => plan.status === 'en_cours').length} tone="warning" />
        <StatCard label="Atteints" value={rows.filter((plan) => plan.status === 'atteint').length} tone="success" />
      </div>

      {rows.length === 0 ? (
        <SectionCard title="Plans d’amélioration">
          <p className="px-5 py-12 text-center text-sm text-body dark:text-body-dark">
            Aucun plan d’amélioration vous concernant.
          </p>
        </SectionCard>
      ) : (
        <div className="space-y-4">
          {rows.map((plan) => (
            <SectionCard
              key={plan.id}
              title={plan.objective}
              description={`Difficulté : ${plan.difficulty}`}
              actions={<Badge tone={statusTone(plan.status)}>{optionLabel(PLAN_STATUS_OPTIONS, plan.status)}</Badge>}
            >
              <DefinitionGrid
                columns={3}
                items={[
                  ['Début', formatDate(plan.start_date)],
                  ['Fin', formatDate(plan.end_date)],
                  ['Évaluation', plan.evaluation_comment ?? '—'],
                ]}
              />
              <PlanActions planId={plan.id} />
            </SectionCard>
          ))}
        </div>
      )}
    </SelfGate>
  );
}

export function StagiaireObjectives() {
  const academic = useSelfAcademic();
  const stagiaireId = academic.stagiaireId;
  const { rows, loading, error } = useScopedRows<StageObjective>('stage_objectives', {
    scope: { stagiaire_id: stagiaireId },
    order: 'created_at.desc',
    enabled: Boolean(stagiaireId),
  });

  return (
    <SelfGate loading={academic.loading || loading} error={academic.error ?? error} onRetry={academic.reload}>
      <PageHeader
        eyebrow="Mon suivi"
        title="Mes objectifs de stage"
        description="Consultez les objectifs définis et leur niveau d’atteinte."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Objectifs" value={rows.length} tone="primary" icon={<FiFlag className="h-4 w-4" />} />
        <StatCard label="Atteints" value={rows.filter((row) => ['atteint', 'depasse'].includes(row.status)).length} tone="success" />
        <StatCard label="En cours" value={rows.filter((row) => row.status === 'en_cours').length} tone="warning" />
      </div>

      {rows.length === 0 ? (
        <SectionCard title="Objectifs">
          <p className="px-5 py-12 text-center text-sm text-body dark:text-body-dark">
            Aucun objectif de stage défini.
          </p>
        </SectionCard>
      ) : (
        <div className="space-y-3">
          {rows.map((objective) => (
            <div key={objective.id} className="card-root border border-stroke p-5 dark:border-white/10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-black dark:text-white">{objective.title}</p>
                  <p className="mt-1 text-sm text-body dark:text-body-dark">
                    {objective.description ?? 'Aucune description'}
                  </p>
                  {objective.validation_comment && (
                    <p className="mt-2 text-xs text-body dark:text-body-dark">
                      Validation : {objective.validation_comment}
                    </p>
                  )}
                </div>
                <Badge tone={statusTone(objective.status)}>
                  {optionLabel(OBJECTIVE_STATUS_OPTIONS, objective.status)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </SelfGate>
  );
}

export function StagiaireProject() {
  const academic = useSelfAcademic();
  const stagiaireId = academic.stagiaireId;
  const { rows, loading, error } = useScopedRows<FinalProject>('final_projects', {
    scope: { stagiaire_id: stagiaireId },
    order: 'created_at.desc',
    enabled: Boolean(stagiaireId),
  });

  const project = rows[0];

  return (
    <SelfGate loading={academic.loading || loading} error={academic.error ?? error} onRetry={academic.reload}>
      <PageHeader
        eyebrow="Mon suivi"
        title="Mon projet final"
        description="Consultez les informations de votre projet final et son évaluation."
      />

      {!project ? (
        <SectionCard title="Projet final">
          <p className="px-5 py-12 text-center text-sm text-body dark:text-body-dark">
            Aucun projet final enregistré.
          </p>
        </SectionCard>
      ) : (
        <div className="space-y-5">
          <SectionCard
            title={project.title}
            description={project.description ?? 'Aucune description'}
            actions={<Badge tone={statusTone(project.status)}>{project.status.replace('_', ' ')}</Badge>}
          >
            <DefinitionGrid
              columns={3}
              items={[
                ['Début', formatDate(project.start_date)],
                ['Fin', formatDate(project.end_date)],
                ['Soutenance', formatDate(project.defense_date)],
                ['Note', project.score !== null && project.score !== undefined ? `${project.score}/20` : '—'],
                ['Statut', project.status.replace('_', ' ')],
                ['Livrables', project.deliverables.length],
              ]}
            />
            {project.objectives && (
              <p className="border-t border-stroke px-5 py-4 text-sm text-body dark:border-white/10 dark:text-body-dark">
                <strong className="text-dark dark:text-white">Objectifs :</strong> {project.objectives}
              </p>
            )}
            {project.appreciation && (
              <p className="border-t border-stroke px-5 py-4 text-sm text-body dark:border-white/10 dark:text-body-dark">
                <strong className="text-dark dark:text-white">Appréciation :</strong> {project.appreciation}
              </p>
            )}
          </SectionCard>

          {project.deliverables.length > 0 && (
            <SectionCard title="Livrables attendus">
              <ul className="space-y-2 p-5 text-sm text-body dark:text-body-dark">
                {project.deliverables.map((deliverable) => (
                  <li key={deliverable}>{deliverable}</li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>
      )}
    </SelfGate>
  );
}
