import { useMemo } from 'react';
import { FiActivity, FiTarget, FiTrendingUp } from 'react-icons/fi';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader, StatCard } from '@/components/ui/Feedback';
import { useScopedRows } from '@/hooks/useScopedRows';
import type {
  CompetenceEvaluation,
  FinalEvaluation,
  Note,
  Presence,
  QcmAttempt,
  TravauxSoumission,
} from '@/types/domain';
import { average, percentage, round } from '@/utils/format';
import { SelfGate, SectionCard } from './StagiaireShared';
import { useSelfAcademic } from './useStagiaireSelf';

type ModuleProgress = {
  id: string;
  name: string;
  coefficient: number;
  average: number | null;
  evaluations: number;
};

export default function StagiaireProgression() {
  const academic = useSelfAcademic();
  const stagiaireId = academic.stagiaireId;

  const { rows: notes, loading: notesLoading, error: notesError } = useScopedRows<Note>('notes', {
    scope: { stagiaire_id: stagiaireId },
    enabled: Boolean(stagiaireId),
  });
  const { rows: presences, loading: presencesLoading } = useScopedRows<Presence>('presences', {
    scope: { stagiaire_id: stagiaireId },
    enabled: Boolean(stagiaireId),
  });
  const { rows: attempts, loading: attemptsLoading } = useScopedRows<QcmAttempt>('qcm_attempts', {
    scope: { stagiaire_id: stagiaireId },
    enabled: Boolean(stagiaireId),
  });
  const { rows: submissions, loading: submissionsLoading } = useScopedRows<TravauxSoumission>(
    'travaux_soumissions',
    {
      scope: { stagiaire_id: stagiaireId },
      enabled: Boolean(stagiaireId),
    },
  );
  const { rows: levels, loading: levelsLoading } = useScopedRows<CompetenceEvaluation>(
    'competence_levels',
    {
      scope: { stagiaire_id: stagiaireId },
      order: 'evaluated_at.desc',
      enabled: Boolean(stagiaireId),
    },
  );
  const { rows: finals } = useScopedRows<FinalEvaluation>('final_evaluations', {
    scope: { stagiaire_id: stagiaireId },
    order: 'created_at.desc',
    limit: 1,
    enabled: Boolean(stagiaireId),
  });

  const moduleRows = useMemo<ModuleProgress[]>(() => {
    const published = notes.filter((note) => note.status === 'publiee');
    return academic.modules.map((module) => {
      const evaluations = academic.evaluations.filter(
        (evaluation) => evaluation.module_id === module.id,
      );
      const scores = published
        .filter((note) => evaluations.some((evaluation) => evaluation.id === note.evaluation_id))
        .filter((note) => note.score !== null && note.score !== undefined)
        .map((note) => round(((note.score ?? 0) / (note.max_score || 20)) * 20, 2));
      return {
        id: module.id,
        name: module.name,
        coefficient: module.coefficient,
        evaluations: evaluations.length,
        average: scores.length ? average(scores) : null,
      };
    });
  }, [academic.modules, academic.evaluations, notes]);

  const stats = useMemo(() => {
    const moduleAverages = moduleRows
      .filter((module) => module.average !== null)
      .map((module) => module.average as number);
    const present = presences.filter((presence) =>
      ['present', 'retard', 'sortie_autorisee'].includes(presence.status),
    ).length;
    const qcmScores = attempts
      .filter((attempt) => attempt.percentage !== null && attempt.percentage !== undefined)
      .map((attempt) => round(((attempt.percentage ?? 0) / 100) * 20, 2));
    const tpScores = submissions
      .filter((submission) => submission.score !== null && submission.score !== undefined)
      .map((submission) => round(submission.score as number, 2));
    const latest = new Map<string, CompetenceEvaluation>();
    levels.forEach((level) => {
      if (!latest.has(level.competence_id)) latest.set(level.competence_id, level);
    });
    const acquired = Array.from(latest.values()).filter((level) =>
      ['acquis', 'maitrise'].includes(level.level),
    ).length;

    return {
      moduleAverage: average(moduleAverages),
      modulesEvaluated: moduleAverages.length,
      attendanceRate: percentage(present, Math.max(presences.length, 1)),
      qcmAverage: average(qcmScores),
      tpAverage: average(tpScores),
      acquired,
      totalCompetences: latest.size,
      finalAverage: finals[0]?.final_average ?? null,
      decision: finals[0]?.decision ?? null,
    };
  }, [moduleRows, presences, attempts, submissions, levels, finals]);

  const columns: TableColumn<ModuleProgress>[] = [
    { key: 'module', header: 'Module', render: (row) => <span className="font-medium text-black dark:text-white">{row.name}</span> },
    { key: 'coefficient', header: 'Coef.', hideBelow: 'md', render: (row) => row.coefficient },
    { key: 'evaluations', header: 'Évaluations', hideBelow: 'md', render: (row) => row.evaluations },
    {
      key: 'average',
      header: 'Moyenne /20',
      render: (row) =>
        row.average === null ? (
          <Badge tone="neutral">Non évalué</Badge>
        ) : (
          <Badge tone={row.average >= 10 ? 'success' : 'danger'}>{row.average.toFixed(2)}</Badge>
        ),
    },
    {
      key: 'progress',
      header: 'Progression',
      render: (row) => (
        <div className="h-2 w-32 bg-gray2 dark:bg-white/10">
          <div
            className={row.average !== null && row.average >= 10 ? 'h-2 bg-emerald-500' : 'h-2 bg-amber-500'}
            style={{ width: `${Math.min(Math.max(((row.average ?? 0) / 20) * 100, 0), 100)}%` }}
          />
        </div>
      ),
    },
  ];

  const loading =
    academic.loading || notesLoading || presencesLoading || attemptsLoading || submissionsLoading || levelsLoading;

  return (
    <SelfGate loading={loading} error={academic.error ?? notesError} onRetry={academic.reload}>
      <PageHeader
        eyebrow="Mon suivi"
        title="Ma progression"
        description="Synthèse de vos résultats, de votre assiduité et de vos compétences."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Moyenne modules" value={`${stats.moduleAverage.toFixed(2)}/20`} tone={stats.moduleAverage >= 10 ? 'success' : 'danger'} hint={`${stats.modulesEvaluated} module(s) évalué(s)`} icon={<FiTrendingUp className="h-4 w-4" />} />
        <StatCard label="Assiduité" value={`${stats.attendanceRate}%`} tone={stats.attendanceRate >= 80 ? 'success' : 'warning'} />
        <StatCard label="QCM" value={stats.qcmAverage ? `${stats.qcmAverage.toFixed(2)}/20` : '—'} tone="purple" />
        <StatCard label="Travaux pratiques" value={stats.tpAverage ? `${stats.tpAverage.toFixed(2)}/20` : '—'} tone="primary" />
        <StatCard label="Compétences" value={`${stats.acquired}/${stats.totalCompetences}`} tone="success" icon={<FiActivity className="h-4 w-4" />} />
        <StatCard label="Moyenne finale" value={stats.finalAverage !== null ? `${stats.finalAverage}/20` : '—'} tone="primary" icon={<FiTarget className="h-4 w-4" />} />
        <StatCard label="Décision" value={stats.decision ? stats.decision.replace('_', ' ') : 'En attente'} tone="warning" />
        <StatCard label="Modules suivis" value={academic.modules.length} tone="purple" />
      </div>

      <SectionCard title="Progression par module">
        <DataTable
          columns={columns}
          rows={moduleRows}
          emptyTitle="Aucun module"
          emptyDescription="La progression par module apparaîtra ici."
        />
      </SectionCard>
    </SelfGate>
  );
}
