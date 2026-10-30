import { useState, type FormEvent } from 'react';
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/Feedback';
import { Field, Input, Select, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { DOCUMENT_TYPE_OPTIONS, optionLabel } from '@/config/options';
import { useCrud } from '@/hooks/useCrud';
import { useForgeTable } from '@/hooks/useForgeTable';
import type { DocumentTemplate, DocumentType } from '@/types/domain';
import { confirmDelete, notifyError, notifySuccess } from '@/utils/alerts';
import { formatDate, getErrorMessage } from '@/utils/format';

type Draft = {
  name: string;
  type: DocumentType;
  content: string;
  file_url: string;
  is_default: boolean;
  status: 'active' | 'inactive';
};

const emptyDraft: Draft = {
  name: '',
  type: 'attestation_stage',
  content: '{}',
  file_url: '',
  is_default: false,
  status: 'active',
};

export default function DocumentTemplatesPage() {
  const { rows, loading, error, reload } = useForgeTable<DocumentTemplate>(
    'document_templates',
    { order: 'name.asc', limit: 500 },
  );
  const { create, update, remove, saving, deleting } = useCrud('document_templates', {
    onSuccess: reload,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentTemplate | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  function openCreate() {
    setEditing(null);
    setDraft(emptyDraft);
    setModalOpen(true);
  }

  function openEdit(template: DocumentTemplate) {
    setEditing(template);
    setDraft({
      name: template.name,
      type: template.type,
      content: JSON.stringify(template.content ?? {}, null, 2),
      file_url: template.file_url ?? '',
      is_default: template.is_default,
      status: template.status,
    });
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let content: Record<string, unknown>;
    try {
      content = JSON.parse(draft.content) as Record<string, unknown>;
    } catch {
      notifyError('JSON invalide', 'Corrigez la syntaxe du modèle avant d’enregistrer.');
      return;
    }

    const payload = {
      name: draft.name.trim(),
      type: draft.type,
      content,
      file_url: draft.file_url.trim() || null,
      is_default: draft.is_default,
      status: draft.status,
    };

    const result = editing
      ? await update<DocumentTemplate>(editing.id, payload)
      : await create<DocumentTemplate>(payload);

    if (result) {
      notifySuccess(editing ? 'Modèle mis à jour' : 'Modèle créé');
      setModalOpen(false);
    } else {
      notifyError('Enregistrement impossible');
    }
  }

  async function handleDelete(template: DocumentTemplate) {
    const confirmed = await confirmDelete(template.name);
    if (!confirmed) return;
    if (await remove(template.id)) notifySuccess('Modèle supprimé');
  }

  const columns: TableColumn<DocumentTemplate>[] = [
    {
      key: 'name',
      header: 'Modèle',
      render: (row) => (
        <div>
          <p className="font-semibold text-black dark:text-white">{row.name}</p>
          <p className="text-xs text-body dark:text-body-dark">
            {optionLabel(DOCUMENT_TYPE_OPTIONS, row.type)}
          </p>
        </div>
      ),
    },
    {
      key: 'default',
      header: 'Par défaut',
      hideBelow: 'md',
      render: (row) => (
        <Badge tone={row.is_default ? 'primary' : 'neutral'}>
          {row.is_default ? 'Oui' : 'Non'}
        </Badge>
      ),
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
    {
      key: 'updated',
      header: 'Mis à jour',
      hideBelow: 'lg',
      render: (row) => formatDate(row.updated_at),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="flex h-8 w-8 items-center justify-center text-body hover:bg-primary/10 hover:text-primary dark:text-body-dark"
            aria-label="Modifier le modèle"
          >
            <FiEdit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={() => void handleDelete(row)}
            className="flex h-8 w-8 items-center justify-center text-body hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:text-body-dark"
            aria-label="Supprimer le modèle"
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
        eyebrow="Institution"
        title="Modèles de documents"
        description="Définissez les modèles utilisés pour générer les attestations, certificats, bulletins et fiches."
        actions={
          <Button onClick={openCreate} icon={<FiPlus className="h-4 w-4" />}>
            Nouveau modèle
          </Button>
        }
      />

      <div className="card-root border border-stroke dark:border-white/10">
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyTitle="Aucun modèle"
          emptyDescription="Créez un premier modèle de document."
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier le modèle' : 'Nouveau modèle'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" form="template-form" loading={saving}>
              Enregistrer
            </Button>
          </>
        }
      >
        <form id="template-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nom du modèle" required>
            <Input
              required
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({ ...current, name: event.target.value }))
              }
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type de document" required>
              <Select
                value={draft.type}
                options={DOCUMENT_TYPE_OPTIONS}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    type: event.target.value as DocumentType,
                  }))
                }
              />
            </Field>
            <Field label="Statut" required>
              <Select
                value={draft.status}
                options={[
                  { value: 'active', label: 'Actif' },
                  { value: 'inactive', label: 'Inactif' },
                ]}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target.value as 'active' | 'inactive',
                  }))
                }
              />
            </Field>
          </div>
          <Field label="Fichier (URL)">
            <Input
              value={draft.file_url}
              onChange={(event) =>
                setDraft((current) => ({ ...current, file_url: event.target.value }))
              }
              placeholder="https://…"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-dark dark:text-white">
            <input
              type="checkbox"
              checked={draft.is_default}
              onChange={(event) =>
                setDraft((current) => ({ ...current, is_default: event.target.checked }))
              }
              className="h-4 w-4"
            />
            Utiliser ce modèle par défaut
          </label>
          <Field label="Contenu JSON" required hint="Variables disponibles selon le type de document.">
            <Textarea
              required
              rows={10}
              className="font-mono text-xs"
              value={draft.content}
              onChange={(event) =>
                setDraft((current) => ({ ...current, content: event.target.value }))
              }
            />
          </Field>
          {error && (
            <p className="text-xs text-rose-600 dark:text-rose-300">
              {getErrorMessage(error)}
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
}
