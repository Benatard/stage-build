import { Badge, statusTone } from '@/components/ui/Badge';
import { EntityManager } from '@/components/ui/EntityManager';
import { optionLabel } from '@/config/options';
import type { Formation } from '@/types/domain';
import { formatDate } from '@/utils/format';

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archivee', label: 'Archivée' },
];

export default function FormationsPage() {
  return (
    <EntityManager<Formation>
      table="formations"
      eyebrow="Pédagogie"
      title="Formations"
      description="Définissez les programmes de formation, leurs objectifs, niveaux et durées."
      createLabel="Nouvelle formation"
      rowLabel={(row) => row.name}
      searchPlaceholder="Rechercher une formation, un domaine…"
      searchFields={(row) =>
        [row.name, row.description, row.domain, row.level, row.objectives].filter(Boolean).join(' ')
      }
      emptyTitle="Aucune formation"
      emptyDescription="Créez une formation avant d’y rattacher des modules et des promotions."
      columns={[
        {
          key: 'name',
          header: 'Formation',
          render: (row) => (
            <div>
              <p className="font-semibold text-black dark:text-white">{row.name}</p>
              <p className="text-xs text-body dark:text-body-dark">
                {row.domain ?? row.level ?? '—'}
              </p>
            </div>
          ),
        },
        {
          key: 'duration',
          header: 'Durée',
          hideBelow: 'md',
          render: (row) => (row.duration_months ? `${row.duration_months} mois` : '—'),
        },
        {
          key: 'objectives',
          header: 'Objectifs',
          hideBelow: 'lg',
          render: (row) => (
            <span className="line-clamp-2 max-w-xs text-xs text-body dark:text-body-dark">
              {row.objectives ?? row.description ?? '—'}
            </span>
          ),
        },
        {
          key: 'created',
          header: 'Créée le',
          hideBelow: 'lg',
          render: (row) => formatDate(row.created_at),
        },
        {
          key: 'status',
          header: 'Statut',
          render: (row) => (
            <Badge tone={statusTone(row.status)}>
              {optionLabel(statusOptions, row.status)}
            </Badge>
          ),
        },
      ]}
      fields={[
        { name: 'name', label: 'Nom de la formation', type: 'text', required: true, fullWidth: true },
        { name: 'domain', label: 'Domaine', type: 'text' },
        { name: 'level', label: 'Niveau', type: 'text' },
        { name: 'duration_months', label: 'Durée (mois)', type: 'number', min: 0 },
        { name: 'status', label: 'Statut', type: 'select', options: statusOptions, required: true, defaultValue: 'active' },
        { name: 'description', label: 'Description', type: 'textarea', fullWidth: true },
        { name: 'objectives', label: 'Objectifs pédagogiques', type: 'textarea', fullWidth: true, rows: 5 },
        { name: 'program', label: 'Programme détaillé', type: 'textarea', fullWidth: true, rows: 6 },
      ]}
    />
  );
}
