import { useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  FiCopy,
  FiEdit2,
  FiEye,
  FiEyeOff,
  FiKey,
  FiMail,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
  FiUserPlus,
} from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader, StatCard } from '@/components/ui/Feedback';
import { Field, Input, Select } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { ROLE_LABELS, ROLE_OPTIONS, workspaceForRole } from '@/config/permissions';
import { USER_STATUS_OPTIONS, optionLabel } from '@/config/options';
import { useAuth } from '@/context/AuthContext';
import { useForgeTable } from '@/hooks/useForgeTable';
import { useReferenceData } from '@/hooks/useReferenceData';
import { authService } from '@/services/auth.service';
import { dataService } from '@/services/data.service';
import {
  forgetRememberedPassword,
  getRememberedPassword,
  rememberPassword,
} from '@/services/password-vault';
import { generateTemporaryPassword, updateUserPassword } from '@/services/user.service';
import type { Role, User } from '@/types/domain';
import { confirmAction, confirmDelete, notifyError, notifySuccess } from '@/utils/alerts';
import { formatDateTime, fullName, getErrorMessage } from '@/utils/format';
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

type AccountViewState = {
  user: User;
  temporaryPassword?: string;
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

function buildConnectionMessage({
  user,
  password,
  loginUrl,
  workspaceUrl,
}: {
  user: User;
  password?: string;
  loginUrl: string;
  workspaceUrl: string;
}): string {
  const workspace = workspaceForRole(user.role);
  const lines = [
    `Bonjour ${user.first_name},`,
    '',
    'Voici vos informations de connexion à StageBuild :',
    `Email : ${user.email}`,
  ];

  if (user.phone) lines.push(`Téléphone : ${user.phone}`);
  if (password) lines.push(`Mot de passe temporaire : ${password}`);

  lines.push(
    `Rôle : ${ROLE_LABELS[user.role]}`,
    `Espace de travail : ${workspace.label}`,
    `Accès à l’espace : ${workspaceUrl}`,
    `Lien de connexion : ${loginUrl}`,
    '',
    password
      ? 'Pour votre sécurité, modifiez votre mot de passe après votre première connexion.'
      : 'Utilisez votre mot de passe habituel. Contactez l’administration si vous l’avez oublié.',
    '',
    'Cordialement,',
    'StageBuild',
  );

  return lines.join('\n');
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-body dark:text-body-dark">
        {label}
      </p>
      <div className="mt-1 break-words text-sm text-black dark:text-white">{children}</div>
    </div>
  );
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
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
  const [accountView, setAccountView] = useState<AccountViewState | null>(null);
  const [passwordDraft, setPasswordDraft] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordFormOpen, setPasswordFormOpen] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const accountViewUserIdRef = useRef<string | null>(null);

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
      [
        fullName(user),
        user.email,
        user.phone,
        ROLE_LABELS[user.role],
        workspaceForRole(user.role).label,
        user.statut,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [users, search]);

  const activeCount = users.filter((user) => user.statut === 'active').length;
  const formateurCount = users.filter((user) => user.role === 'formateur').length;
  const stagiaireCount = users.filter((user) => user.role === 'stagiaire').length;
  const activeAdminCount = users.filter(
    (user) => user.role === 'admin' && user.statut === 'active',
  ).length;

  const loginUrl = `${window.location.origin}/login`;
  const workspace = accountView ? workspaceForRole(accountView.user.role) : null;
  const workspaceUrl = workspace ? `${window.location.origin}${workspace.path}` : '';
  const linkedStagiaire = accountView?.user.stagiaire_id
    ? data.stagiaires.find((item) => item.id === accountView.user.stagiaire_id)
    : null;
  const accountMessage = accountView
    ? buildConnectionMessage({
        user: accountView.user,
        password: accountView.temporaryPassword,
        loginUrl,
        workspaceUrl,
      })
    : '';
  const accountMailtoUrl = accountView
    ? `mailto:${accountView.user.email}?subject=${encodeURIComponent(
        'Vos informations de connexion StageBuild',
      )}&body=${encodeURIComponent(accountMessage)}`
    : '';

  function showAccount(user: User, password?: string) {
    accountViewUserIdRef.current = user.id;
    setAccountView({
      user,
      temporaryPassword: password ?? getRememberedPassword(currentUser?.id, user.id),
    });
    setPasswordDraft('');
    setPasswordConfirm('');
    setPasswordError(null);
    setPasswordFormOpen(false);
    setPasswordVisible(false);
  }

  function closeAccountView() {
    accountViewUserIdRef.current = null;
    setAccountView(null);
  }

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

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      notifySuccess(`${label} copié`);
    } catch {
      notifyError('Copie impossible', 'Votre navigateur a refusé l’accès au presse-papiers.');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      if (editing) {
        const updated = await dataService.updateRow<User>('users', editing.id, {
          email: draft.email.trim().toLowerCase(),
          first_name: draft.first_name.trim(),
          last_name: draft.last_name.trim(),
          phone: draft.phone.trim() || null,
          role: draft.role,
          statut: draft.statut,
          stagiaire_id: draft.stagiaire_id || null,
        });
        notifySuccess('Utilisateur mis à jour');
        setAccountView((current) =>
          current && current.user.id === editing.id
            ? { ...current, user: { ...current.user, ...updated, id: editing.id } }
            : current,
        );
      } else {
        const password = draft.password.trim();

        if (password.length < 6) {
          notifyError('Mot de passe trop court', 'Utilisez au moins 6 caractères.');
          setSaving(false);
          return;
        }

        const created = await authService.createAccount({
          email: draft.email,
          password,
          first_name: draft.first_name.trim(),
          last_name: draft.last_name.trim(),
          phone: draft.phone.trim() || undefined,
          role: draft.role,
          statut: draft.statut,
          stagiaire_id: draft.stagiaire_id || undefined,
        });
        const createdId = created?.id ? String(created.id) : '';

        if (createdId) {
          rememberPassword(currentUser?.id, createdId, password);
          showAccount(
            {
              id: createdId,
              email: draft.email.trim().toLowerCase(),
              first_name: draft.first_name.trim(),
              last_name: draft.last_name.trim(),
              phone: draft.phone.trim() || null,
              role: draft.role,
              statut: draft.statut as User['statut'],
              stagiaire_id: draft.stagiaire_id || null,
            },
            password,
          );
          setPasswordVisible(true);
        }

        notifySuccess(
          'Compte créé',
          createdId
            ? 'Le mot de passe temporaire est disponible dans la fiche du compte.'
            : 'Le nouvel utilisateur peut maintenant se connecter.',
        );
      }

      setModalOpen(false);
      reload();
    } catch (submitError) {
      notifyError(
        'Enregistrement impossible',
        getErrorMessage(submitError, 'Vérifiez les informations. L’email est peut-être déjà utilisé.'),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: User) {
    if (currentUser?.id === user.id) {
      notifyError('Action impossible', 'Vous ne pouvez pas supprimer votre propre compte.');
      return;
    }

    if (user.role === 'admin' && user.statut === 'active' && activeAdminCount <= 1) {
      notifyError('Action impossible', 'Impossible de supprimer le dernier administrateur actif.');
      return;
    }

    const confirmed = await confirmDelete(fullName(user));
    if (!confirmed) return;

    try {
      await dataService.deleteRow('users', user.id);
      forgetRememberedPassword(currentUser?.id, user.id);
      if (accountView?.user.id === user.id) closeAccountView();
      notifySuccess('Utilisateur supprimé');
      reload();
    } catch (deleteError) {
      notifyError('Suppression impossible', getErrorMessage(deleteError));
    }
  }

  async function handleGeneratePassword() {
    if (!accountView) return;

    const targetUserId = accountView.user.id;

    const confirmed = await confirmAction({
      title: 'Générer un nouveau mot de passe ?',
      text: `L’ancien mot de passe de ${fullName(accountView.user)} ne fonctionnera plus.`,
      confirmText: 'Générer',
      danger: true,
    });
    if (!confirmed) return;

    setSavingPassword(true);
    setPasswordError(null);

    try {
      const generated = generateTemporaryPassword();
      await updateUserPassword(targetUserId, generated);
      rememberPassword(currentUser?.id, targetUserId, generated);
      if (accountViewUserIdRef.current !== targetUserId) return;
      setAccountView((current) =>
        current && current.user.id === targetUserId
          ? { ...current, temporaryPassword: generated }
          : current,
      );
      setPasswordDraft(generated);
      setPasswordConfirm(generated);
      setPasswordVisible(true);
      notifySuccess('Mot de passe temporaire généré');
    } catch (generateError) {
      setPasswordError(getErrorMessage(generateError));
    } finally {
      setSavingPassword(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accountView) return;

    const targetUserId = accountView.user.id;
    const password = passwordDraft.trim();
    const confirmation = passwordConfirm.trim();

    if (password.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (password !== confirmation) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSavingPassword(true);
    setPasswordError(null);

    try {
      await updateUserPassword(targetUserId, password);
      rememberPassword(currentUser?.id, targetUserId, password);
      if (accountViewUserIdRef.current !== targetUserId) return;
      setAccountView((current) =>
        current && current.user.id === targetUserId
          ? { ...current, temporaryPassword: password }
          : current,
      );
      setPasswordVisible(true);
      setPasswordFormOpen(false);
      setPasswordDraft('');
      setPasswordConfirm('');
      notifySuccess('Mot de passe modifié');
    } catch (passwordUpdateError) {
      setPasswordError(getErrorMessage(passwordUpdateError));
    } finally {
      setSavingPassword(false);
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
      key: 'workspace',
      header: 'Espace de travail',
      hideBelow: 'lg',
      render: (row) => (
        <span className="text-xs text-body dark:text-body-dark">
          {workspaceForRole(row.role).label}
        </span>
      ),
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
            onClick={() => showAccount(row)}
            className="flex h-8 w-8 items-center justify-center text-body hover:bg-primary/10 hover:text-primary dark:text-body-dark"
            title="Voir le compte et les identifiants"
            aria-label="Voir le compte et les identifiants"
          >
            <FiEye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="flex h-8 w-8 items-center justify-center text-body hover:bg-primary/10 hover:text-primary dark:text-body-dark"
            title="Modifier"
            aria-label="Modifier l’utilisateur"
          >
            <FiEdit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void handleDelete(row)}
            className="flex h-8 w-8 items-center justify-center text-body hover:bg-rose-50 hover:text-rose-600 dark:text-body-dark"
            title="Supprimer"
            aria-label="Supprimer l’utilisateur"
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
        description="Gérez les comptes, les rôles, les statuts, les mots de passe et les informations de connexion aux espaces de travail."
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
          placeholder="Rechercher un utilisateur, un rôle, un espace…"
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
            ? 'Les informations du compte peuvent être modifiées ici. Le mot de passe se gère depuis la fiche du compte.'
            : 'Un compte Forge Console sera créé avec ces identifiants.'
        }
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
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
              onChange={(event) =>
                setDraft((current) => ({ ...current, first_name: event.target.value }))
              }
            />
          </Field>
          <Field label="Nom" required>
            <Input
              required
              value={draft.last_name}
              onChange={(event) =>
                setDraft((current) => ({ ...current, last_name: event.target.value }))
              }
            />
          </Field>
          <Field label="Email" required>
            <Input
              type="email"
              required
              value={draft.email}
              onChange={(event) =>
                setDraft((current) => ({ ...current, email: event.target.value }))
              }
            />
          </Field>
          <Field label="Téléphone">
            <Input
              type="tel"
              value={draft.phone}
              onChange={(event) =>
                setDraft((current) => ({ ...current, phone: event.target.value }))
              }
            />
          </Field>
          {!editing && (
            <Field
              label="Mot de passe"
              required
              hint="6 caractères minimum. Il sera visible dans la fiche du compte pendant cette session."
              className="sm:col-span-2"
            >
              <Input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={draft.password}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, password: event.target.value }))
                }
              />
            </Field>
          )}
          <Field label="Rôle" required>
            <Select
              value={draft.role}
              options={ROLE_OPTIONS}
              onChange={(event) =>
                setDraft((current) => ({ ...current, role: event.target.value as Role }))
              }
            />
          </Field>
          <Field label="Statut" required>
            <Select
              value={draft.statut}
              options={USER_STATUS_OPTIONS}
              onChange={(event) =>
                setDraft((current) => ({ ...current, statut: event.target.value }))
              }
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
              onChange={(event) =>
                setDraft((current) => ({ ...current, stagiaire_id: event.target.value }))
              }
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={Boolean(accountView)}
        onClose={closeAccountView}
        title="Compte utilisateur"
        description={
          accountView
            ? `${fullName(accountView.user)} · ${ROLE_LABELS[accountView.user.role]}`
            : undefined
        }
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={closeAccountView}>
              Fermer
            </Button>
            <Button
              variant="outline"
              icon={<FiCopy className="h-4 w-4" />}
              onClick={() => void copyText('Identifiants', accountMessage)}
            >
              Copier les identifiants
            </Button>
            <Button
              icon={<FiMail className="h-4 w-4" />}
              onClick={() => {
                window.location.href = accountMailtoUrl;
              }}
            >
              Envoyer par email
            </Button>
          </>
        }
      >
        {accountView && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border border-stroke bg-gray2/60 px-4 py-3 dark:border-white/10 dark:bg-white/5">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-body dark:text-body-dark">
                  Compte utilisateur
                </p>
                <p className="mt-1 break-words text-sm font-semibold text-black dark:text-white">
                  {fullName(accountView.user)}
                </p>
                <p className="break-all text-xs text-body dark:text-body-dark">
                  {accountView.user.email}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={statusTone(accountView.user.statut)}>
                  {optionLabel(USER_STATUS_OPTIONS, accountView.user.statut)}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<FiEdit2 className="h-3.5 w-3.5" />}
                  onClick={() => {
                    const target = accountView.user;
                    closeAccountView();
                    openEdit(target);
                  }}
                >
                  Modifier le compte
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-body dark:text-body-dark">
                  Email de connexion
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all border border-stroke bg-gray2 px-3 py-2 font-mono text-sm font-bold text-black dark:border-white/10 dark:bg-white/5 dark:text-white">
                    {accountView.user.email}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<FiCopy className="h-3.5 w-3.5" />}
                    onClick={() => void copyText('Email', accountView.user.email)}
                  >
                    Copier
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-body dark:text-body-dark">
                  Téléphone
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all border border-stroke bg-gray2 px-3 py-2 font-mono text-sm font-bold text-black dark:border-white/10 dark:bg-white/5 dark:text-white">
                    {accountView.user.phone ?? '—'}
                  </code>
                  {accountView.user.phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<FiCopy className="h-3.5 w-3.5" />}
                      onClick={() =>
                        void copyText('Téléphone', accountView.user.phone as string)
                      }
                    >
                      Copier
                    </Button>
                  )}
                </div>
              </div>

              <Detail label="Rôle">{ROLE_LABELS[accountView.user.role]}</Detail>
              <Detail label="Espace de travail">{workspace?.label ?? '—'}</Detail>
              <Detail label="Statut">
                {optionLabel(USER_STATUS_OPTIONS, accountView.user.statut)}
              </Detail>
              <Detail label="Dernière connexion">
                {formatDateTime(accountView.user.last_login_at)}
              </Detail>
              <Detail label="Dossier stagiaire lié">
                {linkedStagiaire
                  ? `${fullName(linkedStagiaire)} (${linkedStagiaire.matricule})`
                  : '—'}
              </Detail>
              <Detail label="Compte créé le">
                {formatDateTime(accountView.user.created_at)}
              </Detail>
            </div>

            <div className="border border-stroke dark:border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-body dark:text-body-dark">
                    Mot de passe
                  </p>
                  {accountView.temporaryPassword ? (
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <code className="min-w-0 flex-1 break-all border border-stroke bg-gray2 px-3 py-2 font-mono text-sm font-bold text-black dark:border-white/10 dark:bg-white/5 dark:text-white">
                        {passwordVisible
                          ? accountView.temporaryPassword
                          : '•'.repeat(Math.min(accountView.temporaryPassword.length, 16))}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={
                          passwordVisible ? (
                            <FiEyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <FiEye className="h-3.5 w-3.5" />
                          )
                        }
                        onClick={() => setPasswordVisible((current) => !current)}
                      >
                        {passwordVisible ? 'Masquer' : 'Afficher'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<FiCopy className="h-3.5 w-3.5" />}
                        onClick={() =>
                          void copyText(
                            'Mot de passe',
                            accountView.temporaryPassword as string,
                          )
                        }
                      >
                        Copier
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-body dark:text-body-dark">
                      Non affiché. Le mot de passe est stocké de façon sécurisée et ne peut pas
                      être récupéré. Générez ou modifiez-le pour obtenir un nouveau mot de passe.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<FiRefreshCw className="h-3.5 w-3.5" />}
                    loading={savingPassword}
                    onClick={() => void handleGeneratePassword()}
                  >
                    Générer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<FiKey className="h-3.5 w-3.5" />}
                    onClick={() => {
                      if (passwordFormOpen) {
                        setPasswordFormOpen(false);
                        setPasswordDraft('');
                        setPasswordConfirm('');
                        setPasswordError(null);
                      } else {
                        setPasswordFormOpen(true);
                      }
                    }}
                  >
                    Changer
                  </Button>
                </div>
              </div>

              {passwordError && (
                <div className="mx-4 mb-3 mt-3 border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                  {passwordError}
                </div>
              )}

              {passwordFormOpen && (
                <form
                  onSubmit={handlePasswordSubmit}
                  className="space-y-3 border-t border-stroke px-4 py-4 dark:border-white/10"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Nouveau mot de passe" required hint="6 caractères minimum.">
                      <Input
                        type="password"
                        required
                        minLength={6}
                        autoComplete="new-password"
                        value={passwordDraft}
                        onChange={(event) => setPasswordDraft(event.target.value)}
                      />
                    </Field>
                    <Field label="Confirmation" required>
                      <Input
                        type="password"
                        required
                        minLength={6}
                        autoComplete="new-password"
                        value={passwordConfirm}
                        onChange={(event) => setPasswordConfirm(event.target.value)}
                      />
                    </Field>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" size="sm" loading={savingPassword}>
                      Enregistrer
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPasswordFormOpen(false);
                        setPasswordDraft('');
                        setPasswordConfirm('');
                        setPasswordError(null);
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                </form>
              )}
            </div>

            <div className="border border-stroke dark:border-white/10">
              <div className="border-b border-stroke px-4 py-3 dark:border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-wide text-body dark:text-body-dark">
                  Informations de connexion
                </p>
                <p className="mt-1 text-xs text-body dark:text-body-dark">
                  Transmettez ces informations à l’utilisateur pour qu’il accède à son espace de
                  travail.
                </p>
              </div>
              <div className="space-y-3 px-4 py-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-body dark:text-body-dark">
                    Lien de connexion
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="min-w-0 flex-1 break-all border border-stroke bg-gray2 px-3 py-2 text-sm text-black dark:border-white/10 dark:bg-white/5 dark:text-white">
                      {loginUrl}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<FiCopy className="h-3.5 w-3.5" />}
                      onClick={() => void copyText('Lien de connexion', loginUrl)}
                    >
                      Copier
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-body dark:text-body-dark">
                    Espace de travail
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="min-w-0 flex-1 break-all border border-stroke bg-gray2 px-3 py-2 text-sm text-black dark:border-white/10 dark:bg-white/5 dark:text-white">
                      {workspace?.label ?? '—'} — {workspaceUrl}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<FiCopy className="h-3.5 w-3.5" />}
                      onClick={() => void copyText('Lien de l’espace', workspaceUrl)}
                    >
                      Copier
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-body dark:text-body-dark">
              Le mot de passe n’est affiché que s’il a été créé ou modifié pendant cette session.
              Il n’est jamais stocké en clair.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
