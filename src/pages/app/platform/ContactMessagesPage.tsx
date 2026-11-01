import { useEffect, useMemo, useState } from 'react';
import {
  FiArchive,
  FiCheckCircle,
  FiEye,
  FiMail,
  FiRefreshCw,
  FiTrash2,
} from 'react-icons/fi';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader, StatCard } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { useForgeTable } from '@/hooks/useForgeTable';
import { dataService } from '@/services/data.service';
import type { ContactMessage, ContactMessageStatus } from '@/types/domain';
import { confirmAction, notifyError, notifySuccess } from '@/utils/alerts';
import { cn, formatDateTime, getErrorMessage } from '@/utils/format';

const STATUS_OPTIONS: Array<{ value: 'all' | ContactMessageStatus; label: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'nouveau', label: 'Nouveaux' },
  { value: 'lu', label: 'Lus' },
  { value: 'traite', label: 'Traités' },
  { value: 'archive', label: 'Archivés' },
];

const STATUS_LABELS: Record<ContactMessageStatus, string> = {
  nouveau: 'Nouveau',
  lu: 'Lu',
  traite: 'Traité',
  archive: 'Archivé',
};

const PAGE_SIZE = 25;

type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

function messageStatus(message: ContactMessage): ContactMessageStatus {
  return message.status ?? 'nouveau';
}

function statusToneFor(status: ContactMessageStatus): BadgeTone {
  switch (status) {
    case 'nouveau':
      return 'warning';
    case 'lu':
      return 'info';
    case 'traite':
      return 'success';
    case 'archive':
      return 'neutral';
  }
}

