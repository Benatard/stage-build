import { useMemo } from 'react';
import { Badge, statusTone } from '@/components/ui/Badge';
import { EntityManager } from '@/components/ui/EntityManager';
import { useReferenceData } from '@/hooks/useReferenceData';
import type { Inscription } from '@/types/domain';
import { formatDate, fullName } from '@/utils/format';
import { buildOptions } from '@/utils/options';

const statusOptions = [
  { value: 'en_attente', label: 'En attente' },
  { value: 'validee', label: 'Validée' },
  { value: 'annulee', label: 'Annulée' },
  { value: 'terminee', label: 'Terminée' },
];

export default function InscriptionsPage() {
  const { data } = useReferenceData();

  const stagiaireOptions = useMemo(
    () => buildOptions(data.stagiaires, (stagiaire) => `${fullName(stagiaire)} (${stagiaire.matricule})`),
    [data.stagiaires],
  );
  const formationOptions = useMemo(
    () => buildOptions(data.formations, (formation) => formation.name),
    [data.formations],
  );
  const promotionOptions = useMemo(
    () => buildOptions(data.promotions, (promotion) => promotion.code),
    [data.promotions],
  );

  return (
    <EntityManager<Inscription>
      table="inscriptions"
      eyebrow="Dossiers"
      title="Inscriptions"
      description="Inscrivez les stagiaires aux formations et suivez la validité de chaque dossier."
      createLabel="Nouvelle inscription"
      rowLabel={(row) => {
        const stagiaire = data.stagiaires.find((item) => item.id === row.stagiaire_id);
        return stagiaire ? fullName(stagiaire) : 'Inscription';
      }}
      searchPlaceholder="Rechercher un stagiaire, une formation…"
      searchFields={(row) => {
        const stagiaire = data.stagiaires.find((item) => item.id === row.stagiaire_id);
        const formation = data.formations.find((item) => item.id === row.formation_id);
        return [fullName(stagiaire), stagiaire?.matricule, formation?.name, row.status]
          .filter(Boolean)
          .join(' ');
      }}
      columns={[
        {
          key: 'stagiaire',
          header: 'Stagiaire',
          render: (row) => {
            const stagiaire = data.stagiaires.find((item) => item.id === row.stagiaire_id);
            return (
              <div>
                <p className="font-semibold text-black dark:text-white">{fullName(stagiaire)}</p>
                <p className="text-xs text-body dark:text-body-dark">{stagiaire?.matricule ?? '—'}</p>
              </div>
            );
          },
        },
        {
          key: 'formation',
          header: 'Formation',
          render: (row) => (
            <div>
              <p>{data.formations.find((item) => item.id === row.formation_id)?.name ?? '—'}</p>
              <p className="text-xs text-body dark:text-body-dark">
                {data.promotions.find((item) => item.id === row.promotion_id)?.code ?? '—'}
              </p>
            </div>
          ),
        },
        {
          key: 'period',
          header: 'Période',
          hideBelow: 'md',
          render: (row) => `${formatDate(row.start_date)} → ${formatDate(row.end_date)}`,
        },
        {
          key: 'status',
          header: 'Statut',
          render: (row) => (
            <Badge tone={statusTone(row.status)}>
              {statusOptions.find((option) => option.value === row.status)?.label ?? row.status}
            </Badge>
          ),
        },
      ]}
      fields={[
        { name: 'stagiaire_id', label: 'Stagiaire', type: 'select', options: stagiaireOptions, required: true },
        { name: 'formation_id', label: 'Formation', type: 'select', options: formationOptions, required: true },
        { name: 'promotion_id', label: 'Promotion', type: 'select', options: promotionOptions },
        { name: 'start_date', label: 'Début', type: 'date' },
        { name: 'end_date', label: 'Fin', type: 'date' },
        { name: 'status', label: 'Statut', type: 'select', options: statusOptions, required: true, defaultValue: 'en_attente' },
      ]}
    />
  );
}
