import { Badge, statusTone } from '@/components/ui/Badge';
import { EntityManager } from '@/components/ui/EntityManager';
import { useAuth } from '@/context/AuthContext';
import { useReferenceData } from '@/hooks/useReferenceData';
import type { Implication } from '@/types/domain';
import { fullName, round } from '@/utils/format';
import { buildOptions } from '@/utils/options';

const scoreFields = [
  { name: 'participation', label: 'Participation' },
  { name: 'assiduite', label: 'Assiduité' },
  { name: 'curiosite', label: 'Curiosité' },
  { name: 'questions', label: 'Qualité des questions' },
  { name: 'travail_personnel', label: 'Travail personnel' },
  { name: 'collaboration', label: 'Collaboration' },
  { name: 'respect_consignes', label: 'Respect des consignes' },
  { name: 'autonomie', label: 'Autonomie' },
];

function computeAverage(values: Record<string, string | boolean>): number | null {
  const scores = scoreFields
    .map((field) => Number(values[field.name]))
    .filter((value) => Number.isFinite(value));
  if (scores.length === 0) return null;
  return round(scores.reduce((sum, value) => sum + value, 0) / scores.length, 2);
}

export default function ImplicationPage() {
  const { data } = useReferenceData();
  const { user } = useAuth();
  const stagiaireOptions = buildOptions(
    data.stagiaires,
    (stagiaire) => `${fullName(stagiaire)} (${stagiaire.matricule})`,
  );
  const moduleOptions = buildOptions(data.modules, (module) => module.name);

  return (
    <EntityManager<Implication>
      table="implications"
      eyebrow="Évaluations"
      title="Implication"
      description="Évaluez la participation, l’assiduité et l’engagement de chaque stagiaire sur 5."
      createLabel="Nouvelle évaluation d’implication"
      rowLabel={(row) => fullName(data.stagiaires.find((item) => item.id === row.stagiaire_id))}
      searchPlaceholder="Rechercher un stagiaire, une période…"
      searchFields={(row) => {
        const stagiaire = data.stagiaires.find((item) => item.id === row.stagiaire_id);
        return [fullName(stagiaire), row.period, row.comment].filter(Boolean).join(' ');
      }}
      columns={[
        {
          key: 'stagiaire',
          header: 'Stagiaire',
          render: (row) => (
            <div>
              <p className="font-semibold text-black dark:text-white">
                {fullName(data.stagiaires.find((item) => item.id === row.stagiaire_id))}
              </p>
              <p className="text-xs text-body dark:text-body-dark">
                {row.period ?? 'Période non précisée'}
              </p>
            </div>
          ),
        },
        {
          key: 'module',
          header: 'Module',
          hideBelow: 'md',
          render: (row) => data.modules.find((item) => item.id === row.module_id)?.name ?? '—',
        },
        { key: 'participation', header: 'Participation', hideBelow: 'lg', render: (row) => `${row.participation ?? 0}/5` },
        { key: 'assiduite', header: 'Assiduité', hideBelow: 'lg', render: (row) => `${row.assiduite ?? 0}/5` },
        {
          key: 'average',
          header: 'Moyenne',
          render: (row) => (
            <Badge tone={statusTone((row.average ?? 0) >= 3 ? 'acquis' : 'a_renforcer')}>
              {row.average ?? 0}/5
            </Badge>
          ),
        },
      ]}
      fields={[
        { name: 'stagiaire_id', label: 'Stagiaire', type: 'select', options: stagiaireOptions, required: true },
        { name: 'module_id', label: 'Module', type: 'select', options: moduleOptions },
        { name: 'period', label: 'Période', type: 'text', placeholder: 'Novembre 2026' },
        ...scoreFields.map((field) => ({
          name: field.name,
          label: field.label,
          type: 'number' as const,
          min: 0,
          max: 5,
          step: 0.5,
        })),
        { name: 'comment', label: 'Commentaire', type: 'textarea', fullWidth: true },
      ]}
      transform={(values) => ({
        stagiaire_id: values.stagiaire_id || null,
        module_id: values.module_id || null,
        period: values.period ? String(values.period).trim() : null,
        participation: values.participation ? Number(values.participation) : null,
        assiduite: values.assiduite ? Number(values.assiduite) : null,
        curiosite: values.curiosite ? Number(values.curiosite) : null,
        questions: values.questions ? Number(values.questions) : null,
        travail_personnel: values.travail_personnel ? Number(values.travail_personnel) : null,
        collaboration: values.collaboration ? Number(values.collaboration) : null,
        respect_consignes: values.respect_consignes ? Number(values.respect_consignes) : null,
        autonomie: values.autonomie ? Number(values.autonomie) : null,
        average: computeAverage(values),
        comment: values.comment ? String(values.comment).trim() : null,
        evaluated_by: user?.id ?? null,
      })}
    />
  );
}
