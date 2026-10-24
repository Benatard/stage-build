import { Badge, statusTone } from '@/components/ui/Badge';
import { EntityManager } from '@/components/ui/EntityManager';
import { useAuth } from '@/context/AuthContext';
import { useReferenceData } from '@/hooks/useReferenceData';
import type { Comportement } from '@/types/domain';
import { fullName, round } from '@/utils/format';
import { buildOptions } from '@/utils/options';

const scoreFields = [
  { name: 'ponctualite', label: 'Ponctualité' },
  { name: 'discipline', label: 'Discipline' },
  { name: 'respect', label: 'Respect' },
  { name: 'communication', label: 'Communication' },
  { name: 'esprit_equipe', label: 'Esprit d’équipe' },
  { name: 'autonomie', label: 'Autonomie' },
  { name: 'responsabilite', label: 'Responsabilité' },
  { name: 'attitude_professionnelle', label: 'Attitude professionnelle' },
  { name: 'respect_materiel', label: 'Respect du matériel' },
  { name: 'capacite_adaptation', label: 'Capacité d’adaptation' },
];

function computeAverage(values: Record<string, string | boolean>): number | null {
  const scores = scoreFields
    .map((field) => Number(values[field.name]))
    .filter((value) => Number.isFinite(value));
  if (scores.length === 0) return null;
  return round(scores.reduce((sum, value) => sum + value, 0) / scores.length, 2);
}

export default function ComportementPage() {
  const { data } = useReferenceData();
  const { user } = useAuth();
  const stagiaireOptions = buildOptions(
    data.stagiaires,
    (stagiaire) => `${fullName(stagiaire)} (${stagiaire.matricule})`,
  );

  return (
    <EntityManager<Comportement>
      table="comportements"
      eyebrow="Évaluations"
      title="Comportement professionnel"
      description="Évaluez les attitudes professionnelles et les compétences comportementales sur 5."
      createLabel="Nouvelle évaluation comportementale"
      rowLabel={(row) => fullName(data.stagiaires.find((item) => item.id === row.stagiaire_id))}
      searchPlaceholder="Rechercher un stagiaire, une période…"
      searchFields={(row) => {
        const stagiaire = data.stagiaires.find((item) => item.id === row.stagiaire_id);
        return [fullName(stagiaire), row.period, row.appreciation].filter(Boolean).join(' ');
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
        { key: 'ponctualite', header: 'Ponctualité', hideBelow: 'md', render: (row) => `${row.ponctualite ?? 0}/5` },
        { key: 'discipline', header: 'Discipline', hideBelow: 'lg', render: (row) => `${row.discipline ?? 0}/5` },
        {
          key: 'average',
          header: 'Moyenne',
          render: (row) => (
            <Badge tone={statusTone((row.average ?? 0) >= 3 ? 'acquis' : 'a_renforcer')}>
              {row.average ?? 0}/5
            </Badge>
          ),
        },
        {
          key: 'appreciation',
          header: 'Appréciation',
          hideBelow: 'lg',
          render: (row) => row.appreciation ?? '—',
        },
      ]}
      fields={[
        { name: 'stagiaire_id', label: 'Stagiaire', type: 'select', options: stagiaireOptions, required: true },
        { name: 'period', label: 'Période', type: 'text', placeholder: 'Novembre 2026' },
        ...scoreFields.map((field) => ({
          name: field.name,
          label: field.label,
          type: 'number' as const,
          min: 0,
          max: 5,
          step: 0.5,
        })),
        { name: 'appreciation', label: 'Appréciation générale', type: 'textarea', fullWidth: true },
      ]}
      transform={(values) => {
        const payload: Record<string, unknown> = {
          stagiaire_id: values.stagiaire_id || null,
          period: values.period ? String(values.period).trim() : null,
          average: computeAverage(values),
          appreciation: values.appreciation ? String(values.appreciation).trim() : null,
          evaluated_by: user?.id ?? null,
        };
        scoreFields.forEach((field) => {
          payload[field.name] = values[field.name] ? Number(values[field.name]) : null;
        });
        return payload;
      }}
    />
  );
}
