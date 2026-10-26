import { useMemo } from 'react';
import { FiAward, FiTrendingUp } from 'react-icons/fi';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader, StatCard } from '@/components/ui/Feedback';
import { EVALUATION_TYPE_OPTIONS, optionLabel } from '@/config/options';
import { useScopedRows } from '@/hooks/useScopedRows';
import type { Evaluation, Note } from '@/types/domain';
import { average, formatDate, round } from '@/utils/format';
import { SelfGate, SectionCard } from './StagiaireShared';
import { useSelfAcademic } from './useStagiaireSelf';

type NoteRow = Note & {
  evaluation: Evaluation | undefined;
  moduleName: string;
};

export default function StagiaireNotes() {
  const academic = useSelfAcademic();
  const stagiaireId = academic.stagiaireId;

  const { rows: notes, loading, error, reload } = useScopedRows<Note>('notes', {
    scope: { stagiaire_id: stagiaireId },
    order: 'created_at.desc',
    enabled: Boolean(stagiaireId),
  });

  const rows = useMemo<NoteRow[]>(
    () =>
      notes
        .filter((note) => note.status === 'publiee')
        .map((note) => {
          const evaluation = academic.evaluations.find(
            (item) => item.id === note.evaluation_id,
          );
          return {
            ...note,
            evaluation,
            moduleName:
              academic.modules.find((module) => module.id === evaluation?.module_id)?.name ??
              'Module non précisé',
          };
        }),
    [notes, academic.evaluations, academic.modules],
  );

  const stats = useMemo(() => {
    const normalized = rows
      .filter((row) => row.score !== null && row.score !== undefined)
      .map((row) => round(((row.score ?? 0) / (row.max_score || 20)) * 20, 2));
    return {
      average: average(normalized),
      count: normalized.length,
      passed: normalized.filter((score) => score >= 10).length,
    };
  }, [rows]);

  const columns: TableColumn<NoteRow>[] = [
    {
      key: 'evaluation',
      header: 'Évaluation',
      render: (row) => (
        <div className="max-w-md">
          <p className="font-semibold text-black dark:text-white">
            {row.evaluation?.title ?? 'Évaluation'}
          </p>
          <p className="text-xs text-body dark:text-body-dark">
            {optionLabel(EVALUATION_TYPE_OPTIONS, row.evaluation?.type)} · {formatDate(row.evaluation?.date)}
          </p>
        </div>
      ),
    },
    {
      key: 'module',
      header: 'Module',
      hideBelow: 'md',
      render: (row) => row.moduleName,
    },
    {
      key: 'score',
      header: 'Note',
      render: (row) => {
        const normalized = ((row.score ?? 0) / (row.max_score || 20)) * 20;
        return (
          <Badge tone={normalized >= 10 ? 'success' : 'danger'}>
            {row.score ?? '—'}/{row.max_score}
          </Badge>
        );
      },
    },
    {
      key: 'coefficient',
      header: 'Coefficient',
      hideBelow: 'lg',
      render: (row) => row.coefficient,
    },
    {
      key: 'comment',
      header: 'Appréciation',
      hideBelow: 'lg',
      render: (row) => row.comment ?? '—',
    },
  ];

  return (
    <SelfGate loading={academic.loading || loading} error={academic.error ?? error} onRetry={academic.reload}>
      <PageHeader
        eyebrow="Ma scolarité"
        title="Mes notes"
        description="Seules les notes publiées par l’équipe pédagogique sont affichées. Elles sont en lecture seule."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Moyenne publiée" value={`${stats.average.toFixed(2)}/20`} tone={stats.average >= 10 ? 'success' : 'danger'} icon={<FiTrendingUp className="h-4 w-4" />} />
        <StatCard label="Notes publiées" value={stats.count} tone="primary" />
        <StatCard label="Réussites" value={stats.passed} tone="success" icon={<FiAward className="h-4 w-4" />} />
      </div>

      <SectionCard title="Relevé des notes publiées">
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyTitle="Aucune note publiée"
          emptyDescription="Vos notes apparaîtront ici après publication."
        />
      </SectionCard>
    </SelfGate>
  );
}
