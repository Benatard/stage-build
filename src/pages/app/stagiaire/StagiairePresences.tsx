import { useMemo } from 'react';
import { FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader, StatCard } from '@/components/ui/Feedback';
import { PRESENCE_OPTIONS, optionLabel } from '@/config/options';
import { useScopedRows } from '@/hooks/useScopedRows';
import { dataService } from '@/services/data.service';
import type { AppNotification, Presence } from '@/types/domain';
import { notifyError, notifySuccess, promptText } from '@/utils/alerts';
import { formatDate, formatTime, percentage } from '@/utils/format';
import { SelfGate, SectionCard } from './StagiaireShared';
import { useSelfAcademic } from './useStagiaireSelf';

export default function StagiairePresences() {
  const academic = useSelfAcademic();
  const stagiaireId = academic.stagiaireId;

  const { rows: presences, loading, error, reload } = useScopedRows<Presence>('presences', {
    scope: { stagiaire_id: stagiaireId },
    order: 'recorded_at.desc',
    enabled: Boolean(stagiaireId),
  });

  const stats = useMemo(() => {
    const present = presences.filter((presence) =>
      ['present', 'retard', 'sortie_autorisee'].includes(presence.status),
    ).length;
    const justified = presences.filter((presence) =>
      ['absence_justifiee', 'sortie_autorisee'].includes(presence.status),
    ).length;
    const unjustified = presences.filter((presence) =>
      ['absent', 'absence_non_justifiee'].includes(presence.status),
    ).length;
    return {
      total: presences.length,
      present,
      justified,
      unjustified,
      rate: percentage(present, Math.max(presences.length, 1)),
    };
  }, [presences]);

  async function report(presence: Presence) {
    const seance = academic.seances.find((item) => item.id === presence.seance_id);
    const message = await promptText({
      title: 'Signaler une erreur',
      label: 'Décrivez l’erreur constatée sur ce pointage.',
      value: '',
      confirmText: 'Envoyer le signalement',
    });
    if (!message) return;

    try {
      await dataService.createRow<AppNotification>('notifications', {
        user_id: null,
        stagiaire_id: stagiaireId,
        title: 'Signalement d’une présence',
        message: `Séance du ${formatDate(seance?.date)} : ${message.trim()}`,
        type: 'presence',
        channel: 'internal',
        status: 'unread',
        read_at: null,
        link: '/app/presences',
      });
      notifySuccess('Signalement transmis', 'L’administration pourra corriger le pointage après vérification.');
    } catch {
      notifyError('Signalement impossible', 'Votre signalement n’a pas pu être transmis.');
    }
  }

  const columns: TableColumn<Presence>[] = [
    {
      key: 'seance',
      header: 'Séance',
      render: (row) => {
        const seance = academic.seances.find((item) => item.id === row.seance_id);
        const module = academic.modules.find((item) => item.id === seance?.module_id);
        return (
          <div>
            <p className="font-semibold text-black dark:text-white">
              {seance?.title ?? module?.name ?? 'Séance'}
            </p>
            <p className="text-xs text-body dark:text-body-dark">
              {formatDate(seance?.date)} {seance?.start_time ? `· ${formatTime(seance.start_time)}` : ''}
            </p>
          </div>
        );
      },
    },
    {
      key: 'module',
      header: 'Module',
      hideBelow: 'md',
      render: (row) => {
        const seance = academic.seances.find((item) => item.id === row.seance_id);
        return academic.modules.find((module) => module.id === seance?.module_id)?.name ?? '—';
      },
    },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => (
        <Badge tone={statusTone(row.status)}>{optionLabel(PRESENCE_OPTIONS, row.status)}</Badge>
      ),
    },
    {
      key: 'note',
      header: 'Observation',
      hideBelow: 'lg',
      render: (row) => row.note ?? '—',
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (row) => (
        <button
          type="button"
          onClick={() => void report(row)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <FiAlertCircle className="h-3.5 w-3.5" /> Signaler
        </button>
      ),
    },
  ];

  return (
    <SelfGate loading={academic.loading || loading} error={academic.error ?? error} onRetry={academic.reload}>
      <PageHeader
        eyebrow="Ma scolarité"
        title="Mes présences"
        description="Consultez vos pointages et signalez une erreur sans modifier la feuille de présence officielle."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Taux d’assiduité" value={`${stats.rate}%`} tone={stats.rate >= 80 ? 'success' : 'warning'} icon={<FiCheckCircle className="h-4 w-4" />} />
        <StatCard label="Séances pointées" value={stats.total} tone="primary" />
        <StatCard label="Absences justifiées" value={stats.justified} tone="success" />
        <StatCard label="Absences non justifiées" value={stats.unjustified} tone="danger" />
      </div>

      <SectionCard
        title="Historique de mes pointages"
        description="Les pointages sont en lecture seule. Un signalement est transmis à l’administration."
      >
        <DataTable
          columns={columns}
          rows={presences}
          loading={loading}
          error={error}
          onRetry={() => {
            reload();
            academic.reload();
          }}
          emptyTitle="Aucun pointage"
          emptyDescription="Vos présences apparaîtront ici après les premières séances."
        />
      </SectionCard>

      <p className="mt-3 text-xs text-body dark:text-body-dark">
        Un pointage contesté doit être signalé avec le plus de précisions possible. Seule
        l’administration peut modifier une présence officielle.
      </p>
    </SelfGate>
  );
}
