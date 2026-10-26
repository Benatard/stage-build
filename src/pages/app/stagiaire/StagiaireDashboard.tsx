import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FiAward,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClipboard,
  FiFileText,
  FiTarget,
  FiTrendingUp,
} from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { PageHeader, StatCard } from '@/components/ui/Feedback';
import { useScopedRows } from '@/hooks/useScopedRows';
import type {
  Bulletin,
  CompetenceEvaluation,
  FinalEvaluation,
  ImprovementPlan,
  Note,
  Presence,
  StageJournal,
} from '@/types/domain';
import {
  average,
  formatDate,
  formatDateTime,
  formatTime,
  percentage,
  round,
  todayISO,
} from '@/utils/format';
import { optionLabel, EVALUATION_TYPE_OPTIONS } from '@/config/options';
import { SelfGate, SectionCard } from './StagiaireShared';
import { useSelfAcademic } from './useStagiaireSelf';

export default function StagiaireDashboard() {
  const academic = useSelfAcademic();
  const stagiaireId = academic.stagiaireId;

  const { rows: notes, loading: notesLoading } = useScopedRows<Note>('notes', {
    scope: { stagiaire_id: stagiaireId },
    order: 'created_at.desc',
    enabled: Boolean(stagiaireId),
  });
  const { rows: presences, loading: presencesLoading } = useScopedRows<Presence>('presences', {
    scope: { stagiaire_id: stagiaireId },
    order: 'recorded_at.desc',
    enabled: Boolean(stagiaireId),
  });
  const { rows: journal, loading: journalLoading } = useScopedRows<StageJournal>('stage_journal', {
    scope: { stagiaire_id: stagiaireId },
    order: 'date.desc',
    limit: 5,
    enabled: Boolean(stagiaireId),
  });
  const { rows: plans, loading: plansLoading } = useScopedRows<ImprovementPlan>(
    'improvement_plans',
    {
      scope: { stagiaire_id: stagiaireId },
      order: 'created_at.desc',
      enabled: Boolean(stagiaireId),
    },
  );
  const { rows: bulletins } = useScopedRows<Bulletin>('bulletins', {
    scope: { stagiaire_id: stagiaireId },
    order: 'generated_at.desc',
    enabled: Boolean(stagiaireId),
  });
  const { rows: finals } = useScopedRows<FinalEvaluation>('final_evaluations', {
    scope: { stagiaire_id: stagiaireId },
    order: 'created_at.desc',
    limit: 1,
    enabled: Boolean(stagiaireId),
  });
  const { rows: levels } = useScopedRows<CompetenceEvaluation>('competence_levels', {
    scope: { stagiaire_id: stagiaireId },
    order: 'evaluated_at.desc',
    enabled: Boolean(stagiaireId),
  });
  const publishedNotes = useMemo(
    () => notes.filter((note) => note.status === 'publiee'),
    [notes],
  );

  const stats = useMemo(() => {
    const normalized = publishedNotes
      .filter((note) => note.score !== null && note.score !== undefined)
      .map((note) => round(((note.score ?? 0) / (note.max_score || 20)) * 20, 2));
    const present = presences.filter((presence) =>
      ['present', 'retard', 'sortie_autorisee'].includes(presence.status),
    ).length;
    const latestCompetences = new Map<string, CompetenceEvaluation>();
    levels.forEach((level) => {
      if (!latestCompetences.has(level.competence_id)) {
        latestCompetences.set(level.competence_id, level);
      }
    });
    const acquired = Array.from(latestCompetences.values()).filter((level) =>
      ['acquis', 'maitrise'].includes(level.level),
    ).length;
    const final = finals[0];
    const publishedBulletin = bulletins.find((bulletin) => bulletin.status === 'publie');

    return {
      average: average(normalized),
      notesCount: normalized.length,
      attendanceRate: percentage(present, Math.max(presences.length, 1)),
      competences: latestCompetences.size,
      acquired,
      finalAverage: final?.final_average ?? null,
      decision: final?.decision ?? null,
      publishedBulletin,
    };
  }, [publishedNotes, presences, levels, finals, bulletins]);

  const upcomingSeances = useMemo(
    () =>
      academic.seances
        .filter((seance) => seance.date >= todayISO() && seance.status !== 'annulee')
        .slice(0, 5),
    [academic.seances],
  );

  const upcomingEvaluations = useMemo(
    () =>
      academic.evaluations
        .filter(
          (evaluation) =>
            evaluation.date &&
            evaluation.date >= todayISO() &&
            !['brouillon', 'archivee'].includes(evaluation.status),
        )
        .sort((left, right) => (left.date ?? '').localeCompare(right.date ?? ''))
        .slice(0, 5),
    [academic.evaluations],
  );

  const activePlans = plans.filter((plan) => ['cree', 'en_cours'].includes(plan.status));
  const loading =
    academic.loading || notesLoading || presencesLoading || journalLoading || plansLoading;

  return (
    <SelfGate loading={loading} error={academic.error} onRetry={academic.reload}>
      <PageHeader
        eyebrow="Mon espace"
        title={`Bonjour, ${academic.stagiaire?.prenom ?? ''}`}
        description={`${academic.formation?.name ?? 'Formation'} · ${academic.promotion?.code ?? 'Promotion non définie'} · ${academic.stagiaire?.matricule ?? ''}`}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Moyenne publiée"
          value={`${stats.average.toFixed(2)}/20`}
          tone={stats.average >= 10 ? 'success' : 'danger'}
          hint={`${stats.notesCount} note(s) publiée(s)`}
          icon={<FiTrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Assiduité"
          value={`${stats.attendanceRate}%`}
          tone={stats.attendanceRate >= 80 ? 'success' : 'warning'}
          hint={`${presences.length} pointage(s)`}
          icon={<FiCheckCircle className="h-4 w-4" />}
        />
        <StatCard
          label="Compétences"
          value={`${stats.acquired}/${stats.competences}`}
          tone="purple"
          hint="Acquises ou maîtrisées"
          icon={<FiAward className="h-4 w-4" />}
        />
        <StatCard
          label="Moyenne finale"
          value={stats.finalAverage !== null ? `${stats.finalAverage}/20` : '—'}
          tone="primary"
          hint={stats.decision ? `Décision : ${stats.decision.replace('_', ' ')}` : 'En attente'}
          icon={<FiTarget className="h-4 w-4" />}
        />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Prochaines séances">
          {upcomingSeances.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-body dark:text-body-dark">
              Aucune séance à venir.
            </p>
          ) : (
            <div className="divide-y divide-stroke dark:divide-white/5">
              {upcomingSeances.map((seance) => (
                <div key={seance.id} className="flex items-center gap-4 px-5 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary">
                    <FiCalendar className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-black dark:text-white">
                      {seance.title ??
                        academic.modules.find((module) => module.id === seance.module_id)?.name ??
                        'Séance'}
                    </p>
                    <p className="text-xs text-body dark:text-body-dark">
                      {formatDate(seance.date)} · {formatTime(seance.start_time)} ·{' '}
                      {seance.room ?? 'Salle à confirmer'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Prochaines évaluations">
          {upcomingEvaluations.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-body dark:text-body-dark">
              Aucune évaluation programmée.
            </p>
          ) : (
            <div className="divide-y divide-stroke dark:divide-white/5">
              {upcomingEvaluations.map((evaluation) => (
                <div key={evaluation.id} className="flex items-center gap-4 px-5 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                    <FiBookOpen className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-black dark:text-white">
                      {evaluation.title}
                    </p>
                    <p className="text-xs text-body dark:text-body-dark">
                      {formatDate(evaluation.date)} ·{' '}
                      {optionLabel(EVALUATION_TYPE_OPTIONS, evaluation.type)}
                    </p>
                  </div>
                  <Badge tone={statusTone(evaluation.status)}>
                    {evaluation.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SectionCard title="Dernières notes publiées">
          {publishedNotes.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-body dark:text-body-dark">
              Aucune note publiée pour le moment.
            </p>
          ) : (
            <div className="divide-y divide-stroke dark:divide-white/5">
              {publishedNotes.slice(0, 5).map((note) => {
                const evaluation = academic.evaluations.find(
                  (item) => item.id === note.evaluation_id,
                );
                return (
                  <div key={note.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-black dark:text-white">
                        {evaluation?.title ?? 'Évaluation'}
                      </p>
                      <p className="text-xs text-body dark:text-body-dark">
                        {formatDate(evaluation?.date)}
                      </p>
                    </div>
                    <Badge tone={(note.score ?? 0) / (note.max_score || 20) >= 0.5 ? 'success' : 'danger'}>
                      {note.score}/{note.max_score}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Journal récent"
          actions={
            <Link to="/app/mon-espace/journal" className="text-xs font-semibold text-primary hover:underline">
              Ouvrir
            </Link>
          }
        >
          {journal.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-body dark:text-body-dark">
              Aucune activité consignée.
            </p>
          ) : (
            <div className="divide-y divide-stroke dark:divide-white/5">
              {journal.map((entry) => (
                <div key={entry.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-body dark:text-body-dark">
                      {formatDate(entry.date)}
                    </p>
                    <Badge tone={statusTone(entry.status)}>{entry.status.replace('_', ' ')}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-dark dark:text-white">
                    {entry.activity}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Points d’attention">
          <div className="space-y-3 p-5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-body dark:text-body-dark">
                <FiTarget className="h-4 w-4 text-amber-500" /> Plans en cours
              </span>
              <strong className="text-dark dark:text-white">{activePlans.length}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-body dark:text-body-dark">
                <FiClipboard className="h-4 w-4 text-primary" /> Notes publiées
              </span>
              <strong className="text-dark dark:text-white">{publishedNotes.length}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-body dark:text-body-dark">
                <FiFileText className="h-4 w-4 text-emerald-500" /> Bulletin
              </span>
              <strong className="text-dark dark:text-white">
                {stats.publishedBulletin ? 'Publié' : 'Non publié'}
              </strong>
            </div>
            {activePlans.length > 0 && (
              <Link
                to="/app/mon-espace/plans"
                className="mt-2 inline-flex text-xs font-semibold text-primary hover:underline"
              >
                Consulter mes plans d’amélioration →
              </Link>
            )}
          </div>
        </SectionCard>
      </div>

      {stats.publishedBulletin && (
        <p className="mt-5 text-xs text-body dark:text-body-dark">
          Bulletin publié le {formatDateTime(stats.publishedBulletin.published_at ?? stats.publishedBulletin.generated_at)}.
        </p>
      )}
    </SelfGate>
  );
}
