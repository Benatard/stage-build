import { useMemo } from 'react';
import { Badge, statusTone } from '@/components/ui/Badge';
import { EntityManager } from '@/components/ui/EntityManager';
import { useReferenceData } from '@/hooks/useReferenceData';
import type { Promotion } from '@/types/domain';
import { formatDate } from '@/utils/format';
import { buildOptions } from '@/utils/options';

const statusOptions = [
  { value: 'planifiee', label: 'Planifiée' },
  { value: 'active', label: 'Active' },
  { value: 'cloturee', label: 'Clôturée' },
  { value: 'archivee', label: 'Archivée' },
];

export default function PromotionsPage() {
  const { data } = useReferenceData();
  const formationOptions = useMemo(
    () => buildOptions(data.formations, (formation) => formation.name),
    [data.formations],
  );

  return (
    <EntityManager<Promotion>
      table="promotions"
      eyebrow="Pédagogie"
      title="Promotions"
      description="Regroupez les stagiaires par promotion et planifiez les périodes de formation."
      createLabel="Nouvelle promotion"
      rowLabel={(row) => row.code}
      searchPlaceholder="Rechercher un code, une formation…"
      searchFields={(row) => {
        const formation = data.formations.find((item) => item.id === row.formation_id);
        return [row.code, row.name, formation?.name].filter(Boolean).join(' ');
      }}
      emptyTitle="Aucune promotion"
      emptyDescription="Créez une promotion pour affecter les stagiaires et planifier les séances."
      columns={[
        {
          key: 'code',
          header: 'Promotion',
          render: (row) => (
            <div>
              <p className="font-semibold text-black dark:text-white">{row.code}</p>
              <p className="text-xs text-body dark:text-body-dark">
                {data.formations.find((formation) => formation.id === row.formation_id)?.name ??
                  row.name ??
                  '—'}
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
        { key: 'capacity', header: 'Capacité', hideBelow: 'lg', render: (row) => row.capacity ?? '—' },
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
        { name: 'formation_id', label: 'Formation', type: 'select', options: formationOptions, required: true },
        { name: 'code', label: 'Code de promotion', type: 'text', required: true, placeholder: 'PROM-2026-A' },
        { name: 'name', label: 'Libellé', type: 'text', fullWidth: true },
        { name: 'start_date', label: 'Date de début', type: 'date' },
        { name: 'end_date', label: 'Date de fin', type: 'date' },
        { name: 'capacity', label: 'Capacité', type: 'number', min: 0 },
        { name: 'status', label: 'Statut', type: 'select', options: statusOptions, required: true, defaultValue: 'planifiee' },
      ]}
    />
  );
}
