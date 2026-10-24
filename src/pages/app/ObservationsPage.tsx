import { useMemo } from 'react';
import { Badge, statusTone } from '@/components/ui/Badge';
import { EntityManager } from '@/components/ui/EntityManager';
import { useAuth } from '@/context/AuthContext';
import { useReferenceData } from '@/hooks/useReferenceData';
import type { Observation } from '@/types/domain';
import { formatDateTime, fullName, truncate } from '@/utils/format';
import { buildOptions } from '@/utils/options';

const visibilityOptions = [
  { value: 'interne', label: 'Interne pédagogique' },
  { value: 'publiee', label: 'Publiée' },
  { value: 'stagiaire', label: 'Visible par le stagiaire' },
];

export default function ObservationsPage() {
  const { data } = useReferenceData();
  const { user } = useAuth();

  const stagiaireOptions = useMemo(
    () => buildOptions(data.stagiaires, (stagiaire) => `${fullName(stagiaire)} (${stagiaire.matricule})`),
    [data.stagiaires],
  );
  const moduleOptions = useMemo(
    () => buildOptions(data.modules, (module) => module.name),
    [data.modules],
  );
  const evaluationOptions = useMemo(
    () => buildOptions(data.evaluations, (evaluation) => evaluation.title),
    [data.evaluations],
  );
  const seanceOptions = useMemo(
    () =>
      buildOptions(data.seances, (seance) => `${seance.title ?? 'Séance'} — ${seance.date}`),
    [data.seances],
  );

  return (
    <EntityManager<Observation>
      table="observations"
      eyebrow="Suivi"
      title="Observations"
      description="Consignez les observations qualitatives sur les progrès, difficultés et points d’attention."
      createLabel="Nouvelle observation"
      order="created_at.desc"
      rowLabel={(row) => truncate(row.content, 60)}
      searchPlaceholder="Rechercher une observation, un stagiaire…"
      searchFields={(row) => {
        const stagiaire = data.stagiaires.find((item) => item.id === row.stagiaire_id);
        return [row.content, fullName(stagiaire), stagiaire?.matricule].filter(Boolean).join(' ');
      }}
      columns={[
        {
          key: 'content',
          header: 'Observation',
          render: (row) => (
            <div className="max-w-md">
              <p className="line-clamp-2 text-dark dark:text-white">{truncate(row.content, 130)}</p>
              <p className="mt-1 text-[11px] text-body dark:text-body-dark">
                {formatDateTime(row.created_at)}
              </p>
            </div>
          ),
        },
        {
          key: 'stagiaire',
          header: 'Stagiaire',
          hideBelow: 'md',
          render: (row) => fullName(data.stagiaires.find((item) => item.id === row.stagiaire_id)),
        },
        {
          key: 'context',
          header: 'Contexte',
          hideBelow: 'lg',
          render: (row) =>
            data.modules.find((item) => item.id === row.module_id)?.name ??
            data.evaluations.find((item) => item.id === row.evaluation_id)?.title ??
            '—',
        },
        {
          key: 'visibility',
          header: 'Visibilité',
          render: (row) => (
            <Badge tone={statusTone(row.visibility === 'interne' ? 'info' : 'success')}>
              {visibilityOptions.find((option) => option.value === row.visibility)?.label ??
                row.visibility}
            </Badge>
          ),
        },
      ]}
      fields={[
        { name: 'stagiaire_id', label: 'Stagiaire', type: 'select', options: stagiaireOptions, required: true },
        { name: 'module_id', label: 'Module lié', type: 'select', options: moduleOptions },
        { name: 'evaluation_id', label: 'Évaluation liée', type: 'select', options: evaluationOptions },
        { name: 'seance_id', label: 'Séance liée', type: 'select', options: seanceOptions },
        { name: 'content', label: 'Observation', type: 'textarea', required: true, fullWidth: true, rows: 5 },
        { name: 'visibility', label: 'Visibilité', type: 'select', options: visibilityOptions, required: true, defaultValue: 'interne' },
      ]}
      transform={(values) => ({
        stagiaire_id: values.stagiaire_id || null,
        module_id: values.module_id || null,
        evaluation_id: values.evaluation_id || null,
        seance_id: values.seance_id || null,
        content: String(values.content ?? '').trim(),
        visibility: values.visibility || 'interne',
        author_id: user?.id ?? null,
      })}
    />
  );
}
