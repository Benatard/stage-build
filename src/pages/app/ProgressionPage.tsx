import { useMemo, useState } from 'react';
import { FiActivity, FiAward, FiCheckCircle, FiTrendingUp } from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader, StatCard } from '@/components/ui/Feedback';
import { Select } from '@/components/ui/Form';
import { useAuth } from '@/context/AuthContext';
import { useForgeTable } from '@/hooks/useForgeTable';
import { useReferenceData } from '@/hooks/useReferenceData';
import { COMPETENCE_LEVEL_OPTIONS, optionLabel } from '@/config/options';
import type {
  CompetenceEvaluation,
  Comportement,
  Implication,
  Note,
  Presence,
  QcmAttempt,
  TravauxSoumission,
} from '@/types/domain';
import { average, formatDate, fullName, percentage, round } from '@/utils/format';
import { buildOptions } from '@/utils/options';

type ModuleStat = {
  id: string;
  name: string;
  average: number;
  count: number;
};

export default function ProgressionPage() {
  const { data } = useReferenceData();
  const { user } = useAuth();
  const [stagiaireId, setStagiaireId] = useState(user?.stagiaire_id ?? '');

  const enabled = Boolean(stagiaireId);

  const { rows: notes, loading: notesLoading } = useForgeTable<Note>('notes', {
    filters: { stagiaire_id: stagiaireId },
    enabled,
  });
  const { rows: presences } = useForgeTable<Presence>('presences', {
    filters: { stagiaire_id: stagiaireId },
    enabled,
  });
  const { rows: competencyLevels } = useForgeTable<CompetenceEvaluation>('competence_levels', {
    filters: { stagiaire_id: stagiaireId },
    order: 'evaluated_at.desc',
    enabled,
  });
  const { rows: implications } = useForgeTable<Implication>('implications', {
    filters: { stagiaire_id: stagiaireId },
    enabled,
  });
  const { rows: behaviors } = useForgeTable<Comportement>('comportements', {
    filters: { stagiaire_id: stagiaireId },
    enabled,
  });
  const { rows: attempts } = useForgeTable<QcmAttempt>('qcm_attempts', {
    filters: { stagiaire_id: stagiaireId },
    enabled,
  });
  const { rows: submissions } = useForgeTable<TravauxSoumission>('travaux_soumissions', {
    filters: { stagiaire_id: stagiaireId },
    enabled,
  });

  const stagiaire = data.stagiaires.find((item) => item.id === stagiaireId);

  const normalizedNotes = useMemo(
    () =>
      notes.map((note) => ({
        ...note,
        normalized: note.score !== null && note.score !== undefined
          ? round((note.score / (note.max_score || 20)) * 20, 2)
          : null,
      })),
    [notes],
  );

  const moduleStats = useMemo<ModuleStat[]>(() => {
    const groups = new Map<string, { name: string; scores: number[] }>();

    normalizedNotes.forEach((note) => {
      if (note.normalized === null) return;
      const evaluation = data.evaluations.find((item) => item.id === note.evaluation_id);
      if (!evaluation) return;
      const module = data.modules.find((item) => item.id === evaluation.module_id);
      const key = module?.id ?? 'sans-module';
      const current = groups.get(key) ?? { name: module?.name ?? 'Sans module', scores: [] };
      current.scores.push(note.normalized);
      groups.set(key, current);
    });

    return Array.from(groups.entries()).map(([id, group]) => ({
      id,
      name: group.name,
      average: average(group.scores),
      count: group.scores.length,
    }));
  }, [normalizedNotes, data.evaluations, data.modules]);

  const attendance = useMemo(() => {
    const total = presences.length;
    const present = presences.filter((presence) =>
      ['present', 'retard', 'sortie_autorisee'].includes(presence.status),
    ).length;
    return {
      total,
      present,
      absent: total - present,
      rate: percentage(present, Math.max(total, 1)),
    };
  }, [presences]);

  const latestCompetencies = useMemo(() => {
    const seen = new Set<string>();
    return competencyLevels.filter((level) => {
      if (seen.has(level.competence_id)) return false;
      seen.add(level.competence_id);
      return true;
    });
  }, [competencyLevels]);

  const acquiredCount = latestCompetencies.filter((level) =>
    ['acquis', 'maitrise'].includes(level.level),
  ).length;

  const overallAverage = average(moduleStats.map((stat) => stat.average));
  const implicationAverage = average(implications.map((item) => item.average));
  const behaviorAverage = average(behaviors.map((item) => item.average));
  const qcmAverage = average(
    attempts
      .filter((attempt) => attempt.status === 'corrige')
      .map((attempt) => attempt.percentage),
  );
  const tpAverage = average(submissions.map((item) => item.score));

  const moduleColumns: TableColumn<ModuleStat>[] = [
    { key: 'module', header: 'Module', render: (row) => row.name },
    { key: 'notes', header: 'Notes', render: (row) => row.count },
    {
      key: 'average',
      header: 'Moyenne /20',
      render: (row) => (
        <Badge tone={statusTone(row.average >= 10 ? 'acquis' : 'non_acquis')}>
          {row.average.toFixed(2)}
        </Badge>
      ),
    },
    {
      key: 'bar',
      header: 'Progression',
      render: (row) => (
        <div className="h-2 w-full max-w-[220px] bg-gray2 dark:bg-white/10">
          <div
            className={`h-2 ${row.average >= 10 ? 'bg-emerald-500' : 'bg-rose-500'}`}
            style={{ width: `${Math.min(100, (row.average / 20) * 100)}%` }}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Suivi"
        title="Progression individualisée"
        description="Synthèse consolidée des notes, présences, compétences, implication et comportement."
      />

      <div className="mb-5 card-root border border-stroke p-5 dark:border-white/10">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-body dark:text-body-dark">
          Stagiaire
        </label>
        <Select
          value={stagiaireId}
          placeholder="Sélectionner un stagiaire…"
          options={buildOptions(data.stagiaires, (item) => `${fullName(item)} (${item.matricule})`)}
          onChange={(event) => setStagiaireId(event.target.value)}
        />
        {stagiaire && (
          <p className="mt-3 text-xs text-body dark:text-body-dark">
            {fullName(stagiaire)} · {stagiaire.domaine ?? 'Domaine non précisé'} ·{' '}
            {stagiaire.specialite ?? 'Spécialité non précisée'}
          </p>
        )}
      </div>

      {!stagiaireId ? (
        <div className="card-root border border-stroke px-6 py-16 text-center text-sm text-body dark:border-white/10 dark:text-body-dark">
          Sélectionnez un stagiaire pour afficher sa progression.
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Moyenne générale" value={`${overallAverage.toFixed(2)}/20`} tone={overallAverage >= 10 ? 'success' : 'danger'} icon={<FiTrendingUp className="h-4 w-4" />} />
            <StatCard label="Taux de présence" value={`${attendance.rate}%`} tone={attendance.rate >= 80 ? 'success' : 'warning'} icon={<FiActivity className="h-4 w-4" />} />
            <StatCard label="Compétences acquises" value={`${acquiredCount}/${latestCompetencies.length}`} tone="purple" icon={<FiAward className="h-4 w-4" />} />
            <StatCard label="Implication" value={`${implicationAverage.toFixed(2)}/5`} tone="primary" icon={<FiCheckCircle className="h-4 w-4" />} />
          </div>

          <div className="mb-5 grid gap-4 md:grid-cols-3">
            <div className="card-root border border-stroke p-4 dark:border-white/10">
              <p className="text-xs uppercase tracking-wide text-body dark:text-body-dark">Assiduité</p>
              <p className="mt-1 text-lg font-bold text-black dark:text-white">{attendance.present} présences</p>
              <p className="text-xs text-body dark:text-body-dark">{attendance.absent} absence(s) sur {attendance.total} séance(s)</p>
            </div>
            <div className="card-root border border-stroke p-4 dark:border-white/10">
              <p className="text-xs uppercase tracking-wide text-body dark:text-body-dark">QCM</p>
              <p className="mt-1 text-lg font-bold text-black dark:text-white">{qcmAverage.toFixed(1)}%</p>
              <p className="text-xs text-body dark:text-body-dark">{attempts.length} tentative(s)</p>
            </div>
            <div className="card-root border border-stroke p-4 dark:border-white/10">
              <p className="text-xs uppercase tracking-wide text-body dark:text-body-dark">Travaux / comportement</p>
              <p className="mt-1 text-lg font-bold text-black dark:text-white">{tpAverage.toFixed(2)}/20 · {behaviorAverage.toFixed(2)}/5</p>
              <p className="text-xs text-body dark:text-body-dark">{submissions.length} dépôt(s)</p>
            </div>
          </div>

          <div className="mb-5 card-root border border-stroke dark:border-white/10">
            <div className="border-b border-stroke px-5 py-4 dark:border-white/10">
              <h2 className="text-sm font-bold text-black dark:text-white">Moyennes par module</h2>
            </div>
            <DataTable
              columns={moduleColumns}
              rows={moduleStats}
              loading={notesLoading}
              emptyTitle="Aucune note disponible"
              emptyDescription="Les moyennes apparaîtront dès la saisie des notes."
            />
          </div>

          <div className="card-root border border-stroke dark:border-white/10">
            <div className="border-b border-stroke px-5 py-4 dark:border-white/10">
              <h2 className="text-sm font-bold text-black dark:text-white">Derniers niveaux de compétences</h2>
            </div>
            {latestCompetencies.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-body dark:text-body-dark">
                Aucune compétence évaluée.
              </p>
            ) : (
              <div className="divide-y divide-stroke dark:divide-white/5">
                {latestCompetencies.map((level) => {
                  const competence = data.competences.find((item) => item.id === level.competence_id);
                  return (
                    <div key={level.id} className="flex items-center justify-between gap-4 px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-black dark:text-white">
                          {competence?.name ?? 'Compétence'}
                        </p>
                        <p className="text-xs text-body dark:text-body-dark">
                          Évaluée le {formatDate(level.evaluated_at)}
                        </p>
                      </div>
                      <Badge tone={statusTone(level.level)}>
                        {optionLabel(COMPETENCE_LEVEL_OPTIONS, level.level)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
