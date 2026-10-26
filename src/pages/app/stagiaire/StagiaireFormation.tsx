import { useMemo } from 'react';
import { FiBookOpen, FiCalendar, FiClock, FiLayers } from 'react-icons/fi';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader, StatCard } from '@/components/ui/Feedback';
import { useScopedRows } from '@/hooks/useScopedRows';
import type { Module, Note } from '@/types/domain';
import { average, formatDate, round } from '@/utils/format';
import { DefinitionGrid, SelfGate, SectionCard } from './StagiaireShared';
import { useSelfAcademic } from './useStagiaireSelf';

type ModuleRow = Module & {
  noteAverage: number | null;
  evaluationsCount: number;
};

export default function StagiaireFormation() {
  const academic = useSelfAcademic();
  const stagiaireId = academic.stagiaireId;

  const { rows: notes, loading: notesLoading, error: notesError } = useScopedRows<Note>('notes', {
    scope: { stagiaire_id: stagiaireId },
    enabled: Boolean(stagiaireId),
  });

  const moduleRows = useMemo<ModuleRow[]>(() => {
    const published = notes.filter((note) => note.status === 'publiee');
    return academic.modules.map((module) => {
      const moduleEvaluations = academic.evaluations.filter(
        (evaluation) => evaluation.module_id === module.id,
      );
      const scores = published
        .filter((note) =>
          moduleEvaluations.some((evaluation) => evaluation.id === note.evaluation_id),
        )
        .filter((note) => note.score !== null && note.score !== undefined)
        .map((note) => round(((note.score ?? 0) / (note.max_score || 20)) * 20, 2));

      return {
        ...module,
        evaluationsCount: moduleEvaluations.length,
        noteAverage: scores.length > 0 ? average(scores) : null,
      };
    });
  }, [academic.modules, academic.evaluations, notes]);

  const totalHours = academic.modules.reduce((sum, module) => sum + (module.hours ?? 0), 0);
  const completedModules = moduleRows.filter(
    (module) => module.noteAverage !== null && module.noteAverage >= module.pass_mark,
  ).length;

  const columns: TableColumn<ModuleRow>[] = [
    {
      key: 'module',
      header: 'Module',
      render: (row) => (
        <div className="max-w-md">
          <p className="font-semibold text-black dark:text-white">{row.name}</p>
          <p className="text-xs text-body dark:text-body-dark">
            {row.description ?? 'Aucune description'}
          </p>
        </div>
      ),
    },
    {
      key: 'hours',
      header: 'Volume',
      hideBelow: 'md',
      render: (row) => `${row.hours} h`,
    },
    {
      key: 'coefficient',
      header: 'Coef.',
      hideBelow: 'lg',
      render: (row) => row.coefficient,
    },
    {
      key: 'evaluations',
      header: 'Évaluations',
      hideBelow: 'lg',
      render: (row) => row.evaluationsCount,
    },
    {
      key: 'average',
      header: 'Moyenne /20',
      render: (row) =>
        row.noteAverage === null ? (
          <Badge tone="neutral">En attente</Badge>
        ) : (
          <Badge tone={row.noteAverage >= row.pass_mark ? 'success' : 'danger'}>
            {row.noteAverage.toFixed(2)}
          </Badge>
        ),
    },
  ];

  return (
    <SelfGate loading={academic.loading || notesLoading} error={academic.error ?? notesError} onRetry={academic.reload}>
      <PageHeader
        eyebrow="Ma scolarité"
        title="Ma formation"
        description="Retrouvez votre parcours, les modules suivis et votre progression pédagogique."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Modules"
          value={academic.modules.length}
          tone="primary"
          icon={<FiLayers className="h-4 w-4" />}
        />
        <StatCard
          label="Volume horaire"
          value={`${totalHours} h`}
          tone="purple"
          icon={<FiClock className="h-4 w-4" />}
        />
        <StatCard
          label="Modules validés"
          value={completedModules}
          tone="success"
          icon={<FiBookOpen className="h-4 w-4" />}
        />
        <StatCard
          label="Évaluations"
          value={academic.evaluations.length}
          tone="warning"
          icon={<FiCalendar className="h-4 w-4" />}
        />
      </div>

      <SectionCard title="Parcours" className="mb-5">
        <DefinitionGrid
          columns={3}
          items={[
            ['Formation', academic.formation?.name ?? '—'],
            ['Niveau', academic.formation?.level ?? '—'],
            ['Domaine', academic.formation?.domain ?? academic.stagiaire?.domaine ?? '—'],
            ['Promotion', academic.promotion?.code ?? '—'],
            ['Début', formatDate(academic.promotion?.start_date ?? academic.inscription?.start_date)],
            ['Fin', formatDate(academic.promotion?.end_date ?? academic.inscription?.end_date)],
            ['Durée', academic.formation?.duration_months ? `${academic.formation.duration_months} mois` : '—'],
            ['Statut inscription', academic.inscription?.status ?? '—'],
            ['Matricule', academic.stagiaire?.matricule ?? '—'],
          ]}
        />
        {academic.formation?.description && (
          <p className="border-t border-stroke px-5 py-4 text-sm leading-relaxed text-body dark:border-white/10 dark:text-body-dark">
            {academic.formation.description}
          </p>
        )}
      </SectionCard>

      <SectionCard title="Modules et progression" description="Moyennes calculées à partir de vos notes publiées.">
        <DataTable
          columns={columns}
          rows={moduleRows}
          loading={academic.loading || notesLoading}
          error={academic.error ?? notesError}
          onRetry={academic.reload}
          emptyTitle="Aucun module"
          emptyDescription="Les modules de votre formation apparaîtront ici."
        />
      </SectionCard>
    </SelfGate>
  );
}
