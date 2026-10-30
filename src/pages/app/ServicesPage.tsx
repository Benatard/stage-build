import { Badge } from '@/components/ui/Badge';
import { EntityManager } from '@/components/ui/EntityManager';
import { useReferenceData } from '@/hooks/useReferenceData';
import type { Service } from '@/types/domain';
import { fullName } from '@/utils/format';
import { buildOptions } from '@/utils/options';

export default function ServicesPage() {
  const { data } = useReferenceData();
  const managerOptions = buildOptions(data.users, (user) => fullName(user));

  return (
    <EntityManager<Service>
      table="services"
      eyebrow="Institution"
      title="Services & départements"
      description="Structurez l’institution en services et départements, et désignez leurs responsables."
      createLabel="Nouveau service"
      rowLabel={(row) => row.name}
      searchPlaceholder="Rechercher un service, un code…"
      searchFields={(row) => [row.name, row.code, row.description].filter(Boolean).join(' ')}
      columns={[
        {
          key: 'name',
          header: 'Service',
          render: (row) => (
            <div>
              <p className="font-semibold text-black dark:text-white">{row.name}</p>
              <p className="font-mono text-xs text-body dark:text-body-dark">{row.code}</p>
            </div>
          ),
        },
        {
          key: 'manager',
          header: 'Responsable',
          hideBelow: 'md',
          render: (row) =>
            data.users.find((user) => user.id === row.manager_id)
              ? fullName(data.users.find((user) => user.id === row.manager_id)!)
              : '—',
        },
        {
          key: 'description',
          header: 'Description',
          hideBelow: 'lg',
          render: (row) => row.description ?? '—',
        },
        {
          key: 'status',
          header: 'Statut',
          render: (row) => (
            <Badge tone={row.status === 'active' ? 'success' : 'neutral'}>
              {row.status === 'active' ? 'Actif' : 'Inactif'}
            </Badge>
          ),
        },
      ]}
      fields={[
        { name: 'name', label: 'Nom du service', type: 'text', required: true, fullWidth: true },
        { name: 'code', label: 'Code', type: 'text', required: true, placeholder: 'PEDAGOGIE' },
        { name: 'manager_id', label: 'Responsable', type: 'select', options: managerOptions },
        {
          name: 'status',
          label: 'Statut',
          type: 'select',
          required: true,
          options: [
            { value: 'active', label: 'Actif' },
            { value: 'inactive', label: 'Inactif' },
          ],
          defaultValue: 'active',
        },
        { name: 'description', label: 'Description', type: 'textarea', fullWidth: true },
      ]}
      defaults={{ status: 'active' }}
    />
  );
}
