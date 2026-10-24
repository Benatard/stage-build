import { Badge, statusTone } from '@/components/ui/Badge';
import { EntityManager } from '@/components/ui/EntityManager';
import { useReferenceData } from '@/hooks/useReferenceData';
import type { StageObjective } from '@/types/domain';
import { OBJECTIVE_STATUS_OPTIONS, optionLabel } from '@/config/options';
import { fullName } from '@/utils/format';
import { buildOptions } from '@/utils/options';

export default function ObjectifsPage() {
  const { data } = useReferenceData();
  const stagiaireOptions = buildOptions(
    data.stagiaires,
    (stagiaire) => `${fullName(stagiaire)} (${stagiaire.matricule})`,
  );

  return (
    <EntityManager<StageObjective>
      table="stage_objectives"
      eyebrow="Suivi"
      title="Objectifs de stage"
      description="Définissez et validez les objectifs individuels de chaque stagiaire."
      createLabel="Nouvel objectif"
      rowLabel={(row) => row.title}
      searchPlaceholder="Rechercher un objectif, un stagiaire…"
      searchFields={(row) => {
        const stagiaire = data.stagiaires.find((item) => item.id === row.stagiaire_id);
        return [row.title, row.description, fullName(stagiaire)].filter(Boolean).join(' ');
      }}
      columns={[
        {
          key: 'title',
          header: 'Objectif',
          render: (row) => (
            <div className="max-w-sm">
              <p className="font-semibold text-black dark:text-white">{row.title}</p>
              <p className="line-clamp-1 text-xs text-body dark:text-body-dark">
                {row.description ?? '—'}
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
          key: 'status',
          header: 'Statut',
          render: (row) => (
            <Badge tone={statusTone(row.status)}>
              {optionLabel(OBJECTIVE_STATUS_OPTIONS, row.status)}
            </Badge>
          ),
        },
      ]}
      fields={[
        { name: 'stagiaire_id', label: 'Stagiaire', type: 'select', options: stagiaireOptions, required: true },
        { name: 'title', label: 'Intitulé de l’objectif', type: 'text', required: true },
        { name: 'status', label: 'Statut', type: 'select', options: OBJECTIVE_STATUS_OPTIONS, required: true, defaultValue: 'non_commence' },
        { name: 'description', label: 'Description', type: 'textarea', fullWidth: true },
        { name: 'validation_comment', label: 'Commentaire de validation', type: 'textarea', fullWidth: true },
      ]}
    />
  );
}
