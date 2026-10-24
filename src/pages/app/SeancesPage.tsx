import { useMemo } from 'react';
import { Badge, statusTone } from '@/components/ui/Badge';
import { EntityManager } from '@/components/ui/EntityManager';
import { useReferenceData } from '@/hooks/useReferenceData';
import type { Seance } from '@/types/domain';
import { formatDate, formatTime, fullName } from '@/utils/format';
import { buildOptions } from '@/utils/options';

const statusOptions = [
  { value: 'planifiee', label: 'Planifiée' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'terminee', label: 'Terminée' },
  { value: 'annulee', label: 'Annulée' },
];

export default function SeancesPage() {
  const { data } = useReferenceData();

  const moduleOptions = useMemo(
    () =>
      buildOptions(data.modules, (module) => {
        const formation = data.formations.find((item) => item.id === module.formation_id);
        return `${module.name}${formation ? ` — ${formation.name}` : ''}`;
      }),
    [data.modules, data.formations],
  );
  const promotionOptions = useMemo(
    () => buildOptions(data.promotions, (promotion) => promotion.code),
    [data.promotions],
  );
  const formateurOptions = useMemo(
    () =>
      buildOptions(
        data.users.filter((item) => ['formateur', 'responsable_pedagogique'].includes(item.role)),
        (item) => fullName(item),
      ),
    [data.users],
  );

  return (
    <EntityManager<Seance>
      table="seances"
      eyebrow="Pédagogie"
      title="Séances"
      description="Planifiez les séances, les salles et les formateurs. Les présences s’appuient sur ce planning."
      createLabel="Nouvelle séance"
      order="date.desc"
      rowLabel={(row) => row.title ?? row.date}
      searchPlaceholder="Rechercher un module, une salle…"
      searchFields={(row) => {
        const module = data.modules.find((item) => item.id === row.module_id);
        return [row.title, row.room, module?.name, row.date].filter(Boolean).join(' ');
      }}
      columns={[
        {
          key: 'title',
          header: 'Séance',
          render: (row) => (
            <div>
              <p className="font-semibold text-black dark:text-white">
                {row.title ?? data.modules.find((item) => item.id === row.module_id)?.name ?? 'Séance'}
              </p>
              <p className="text-xs text-body dark:text-body-dark">
                {data.modules.find((item) => item.id === row.module_id)?.name ?? '—'}
              </p>
            </div>
          ),
        },
        { key: 'date', header: 'Date', render: (row) => formatDate(row.date) },
        {
          key: 'time',
          header: 'Horaire',
          hideBelow: 'md',
          render: (row) => `${formatTime(row.start_time)} – ${formatTime(row.end_time)}`,
        },
        { key: 'room', header: 'Salle', hideBelow: 'lg', render: (row) => row.room ?? '—' },
        {
          key: 'formateur',
          header: 'Formateur',
          hideBelow: 'lg',
          render: (row) => fullName(data.users.find((item) => item.id === row.formateur_id)),
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
        { name: 'module_id', label: 'Module', type: 'select', options: moduleOptions, required: true },
        { name: 'promotion_id', label: 'Promotion', type: 'select', options: promotionOptions },
        { name: 'title', label: 'Intitulé de la séance', type: 'text', fullWidth: true },
        { name: 'date', label: 'Date', type: 'date', required: true },
        { name: 'start_time', label: 'Heure de début', type: 'time' },
        { name: 'end_time', label: 'Heure de fin', type: 'time' },
        { name: 'room', label: 'Salle', type: 'text' },
        { name: 'formateur_id', label: 'Formateur', type: 'select', options: formateurOptions },
        { name: 'status', label: 'Statut', type: 'select', options: statusOptions, required: true, defaultValue: 'planifiee' },
      ]}
    />
  );
}