export default function ContactMessagesPage() {
  const { rows: messages, loading, error, reload } = useForgeTable<ContactMessage>(
    'contact_messages',
    { order: 'created_at.desc', all: true },
  );
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContactMessageStatus>('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return messages.filter((message) => {
      if (statusFilter !== 'all' && messageStatus(message) !== statusFilter) return false;
      if (!term) return true;

      return [message.nom, message.email, message.message]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [messages, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  const counts = useMemo(
    () => ({
      total: messages.length,
      nouveau: messages.filter((message) => messageStatus(message) === 'nouveau').length,
      lu: messages.filter((message) => messageStatus(message) === 'lu').length,
      traite: messages.filter((message) => messageStatus(message) === 'traite').length,
      archive: messages.filter((message) => messageStatus(message) === 'archive').length,
    }),
    [messages],
  );

  async function changeStatus(
    message: ContactMessage,
    status: ContactMessageStatus,
    options?: { silent?: boolean },
  ) {
    setActionId(message.id);

    try {
      await dataService.updateRow<ContactMessage>('contact_messages', message.id, {
        status,
        handled_at: status === 'traite' || status === 'archive' ? new Date().toISOString() : null,
      });

      if (!options?.silent) {
        notifySuccess('Statut mis à jour', STATUS_LABELS[status]);
      }

      setSelected((current) =>
        current && current.id === message.id ? { ...current, status } : current,
      );
      reload();
    } catch (updateError) {
      notifyError('Mise à jour impossible', getErrorMessage(updateError));
    } finally {
      setActionId(null);
    }
  }

  function openMessage(message: ContactMessage) {
    setSelected(message);

    if (messageStatus(message) === 'nouveau') {
      void changeStatus(message, 'lu', { silent: true });
    }
  }

  async function removeMessage(message: ContactMessage) {
    const confirmed = await confirmAction({
      title: 'Supprimer ce message ?',
      text: `Le message de ${message.nom} sera définitivement supprimé.`,
      confirmText: 'Supprimer',
      danger: true,
    });
    if (!confirmed) return;

    setActionId(message.id);

    try {
      await dataService.deleteRow('contact_messages', message.id);
      notifySuccess('Message supprimé');
      setSelected((current) => (current && current.id === message.id ? null : current));
      reload();
    } catch (deleteError) {
      notifyError('Suppression impossible', getErrorMessage(deleteError));
    } finally {
      setActionId(null);
    }
  }

  const columns: TableColumn<ContactMessage>[] = [
    {
      key: 'contact',
      header: 'Contact',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-black dark:text-white">{row.nom}</p>
          <a
            href={`mailto:${row.email}`}
            onClick={(event) => event.stopPropagation()}
            className="block truncate text-xs text-primary hover:underline"
          >
            {row.email}
          </a>
        </div>
      ),
    },
    {
      key: 'message',
      header: 'Message',
      hideBelow: 'md',
      render: (row) => (
        <p className="max-w-[420px] truncate text-xs text-body dark:text-body-dark">
          {row.message}
        </p>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => {
        const status = messageStatus(row);
        return <Badge tone={statusToneFor(status)}>{STATUS_LABELS[status]}</Badge>;
      },
    },
    {
      key: 'created',
      header: 'Reçu le',
      hideBelow: 'lg',
      render: (row) => formatDateTime(row.created_at),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => {
        const status = messageStatus(row);

        return (
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openMessage(row);
              }}
              className="flex h-8 w-8 items-center justify-center text-body hover:bg-primary/10 hover:text-primary dark:text-body-dark"
              title="Lire le message"
              aria-label="Lire le message"
            >
              <FiEye className="h-4 w-4" />
            </button>
            {status !== 'traite' && (
              <button
                type="button"
                disabled={actionId === row.id}
                onClick={(event) => {
                  event.stopPropagation();
                  void changeStatus(row, 'traite');
                }}
                className="flex h-8 w-8 items-center justify-center text-body hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50 dark:text-body-dark"
                title="Marquer comme traité"
                aria-label="Marquer comme traité"
              >
                <FiCheckCircle className="h-4 w-4" />
              </button>
            )}
            {status !== 'archive' && (
              <button
                type="button"
                disabled={actionId === row.id}
                onClick={(event) => {
                  event.stopPropagation();
                  void changeStatus(row, 'archive');
                }}
                className="flex h-8 w-8 items-center justify-center text-body hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:text-body-dark dark:hover:bg-white/10"
                title="Archiver"
                aria-label="Archiver le message"
              >
                <FiArchive className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              disabled={actionId === row.id}
              onClick={(event) => {
                event.stopPropagation();
                void removeMessage(row);
              }}
              className="flex h-8 w-8 items-center justify-center text-body hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:text-body-dark"
              title="Supprimer"
              aria-label="Supprimer le message"
            >
              <FiTrash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Console plateforme"
        title="Messages de contact"
        description="Les demandes envoyées depuis la page d’accueil pour créer un espace de travail ou en savoir plus sur la plateforme."
        actions={
          <Button variant="outline" onClick={reload} icon={<FiRefreshCw className="h-4 w-4" />}>
            Actualiser
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Messages reçus"
          value={counts.total}
          tone="primary"
          icon={<FiMail className="h-4 w-4" />}
        />
        <StatCard label="Nouveaux" value={counts.nouveau} tone="warning" />
        <StatCard label="Lus" value={counts.lu} tone="primary" />
        <StatCard
          label="Traités"
          value={counts.traite}
          hint={`${counts.archive} archivé(s)`}
          tone="success"
          icon={<FiCheckCircle className="h-4 w-4" />}
        />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Rechercher un nom, un email ou un message…"
          className="sm:max-w-md"
        />

        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((option) => {
            const active = statusFilter === option.value;
            const count =
              option.value === 'all' ? counts.total : counts[option.value];

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={cn(
                  'px-3 py-2 text-xs font-semibold transition-colors',
                  active
                    ? 'bg-primary text-white'
                    : 'bg-white text-body hover:text-primary dark:bg-[#1E232E] dark:text-body-dark dark:hover:text-white',
                )}
              >
                {option.label}
                <span className={cn('ml-1.5', active ? 'text-white/70' : 'opacity-60')}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card-root border border-stroke dark:border-white/10">
        <DataTable
          columns={columns}
          rows={pageRows}
          loading={loading}
          error={error}
          onRetry={reload}
          onRowClick={openMessage}
          emptyTitle="Aucun message"
          emptyDescription="Les demandes envoyées depuis la page d’accueil apparaîtront ici."
        />

        {!loading && !error && filtered.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-stroke px-4 py-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-body dark:text-body-dark">
              Page {currentPage} sur {totalPages} · {filtered.length} message
              {filtered.length > 1 ? 's' : ''} · {PAGE_SIZE} par page
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setPage(Math.max(1, currentPage - 1))}
              >
                Précédent
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Message de ${selected.nom}` : 'Message'}
        description={selected?.email}
        size="lg"
        footer={
          selected ? (
            <>
              <Button variant="outline" onClick={() => setSelected(null)}>
                Fermer
              </Button>
              {messageStatus(selected) !== 'traite' && (
                <Button
                  variant="outline"
                  loading={actionId === selected.id}
                  onClick={() => void changeStatus(selected, 'traite')}
                  icon={<FiCheckCircle className="h-4 w-4" />}
                >
                  Marquer comme traité
                </Button>
              )}
              <a
                href={`mailto:${selected.email}?subject=${encodeURIComponent(
                  'Réponse à votre message — StageBuild',
                )}`}
                className="btn-primary-root"
              >
                Répondre par email <FiMail className="h-4 w-4" />
              </a>
            </>
          ) : null
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-xs text-body dark:text-body-dark">
              <Badge tone={statusToneFor(messageStatus(selected))}>
                {STATUS_LABELS[messageStatus(selected)]}
              </Badge>
              <span>Reçu le {formatDateTime(selected.created_at)}</span>
            </div>

            <div className="whitespace-pre-wrap border border-stroke bg-gray2 p-4 text-sm leading-relaxed text-dark dark:border-white/10 dark:bg-white/5 dark:text-white">
              {selected.message}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
