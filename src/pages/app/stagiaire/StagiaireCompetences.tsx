import { useMemo } from 'react';
import { FiAward, FiTrendingUp } from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { PageHeader, StatCard } from '@/components/ui/Feedback';
import { COMPETENCE_LEVEL_OPTIONS, optionLabel } from '@/config/options';
import { useScopedRows } from '@/hooks/useScopedRows';
import type { Competence, CompetenceEvaluation } from '@/types/domain';
import { formatDate } from '@/utils/format';
import { SelfGate, SectionCard } from './StagiaireShared';
import { useSelfAcademic } from './useStagiaireSelf';

export default function StagiaireCompetences() {
  const academic = useSelfAcademic();
  const stagiaireId = academic.stagiaireId;
  const formationId = academic.formationId;

  const { rows: levels, loading, error } = useScopedRows<CompetenceEvaluation>(
    'competence_levels',
    {
      scope: { stagiaire_id: stagiaireId },
      order: 'evaluated_at.desc',
      enabled: Boolean(stagiaireId),
    },
  );

  const { rows: competences } = useScopedRows<Competence>('competences', {
    scope: { formation_id: formationId },
    order: 'sort_order.asc',
    enabled: Boolean(formationId),
  });

  const latest = useMemo(() => {
    const seen = new Set<string>();
    return levels
      .filter((level) => {
        if (seen.has(level.competence_id)) return false;
        seen.add(level.competence_id);
        return true;
      })
      .map((level) => ({
        ...level,
        competence: competences.find((competence) => competence.id === level.competence_id),
      }));
  }, [levels, competences]);

  const acquired = latest.filter((level) => ['acquis', 'maitrise'].includes(level.level)).length;
  const inProgress = latest.filter((level) => ['en_cours', 'a_renforcer'].includes(level.level)).length;

  return (
    <SelfGate loading={academic.loading || loading} error={academic.error ?? error} onRetry={academic.reload}>
      <PageHeader
        eyebrow="Ma scolarité"
        title="Mes compétences"
        description="Suivez les compétences évaluées par vos formateurs. Les niveaux sont en lecture seule."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Compétences évaluées" value={latest.length} tone="primary" icon={<FiAward className="h-4 w-4" />} />
        <StatCard label="Acquises / maîtrisées" value={acquired} tone="success" icon={<FiTrendingUp className="h-4 w-4" />} />
        <StatCard label="En progression" value={inProgress} tone="warning" />
      </div>

      <SectionCard title="Niveaux actuels" description="Dernière évaluation connue pour chaque compétence.">
        {latest.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-body dark:text-body-dark">
            Aucune compétence évaluée pour le moment.
          </p>
        ) : (
          <div className="divide-y divide-stroke dark:divide-white/5">
            {latest.map((level) => (
              <div key={level.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-black dark:text-white">
                    {level.competence?.name ?? 'Compétence'}
                  </p>
                  <p className="mt-0.5 text-xs text-body dark:text-body-dark">
                    {level.competence?.description ?? 'Aucune description'}
                  </p>
                  <p className="mt-1 text-[11px] text-body dark:text-body-dark">
                    Évaluée le {formatDate(level.evaluated_at)}
                    {level.comment ? ` · ${level.comment}` : ''}
                  </p>
                </div>
                <Badge tone={statusTone(level.level)}>
                  {optionLabel(COMPETENCE_LEVEL_OPTIONS, level.level)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </SelfGate>
  );
}
