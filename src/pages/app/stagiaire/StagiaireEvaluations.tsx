import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FiCalendar, FiClipboard, FiClock } from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader, StatCard } from '@/components/ui/Feedback';
import { EVALUATION_TYPE_OPTIONS, optionLabel } from '@/config/options';
import { useScopedRows } from '@/hooks/useScopedRows';
import type { Evaluation, Note } from '@/types/domain';
import { formatDate, todayISO } from '@/utils/format';
import { SelfGate, SectionCard } from './StagiaireShared';
import { useSelfAcademic } from './useStagiaireSelf';

type EvaluationRow = Evaluation & {
  note: Note | null;
};

export default function StagiaireEvaluations() {
  const academic = useSelfAcademic();
  const stagiaireId = academic.stagiaireId;

  const { rows: notes, loading: notesLoading, error: notesError, reload: reloadNotes } =
    useScopedRows<Note>('notes', {
      scope: { stagiaire_id: stagiaireId },
      enabled: Boolean(stagiaireId),
    });

  const rows = useMemo<EvaluationRow[]>(
    () =>
      academic.evaluations
        .filter((evaluation) => !['brouillon', 'archivee'].includes(evaluation.status))
        .map((evaluation) => ({
          ...evaluation,
          note: notes.find((note) => note.evaluation_id === evaluation.id) ?? null,
        })),
    [academic.evaluations, notes],
  );

  const upcoming = rows.filter((row) => row.date && row.date >= todayISO());
  const publishedNotes = notes.filter((note) => note.status === 'publiee');

  const columns: TableColumn<EvaluationRow>[] = [
    {
      key: 'title',
      header: 'Évaluation',
      render: (row) => (
        <div className="max-w-md">
          <p className="font-semibold text-black dark:text-white">{row.title}</p>
          <p className="text-xs text-body dark:text-body-dark">
            {academic.modules.find((module) => module.id === row.module_id)?.name ?? 'Module non précisé'}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      hideBelow: 'md',
      render: (row) => optionLabel(EVALUATION_TYPE_OPTIONS, row.type),
    },
    {
      key: 'date',
      header: 'Date',
      render: (row) => formatDate(row.date),
    },
    {
      key: 'duration',
      header: 'Durée',
      hideBelow: 'lg',
      render: (row) => (row.duration_minutes ? `${row.duration_minutes} min` : '—'),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => (
        <Badge tone={statusTone(row.status)}>{row.status.replace('_', ' ')}</Badge>
      ),
    },
    {
      key: 'result',
      header: 'Mon résultat',
      render: (row) =>
        row.note && row.note.status === 'publiee' ? (
          <Badge tone={(row.note.score ?? 0) / (row.note.max_score || 20) >= 0.5 ? 'success' : 'danger'}>
            {row.note.score ?? '—'}/{row.note.max_score}
          </Badge>
        ) : row.is_qcm && ['programmee', 'en_cours', 'terminee'].includes(row.status) ? (
          <Link to="/app/mon-espace/qcm" className="text-xs font-semibold text-primary hover:underline">
            Passer le QCM
          </Link>
        ) : (
          <span className="text-xs text-body dark:text-body-dark">Non publié</span>
        ),
    },
  ];

  return (
    <SelfGate
      loading={academic.loading || notesLoading}
      error={academic.error ?? notesError}
      onRetry={() => {
        academic.reload();
        reloadNotes();
      }}
    >
      <PageHeader
        eyebrow="Ma scolarité"
        title="Mes évaluations"
        description="Consultez les évaluations de votre formation et vos résultats publiés."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Évaluations" value={rows.length} tone="primary" icon={<FiClipboard className="h-4 w-4" />} />
        <StatCard label="À venir" value={upcoming.length} tone="warning" icon={<FiCalendar className="h-4 w-4" />} />
        <StatCard label="Résultats publiés" value={publishedNotes.length} tone="success" />
        <StatCard
          label="QCM"
          value={rows.filter((row) => row.is_qcm).length}
          tone="purple"
          icon={<FiClock className="h-4 w-4" />}
        />
      </div>

      <SectionCard title="Liste des évaluations" description="Les notes ne sont visibles qu’après publication par l’équipe pédagogique.">
        <DataTable
          columns={columns}
          rows={rows}
          loading={academic.loading || notesLoading}
          error={academic.error ?? notesError}
          onRetry={academic.reload}
          emptyTitle="Aucune évaluation"
          emptyDescription="Les évaluations de votre formation apparaîtront ici."
        />
      </SectionCard>
    </SelfGate>
  );
}
