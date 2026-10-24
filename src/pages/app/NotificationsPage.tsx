import { useMemo, useState } from 'react';
import { FiBell, FiCheck, FiCheckCircle, FiPlus, FiTrash2 } from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/Feedback';
import { Field, Input, Select, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { useForgeTable } from '@/hooks/useForgeTable';
import { useReferenceData } from '@/hooks/useReferenceData';
import { dataService } from '@/services/data.service';
import type { AppNotification } from '@/types/domain';
import { confirmDelete, notifyError, notifySuccess } from '@/utils/alerts';
import { formatDateTime, fullName } from '@/utils/format';
import { buildOptions } from '@/utils/options';

const typeOptions = [
  { value: 'info', label: 'Information' },
  { value: 'evaluation', label: 'Évaluation' },
  { value: 'affectation', label: 'Affectation' },
  { value: 'presence', label: 'Présence' },
  { value: 'echeance', label: 'Échéance' },
  { value: 'resultat', label: 'Résultat' },
  { value: 'plan', label: 'Plan d’amélioration' },
  { value: 'bulletin', label: 'Bulletin' },
];

const channelOptions = [
  { value: 'internal', label: 'Notification interne' },
  { value: 'email', label: 'Email (à traiter)' },
  { value: 'sms', label: 'SMS (à traiter)' },
  { value: 'push', label: 'Push (à traiter)' },
];

type Draft = {
  title: string;
  message: string;
  type: string;
  channel: string;
  user_id: string;
  stagiaire_id: string;
};

const emptyDraft: Draft = {
  title: '',
  message: '',
  type: 'info',
  channel: 'internal',
  user_id: '',
  stagiaire_id: '',
};

export default function NotificationsPage() {
  const { user, can } = useAuth();
  const { data } = useReferenceData();
  const { rows, loading, error, reload } = useForgeTable<AppNotification>('notifications', {
    order: 'created_at.desc',
    limit: 500,
  });

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const visible = useMemo(() => {
    const isManager = user?.permissions.includes('*') || can('users');
    return rows.filter((notification) => {
      if (!isManager) {
        const targetUser = notification.user_id;
        const targetStagiaire = notification.stagiaire_id;
        if (targetUser && targetUser !== user?.id) return false;
        if (targetStagiaire && targetStagiaire !== user?.stagiaire_id) return false;
      }
      if (filter === 'unread' && notification.status !== 'unread') return false;
      return true;
    });
  }, [rows, user, can, filter]);

  const unreadCount = visible.filter((notification) => notification.status === 'unread').length;

  async function markRead(notification: AppNotification) {
    try {
      await dataService.updateRow<AppNotification>('notifications', notification.id, {
        status: 'read',
        read_at: new Date().toISOString(),
      });
      reload();
    } catch {
      notifyError('Mise à jour impossible');
    }
  }

  async function markAllRead() {
    const unread = visible.filter((notification) => notification.status === 'unread');
    for (const notification of unread) {
      try {
        await dataService.updateRow<AppNotification>('notifications', notification.id, {
          status: 'read',
          read_at: new Date().toISOString(),
        });
      } catch {
        notifyError('Mise à jour partielle');
      }
    }
    reload();
    notifySuccess('Notifications marquées comme lues');
  }

  async function remove(notification: AppNotification) {
    const confirmed = await confirmDelete(notification.title);
    if (!confirmed) return;
    try {
      await dataService.deleteRow('notifications', notification.id);
      notifySuccess('Notification supprimée');
      reload();
    } catch {
      notifyError('Suppression impossible');
    }
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      await dataService.createRow<AppNotification>('notifications', {
        title: draft.title.trim(),
        message: draft.message.trim(),
        type: draft.type,
        channel: draft.channel,
        status: 'unread',
        user_id: draft.user_id || null,
        stagiaire_id: draft.stagiaire_id || null,
        link: null,
      });
      notifySuccess('Notification créée');
      setModalOpen(false);
      setDraft(emptyDraft);
      reload();
    } catch {
      notifyError('Création impossible');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Vue d’ensemble"
        title="Notifications"
        description="Suivez les alertes, échéances et informations destinées à votre profil."
        actions={
          <>
            <Button variant="outline" onClick={() => void markAllRead()} disabled={unreadCount === 0} icon={<FiCheckCircle className="h-4 w-4" />}>
              Tout marquer comme lu
            </Button>
            <Button onClick={() => setModalOpen(true)} icon={<FiPlus className="h-4 w-4" />}>
              Nouvelle notification
            </Button>
          </>
        }
      />

      <div className="mb-5 flex gap-1 border-b border-stroke dark:border-white/10">
        {[
          { key: 'all' as const, label: `Toutes (${visible.length})` },
          { key: 'unread' as const, label: `Non lues (${unreadCount})` },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              filter === item.key
                ? 'border-primary text-primary'
                : 'border-transparent text-body hover:text-dark dark:text-body-dark dark:hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-body dark:text-body-dark">Chargement…</p>
      ) : error ? (
        <p className="py-16 text-center text-sm text-rose-600">{error}</p>
      ) : visible.length === 0 ? (
        <div className="card-root flex flex-col items-center border border-stroke px-6 py-20 text-center dark:border-white/10">
          <FiBell className="mb-3 h-8 w-8 text-body dark:text-body-dark" />
          <p className="text-sm font-semibold text-black dark:text-white">Aucune notification</p>
          <p className="mt-1 text-xs text-body dark:text-body-dark">
            Les nouvelles notifications apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((notification) => (
            <div
              key={notification.id}
              className={`card-root flex flex-wrap items-start justify-between gap-4 border p-4 dark:border-white/10 ${
                notification.status === 'unread'
                  ? 'border-primary/30 bg-primary/[0.02]'
                  : 'border-stroke'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-black dark:text-white">{notification.title}</p>
                  {notification.status === 'unread' && <span className="h-2 w-2 rounded-full bg-primary" />}
                  <Badge tone={statusTone(notification.type)}>{notification.type}</Badge>
                  <Badge tone="neutral">{notification.channel}</Badge>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-body dark:text-body-dark">
                  {notification.message}
                </p>
                <p className="mt-2 text-[11px] text-body dark:text-body-dark">
                  {formatDateTime(notification.created_at)}
                  {notification.user_id && ` · destinataire : ${fullName(data.users.find((item) => item.id === notification.user_id))}`}
                  {notification.stagiaire_id && ` · stagiaire : ${fullName(data.stagiaires.find((item) => item.id === notification.stagiaire_id))}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {notification.status === 'unread' && (
                  <button
                    type="button"
                    onClick={() => void markRead(notification)}
                    className="flex h-8 w-8 items-center justify-center text-body hover:bg-emerald-50 hover:text-emerald-600 dark:text-body-dark"
                    title="Marquer comme lu"
                  >
                    <FiCheck className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void remove(notification)}
                  className="flex h-8 w-8 items-center justify-center text-body hover:bg-rose-50 hover:text-rose-600 dark:text-body-dark"
                  title="Supprimer"
                >
                  <FiTrash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nouvelle notification"
        description="Destinez la notification à un utilisateur, un stagiaire, ou diffusez-la à tous."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" form="notification-form" loading={saving}>Envoyer</Button>
          </>
        }
      >
        <form id="notification-form" onSubmit={create} className="grid gap-4 sm:grid-cols-2">
          <Field label="Titre" required className="sm:col-span-2">
            <Input
              required
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            />
          </Field>
          <Field label="Message" required className="sm:col-span-2">
            <Textarea
              required
              rows={4}
              value={draft.message}
              onChange={(event) => setDraft((current) => ({ ...current, message: event.target.value }))}
            />
          </Field>
          <Field label="Type" required>
            <Select
              value={draft.type}
              options={typeOptions}
              onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))}
            />
          </Field>
          <Field label="Canal" required>
            <Select
              value={draft.channel}
              options={channelOptions}
              onChange={(event) => setDraft((current) => ({ ...current, channel: event.target.value }))}
            />
          </Field>
          <Field label="Utilisateur destinataire">
            <Select
              value={draft.user_id}
              placeholder="Tous les utilisateurs"
              options={buildOptions(data.users, (item) => `${fullName(item)} — ${item.email}`)}
              onChange={(event) => setDraft((current) => ({ ...current, user_id: event.target.value }))}
            />
          </Field>
          <Field label="Stagiaire concerné">
            <Select
              value={draft.stagiaire_id}
              placeholder="Aucun"
              options={buildOptions(data.stagiaires, (item) => fullName(item))}
              onChange={(event) => setDraft((current) => ({ ...current, stagiaire_id: event.target.value }))}
            />
          </Field>
          {draft.channel !== 'internal' && (
            <p className="text-xs text-amber-600 sm:col-span-2">
              Les canaux email, SMS et push nécessitent un fournisseur externe configuré. La notification interne est toujours enregistrée.
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
}
