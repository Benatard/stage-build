import { useMemo, useState } from 'react';
import { FiEdit2, FiPlus, FiTrash2, FiUserPlus } from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader, StatCard } from '@/components/ui/Feedback';
import { Field, Input, Select } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { ROLE_LABELS, ROLE_OPTIONS } from '@/config/permissions';
import { USER_STATUS_OPTIONS, optionLabel } from '@/config/options';
import { useForgeTable } from '@/hooks/useForgeTable';
import { useReferenceData } from '@/hooks/useReferenceData';
import { authService } from '@/services/auth.service';
import { dataService } from '@/services/data.service';
import type { Role, User } from '@/types/domain';
import { confirmDelete, notifyError, notifySuccess } from '@/utils/alerts';
import { formatDateTime, fullName } from '@/utils/format';
import { buildOptions } from '@/utils/options';

type UserDraft = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: Role;
  statut: string;
  stagiaire_id: string;
};

const emptyDraft: UserDraft = {
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  phone: '',
  role: 'stagiaire',
  statut: 'active',
  stagiaire_id: '',
};

export default function UsersPage() {
  const { data } = useReferenceData();
  const { rows: users, loading, error, reload } = useForgeTable<User>('users', {
    order: 'last_name.asc',
    limit: 500,
  });
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [draft, setDraft] = useState<UserDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const stagiaireOptions = useMemo(
    () =>
      buildOptions(
        data.stagiaires,
        (stagiaire) => `${fullName(stagiaire)} (${stagiaire.matricule})`,
      ),
    [data.stagiaires],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      [fullName(user), user.email, user.phone, ROLE_LABELS[user.role], user.statut]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [users, search]);

  const activeCount = users.filter((user) => user.statut === 'active').length;
  const formateurCount = users.filter((user) => user.role === 'formateur').length;
  const stagiaireCount = users.filter((user) => user.role === 'stagiaire').length;

  function openCreate() {
    setEditing(null);
    setDraft(emptyDraft);
    setModalOpen(true);
  }

  function openEdit(user: User) {
    setEditing(user);
    setDraft({
      email: user.email,
      password: '',
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone ?? '',
      role: user.role,
      statut: user.statut,
      stagiaire_id: user.stagiaire_id ?? '',
    });
    setModalOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      if (editing) {
        await dataService.updateRow<User>('users', editing.id, {
          email: draft.email.trim().toLowerCase(),
          first_name: draft.first_name.trim(),
          last_name: draft.last_name.trim(),
          phone: draft.phone.trim() || null,
          role: draft.role,
          statut: draft.statut,
          stagiaire_id: draft.stagiaire_id || null,
        });
        notifySuccess('Utilisateur mis à jour');
      } else {
        if (draft.password.length < 6) {
          notifyError('Mot de passe trop court', 'Utilisez au moins 6 caractères.');
          setSaving(false);
          return;
        }

        await authService.createAccount({
          email: draft.email,
          password: draft.password,
          first_name: draft.first_name.trim(),
          last_name: draft.last_name.trim(),
          phone: draft.phone.trim() || undefined,
          role: draft.role,
          statut: draft.statut,
          stagiaire_id: draft.stagiaire_id || undefined,
        });
        notifySuccess('Compte créé', 'Le nouvel utilisateur peut maintenant se connecter.');
      }

      setModalOpen(false);
      reload();
    } catch {
      notifyError(
        'Enregistrement impossible',
        'Vérifiez les informations. L’email est peut-être déjà utilisé.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: User) {
    const confirmed = await confirmDelete(fullName(user));
    if (!confirmed) return;
    try {
      await dataService.deleteRow('users', user.id);
      notifySuccess('Utilisateur supprimé');
      reload();
    } catch {
      notifyError('Suppression impossible');
    }
  }

  const columns: TableColumn<User>[] = [
    {
      key: 'user',
      header: 'Utilisateur',
      render: (row) => (
        <div>
          <p className="font-semibold text-black dark:text-white">{fullName(row)}</p>
          <p className="text-xs text-body dark:text-body-dark">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rôle',
      render: (row) => <Badge tone="primary">{ROLE_LABELS[row.role]}</Badge>,
    },
    {
      key: 'phone',
      header: 'Téléphone',
      hideBelow: 'lg',
      render: (row) => row.phone ?? '—',
    },
    {
      key: 'last_login',
      header: 'Dernière connexion',
      hideBelow: 'md',
      render: (row) => formatDateTime(row.last_login_at),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => (
        <Badge tone={statusTone(row.statut)}>{optionLabel(USER_STATUS_OPTIONS, row.statut)}</Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="flex h-8 w-8 items-center justify-center text-body hover:bg-primary/10 hover:text-primary dark:text-body-dark"
            title="Modifier"
          >
            <FiEdit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void handleDelete(row)}
            className="flex h-8 w-8 items-center justify-center text-body hover:bg-rose-50 hover:text-rose-600 dark:text-body-dark"
            title="Supprimer"
          >
            <FiTrash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Utilisateurs & rôles"
        description="Gérez les comptes, les rôles, les statuts et les liens vers les dossiers stagiaires."
        actions={
          <Button onClick={openCreate} icon={<FiUserPlus className="h-4 w-4" />}>
            Nouvel utilisateur
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Comptes" value={users.length} tone="primary" />
        <StatCard label="Actifs" value={activeCount} tone="success" />
        <StatCard label="Formateurs" value={formateurCount} tone="purple" />
        <StatCard label="Stagiaires" value={stagiaireCount} tone="warning" />
      </div>

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Rechercher un utilisateur, un rôle…"
          className="sm:max-w-sm"
        />
      </div>

      <div className="card-root border border-stroke dark:border-white/10">
        <DataTable
          columns={columns}
          rows={filtered}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyTitle="Aucun utilisateur"
          emptyDescription="Créez le premier compte utilisateur."
          emptyAction={
            <Button size="sm" onClick={openCreate} icon={<FiPlus className="h-4 w-4" />}>
              Nouvel utilisateur
            </Button>
          }
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier l’utilisateur' : 'Nouvel utilisateur'}
        description={
          editing
            ? 'Le mot de passe ne peut pas être modifié depuis ce formulaire.'
            : 'Un compte Forge Console sera créé avec ces identifiants.'
        }
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" form="user-form" loading={saving}>
              {editing ? 'Enregistrer' : 'Créer le compte'}
            </Button>
          </>
        }
      >
        <form id="user-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom" required>
            <Input
              required
              value={draft.first_name}
              onChange={(event) => setDraft((current) => ({ ...current, first_name: event.target.value }))}
            />
          </Field>
          <Field label="Nom" required>
            <Input
              required
              value={draft.last_name}
              onChange={(event) => setDraft((current) => ({ ...current, last_name: event.target.value }))}
            />
          </Field>
          <Field label="Email" required>
            <Input
              type="email"
              required
              value={draft.email}
              onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
            />
          </Field>
          <Field label="Téléphone">
            <Input
              type="tel"
              value={draft.phone}
              onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
            />
          </Field>
          {!editing && (
            <Field label="Mot de passe" required hint="6 caractères minimum." className="sm:col-span-2">
              <Input
                type="password"
                required
                minLength={6}
                value={draft.password}
                onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))}
              />
            </Field>
          )}
          <Field label="Rôle" required>
            <Select
              value={draft.role}
              options={ROLE_OPTIONS}
              onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value as Role }))}
            />
          </Field>
          <Field label="Statut" required>
            <Select
              value={draft.statut}
              options={USER_STATUS_OPTIONS}
              onChange={(event) => setDraft((current) => ({ ...current, statut: event.target.value }))}
            />
          </Field>
          <Field
            label="Dossier stagiaire lié"
            hint="Requis pour qu’un stagiaire voie ses propres données."
            className="sm:col-span-2"
          >
            <Select
              value={draft.stagiaire_id}
              placeholder="Aucun dossier lié"
              options={stagiaireOptions}
              onChange={(event) => setDraft((current) => ({ ...current, stagiaire_id: event.target.value }))}
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
