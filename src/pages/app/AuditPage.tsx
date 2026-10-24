import { Badge } from '@/components/ui/Badge';
import { EntityManager } from '@/components/ui/EntityManager';
import { useReferenceData } from '@/hooks/useReferenceData';
import type { AuditLog } from '@/types/domain';
import { formatDateTime, fullName } from '@/utils/format';

export default function AuditPage() {
  const { data } = useReferenceData();

  return (
    <EntityManager<AuditLog>
      table="audit_logs"
      eyebrow="Administration"
      title="Journal d’audit"
      description="Traçabilité des créations, modifications, validations et suppressions effectuées dans la plateforme."
      rowLabel={(row) => `${row.action} — ${row.entity}`}
      searchPlaceholder="Rechercher une action, une entité, un utilisateur…"
      searchFields={(row) => {
        const author = data.users.find((user) => user.id === row.user_id);
        return [row.action, row.entity, row.entity_id, row.reason, fullName(author)]
          .filter(Boolean)
          .join(' ');
      }}
      allowCreate={false}
      allowEdit={false}
      allowDelete={false}
      columns={[
        {
          key: 'date',
          header: 'Date',
          render: (row) => formatDateTime(row.created_at),
        },
        {
          key: 'action',
          header: 'Action',
          render: (row) => (
            <div>
              <Badge tone="primary">{row.action}</Badge>
              <p className="mt-1 text-xs text-body dark:text-body-dark">{row.entity}</p>
            </div>
          ),
        },
        {
          key: 'user',
          header: 'Auteur',
          hideBelow: 'md',
          render: (row) => fullName(data.users.find((user) => user.id === row.user_id)),
        },
        {
          key: 'entity',
          header: 'Entité',
          hideBelow: 'lg',
          render: (row) => (
            <span className="font-mono text-xs">{row.entity_id ?? row.entity}</span>
          ),
        },
        {
          key: 'reason',
          header: 'Motif',
          hideBelow: 'lg',
          render: (row) => row.reason ?? '—',
        },
      ]}
      fields={[]}
    />
  );
}
