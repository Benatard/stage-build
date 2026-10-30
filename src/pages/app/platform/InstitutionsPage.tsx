import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArchive,
  FiCheckCircle,
  FiEdit2,
  FiExternalLink,
  FiPauseCircle,
  FiPlus,
  FiUsers,
} from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader, StatCard } from '@/components/ui/Feedback';
import { Field, Input, Select, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { INSTITUTION_STATUS_OPTIONS, INSTITUTION_TYPE_OPTIONS, optionLabel } from '@/config/options';
import { useAuth } from '@/context/AuthContext';
import { useForgeTable } from '@/hooks/useForgeTable';
import { authService } from '@/services/auth.service';
import { dataService } from '@/services/data.service';
import type { Institution, InstitutionStatus, InstitutionType } from '@/types/domain';
import { confirmAction, notifyError, notifySuccess } from '@/utils/alerts';
import { formatDateTime, getErrorMessage } from '@/utils/format';

type DirectorDraft = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
};

type InstitutionDraft = {
  name: string;
  slug: string;
  code: string;
  type: InstitutionType;
  status: InstitutionStatus;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  country: string;
  logo_url: string;
  primary_color: string;
  director: DirectorDraft;
};

const emptyDirector: DirectorDraft = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
};

const emptyDraft: InstitutionDraft = {
  name: '',
  slug: '',
  code: '',
  type: 'centre_formation',
  status: 'active',
  email: '',
  phone: '',
  website: '',
  address: '',
  city: '',
  country: 'RDC',
  logo_url: '',
  primary_color: '#2563eb',
  director: emptyDirector,
};

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function InstitutionsPage() {
  const { setActiveInstitution } = useAuth();
  const navigate = useNavigate();
  const { rows: institutions, loading, error, reload } = useForgeTable<Institution>(
    'institutions',
    { order: 'name.asc', limit: 500 },
  );
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Institution | null>(null);
  const [draft, setDraft] = useState<InstitutionDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return institutions;
    return institutions.filter((institution) =>
      [
        institution.name,
        institution.code,
        institution.slug,
        institution.email,
        institution.city,
        institution.country,
        optionLabel(INSTITUTION_TYPE_OPTIONS, institution.type),
        optionLabel(INSTITUTION_STATUS_OPTIONS, institution.status),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [institutions, search]);

  const activeCount = institutions.filter((item) => item.status === 'active').length;
  const trialCount = institutions.filter((item) => item.status === 'essai').length;
  const suspendedCount = institutions.filter((item) => item.status === 'suspendue').length;

  function openCreate() {
    setEditing(null);
    setDraft({ ...emptyDraft, director: { ...emptyDirector } });
    setModalOpen(true);
  }

  function openEdit(institution: Institution) {
    setEditing(institution);
    setDraft({
      name: institution.name ?? '',
      slug: institution.slug ?? '',
      code: institution.code ?? '',
      type: institution.type ?? 'centre_formation',
      status: institution.status ?? 'active',
      email: institution.email ?? '',
      phone: institution.phone ?? '',
      website: institution.website ?? '',
      address: institution.address ?? '',
      city: institution.city ?? '',
      country: institution.country ?? 'RDC',
      logo_url: institution.logo_url ?? '',
      primary_color: institution.primary_color ?? '#2563eb',
      director: { ...emptyDirector },
    });
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const payload = {
      name: draft.name.trim(),
      slug: (draft.slug.trim() || slugify(draft.name)).toLowerCase(),
      code: draft.code.trim().toUpperCase(),
      type: draft.type,
      status: draft.status,
      email: draft.email.trim() || null,
      phone: draft.phone.trim() || null,
      website: draft.website.trim() || null,
      address: draft.address.trim() || null,
      city: draft.city.trim() || null,
      country: draft.country.trim() || null,
      logo_url: draft.logo_url.trim() || null,
      primary_color: draft.primary_color.trim() || null,
    };

    try {
      if (editing) {
        await dataService.updateRow<Institution>('institutions', editing.id, payload);
        notifySuccess('Institution mise à jour');
      } else {
        // La création d'une institution est une opération plateforme : on quitte
        // le contexte d'une institution existante pour éviter tout filtrage tenant.
        setActiveInstitution(null);
        const created = await dataService.createRow<Institution>('institutions', payload);

        const director = draft.director;
        if (director.email.trim() && director.password.trim()) {
          try {
            const account = await authService.createAccount({
              email: director.email,
              password: director.password,
              first_name: director.first_name.trim(),
              last_name: director.last_name.trim(),
              role: 'directeur',
              institution_id: created.id,
              must_change_password: true,
            });
            const userId = account?.id ? String(account.id) : '';

            if (userId) {
              await dataService.updateRow<Institution>('institutions', created.id, {
                owner_user_id: userId,
              });

              try {
                const membership = await dataService.createRow<{ id: string }>(
                  'institution_memberships',
                  {
                    institution_id: created.id,
                    user_id: userId,
                    status: 'active',
                    is_primary: true,
                    joined_at: new Date().toISOString(),
                  },
                );
                if (membership?.id) {
                  await dataService.createRow('membership_roles', {
                    membership_id: membership.id,
                    role: 'directeur',
                  });
                }
              } catch (membershipError) {
                console.warn('Membership directeur non créée', membershipError);
              }
            }
          } catch (directorError) {
            notifyError(
              'Institution créée, compte directeur à finaliser',
              getErrorMessage(directorError, 'Créez le compte directeur depuis les utilisateurs.'),
            );
          }
        }

        notifySuccess('Institution créée');
      }

      setModalOpen(false);
      reload();
    } catch (submitError) {
      notifyError(
        'Enregistrement impossible',
        getErrorMessage(submitError, 'Vérifiez le code et le slug de l’institution.'),
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(institution: Institution, status: InstitutionStatus) {
    setActionId(institution.id);
    try {
      await dataService.updateRow<Institution>('institutions', institution.id, { status });
      notifySuccess('Statut mis à jour', institution.name);
      reload();
    } catch (statusError) {
      notifyError('Mise à jour impossible', getErrorMessage(statusError));
    } finally {
      setActionId(null);
    }
  }

  async function archive(institution: Institution) {
    const confirmed = await confirmAction({
      title: 'Archiver cette institution ?',
      text: `${institution.name} ne sera plus accessible à ses utilisateurs.`,
      confirmText: 'Archiver',
      danger: true,
    });
    if (!confirmed) return;
    await changeStatus(institution, 'archivee');
  }

  function openWorkspace(institution: Institution) {
    setActiveInstitution(institution.id);
    navigate('/app');
  }

  const columns: TableColumn<Institution>[] = [
    {
      key: 'name',
      header: 'Institution',
      render: (row) => (
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: row.primary_color ?? '#2563eb' }}
          >
            {(row.code ?? '?').slice(0, 3).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-black dark:text-white">
              {row.name ?? 'Institution sans nom'}
            </p>
            <p className="truncate text-xs text-body dark:text-body-dark">
              {row.code ?? '—'} · {row.slug ?? '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      hideBelow: 'md',
      render: (row) => optionLabel(INSTITUTION_TYPE_OPTIONS, row.type),
    },
    {
      key: 'contact',
      header: 'Contact',
      hideBelow: 'lg',
      render: (row) => (
        <div className="text-xs text-body dark:text-body-dark">
          <p>{row.email ?? '—'}</p>
          <p>{row.phone ?? ''}</p>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Localisation',
      hideBelow: 'lg',
      render: (row) => [row.city, row.country].filter(Boolean).join(', ') || '—',
    },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => (
        <Badge tone={statusTone(row.status)}>
          {optionLabel(INSTITUTION_STATUS_OPTIONS, row.status)}
        </Badge>
      ),
    },
    {
      key: 'created',
      header: 'Créée le',
      hideBelow: 'lg',
      render: (row) => formatDateTime(row.created_at),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={() => openWorkspace(row)}
            className="flex h-8 w-8 items-center justify-center text-body hover:bg-primary/10 hover:text-primary dark:text-body-dark"
            title="Ouvrir l’espace de cette institution"
            aria-label="Ouvrir l’espace de cette institution"
          >
            <FiExternalLink className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="flex h-8 w-8 items-center justify-center text-body hover:bg-primary/10 hover:text-primary dark:text-body-dark"
            title="Modifier"
            aria-label="Modifier l’institution"
          >
            <FiEdit2 className="h-4 w-4" />
          </button>
          {row.status !== 'active' ? (
            <button
              type="button"
              disabled={actionId === row.id}
              onClick={() => void changeStatus(row, 'active')}
              className="flex h-8 w-8 items-center justify-center text-body hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50 dark:text-body-dark"
              title="Activer"
              aria-label="Activer l’institution"
            >
              <FiCheckCircle className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={actionId === row.id}
              onClick={() => void changeStatus(row, 'suspendue')}
              className="flex h-8 w-8 items-center justify-center text-body hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50 dark:text-body-dark"
              title="Suspendre"
              aria-label="Suspendre l’institution"
            >
              <FiPauseCircle className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            disabled={actionId === row.id}
            onClick={() => void archive(row)}
            className="flex h-8 w-8 items-center justify-center text-body hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:text-body-dark"
            title="Archiver"
            aria-label="Archiver l’institution"
          >
            <FiArchive className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Console plateforme"
        title="Institutions"
        description="Créez et pilotez les espaces institutionnels. Chaque institution dispose de ses propres données, rôles, formations et utilisateurs."
        actions={
          <Button onClick={openCreate} icon={<FiPlus className="h-4 w-4" />}>
            Nouvelle institution
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Institutions" value={institutions.length} tone="primary" icon={<FiUsers className="h-4 w-4" />} />
        <StatCard label="Actives" value={activeCount} tone="success" icon={<FiCheckCircle className="h-4 w-4" />} />
        <StatCard label="En essai" value={trialCount} tone="warning" />
        <StatCard label="Suspendues" value={suspendedCount} tone="danger" />
      </div>

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Rechercher une institution, un code, une ville…"
          className="sm:max-w-md"
        />
      </div>

      <div className="card-root border border-stroke dark:border-white/10">
        <DataTable
          columns={columns}
          rows={filtered}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyTitle="Aucune institution"
          emptyDescription="Créez la première institution de la plateforme."
          emptyAction={
            <Button size="sm" onClick={openCreate} icon={<FiPlus className="h-4 w-4" />}>
              Nouvelle institution
            </Button>
          }
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier l’institution' : 'Nouvelle institution'}
        description={
          editing
            ? 'Les informations de l’institution et son statut d’accès.'
            : 'L’institution est créée avec un espace isolé. Vous pouvez aussi créer son compte directeur.'
        }
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" form="institution-form" loading={saving}>
              {editing ? 'Enregistrer' : 'Créer l’institution'}
            </Button>
          </>
        }
      >
        <form id="institution-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom de l’institution" required className="sm:col-span-2">
            <Input
              required
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  name: event.target.value,
                  slug: current.slug || slugify(event.target.value),
                  code: current.code || slugify(event.target.value).slice(0, 12).toUpperCase(),
                }))
              }
            />
          </Field>
          <Field label="Code" required hint="Identifiant court, unique.">
            <Input
              required
              value={draft.code}
              onChange={(event) =>
                setDraft((current) => ({ ...current, code: event.target.value }))
              }
            />
          </Field>
          <Field label="Slug" required hint="Utilisé dans les URL publiques.">
            <Input
              required
              value={draft.slug}
              onChange={(event) =>
                setDraft((current) => ({ ...current, slug: event.target.value }))
              }
            />
          </Field>
          <Field label="Type" required>
            <Select
              value={draft.type}
              options={INSTITUTION_TYPE_OPTIONS}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  type: event.target.value as InstitutionType,
                }))
              }
            />
          </Field>
          <Field label="Statut" required>
            <Select
              value={draft.status}
              options={INSTITUTION_STATUS_OPTIONS}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  status: event.target.value as InstitutionStatus,
                }))
              }
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
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
          <Field label="Site web">
            <Input
              value={draft.website}
              onChange={(event) =>
                setDraft((current) => ({ ...current, website: event.target.value }))
              }
            />
          </Field>
          <Field label="Ville">
            <Input
              value={draft.city}
              onChange={(event) =>
                setDraft((current) => ({ ...current, city: event.target.value }))
              }
            />
          </Field>
          <Field label="Pays">
            <Input
              value={draft.country}
              onChange={(event) =>
                setDraft((current) => ({ ...current, country: event.target.value }))
              }
            />
          </Field>
          <Field label="Couleur principale">
            <Input
              type="color"
              value={draft.primary_color}
              onChange={(event) =>
                setDraft((current) => ({ ...current, primary_color: event.target.value }))
              }
              className="h-11 p-1"
            />
          </Field>
          <Field label="Adresse" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={draft.address}
              onChange={(event) =>
                setDraft((current) => ({ ...current, address: event.target.value }))
              }
            />
          </Field>
          <Field label="Logo (URL)" className="sm:col-span-2">
            <Input
              value={draft.logo_url}
              onChange={(event) =>
                setDraft((current) => ({ ...current, logo_url: event.target.value }))
              }
              placeholder="https://…"
            />
          </Field>

          {!editing && (
            <div className="sm:col-span-2 border-t border-stroke pt-4 dark:border-white/10">
              <p className="text-sm font-bold text-black dark:text-white">
                Compte directeur (optionnel)
              </p>
              <p className="mb-3 text-xs text-body dark:text-body-dark">
                Le directeur pourra administrer cette institution, ses utilisateurs et ses paramètres.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Prénom">
                  <Input
                    value={draft.director.first_name}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        director: { ...current.director, first_name: event.target.value },
                      }))
                    }
                  />
                </Field>
                <Field label="Nom">
                  <Input
                    value={draft.director.last_name}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        director: { ...current.director, last_name: event.target.value },
                      }))
                    }
                  />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={draft.director.email}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        director: { ...current.director, email: event.target.value },
                      }))
                    }
                  />
                </Field>
                <Field label="Mot de passe temporaire" hint="6 caractères minimum.">
                  <Input
                    type="password"
                    minLength={6}
                    value={draft.director.password}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        director: { ...current.director, password: event.target.value },
                      }))
                    }
                  />
                </Field>
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
