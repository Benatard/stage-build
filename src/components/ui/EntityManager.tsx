import { useMemo, useState, type ReactNode } from 'react';
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/Feedback';
import { Field, Input, Select, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/Feedback';
import { SearchInput } from '@/components/ui/SearchInput';
import { useCrud } from '@/hooks/useCrud';
import { useForgeTable } from '@/hooks/useForgeTable';
import type { SelectOption } from '@/config/options';
import { confirmDelete, notifyError, notifySuccess } from '@/utils/alerts';
import { cn, getErrorMessage, truncate } from '@/utils/format';

export type EntityField = {
  name: string;
  label: string;
  type:
    | 'text'
    | 'email'
    | 'tel'
    | 'number'
    | 'date'
    | 'datetime-local'
    | 'time'
    | 'textarea'
    | 'select'
    | 'checkbox';
  required?: boolean;
  placeholder?: string;
  hint?: string;
  options?: SelectOption[];
  fullWidth?: boolean;
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: string | boolean;
  readOnly?: boolean;
};

type EntityManagerProps<T extends { id: string }> = {
  table: string;
  eyebrow?: string;
  title: string;
  description?: string;
  rowLabel: (row: T) => string;
  columns: TableColumn<T>[];
  fields: EntityField[];
  searchPlaceholder?: string;
  searchFields: (row: T) => string;
  defaults?: Record<string, string | boolean>;
  order?: string;
  limit?: number;
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  createLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  extraActions?: (row: T) => ReactNode;
  toolbar?: ReactNode;
  filterRow?: (row: T) => boolean;
  transform?: (values: Record<string, string | boolean>) => Record<string, unknown>;
  onCreateOverride?: (values: Record<string, string | boolean>) => Promise<T | null>;
  onChanged?: () => void;
};

function toFormValue(field: EntityField, value: unknown): string | boolean {
  if (field.type === 'checkbox') return Boolean(value);
  if (value === null || value === undefined) return '';
  if (field.type === 'datetime-local') return String(value).slice(0, 16);
  if (field.type === 'date') return String(value).slice(0, 10);
  if (field.type === 'time') return String(value).slice(0, 5);
  return String(value);
}

export function buildEntityPayload(
  fields: EntityField[],
  values: Record<string, string | boolean>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  fields.forEach((field) => {
    const value = values[field.name];

    if (field.type === 'checkbox') {
      payload[field.name] = Boolean(value);
      return;
    }

    const raw = typeof value === 'string' ? value.trim() : '';

    if (raw === '') {
      payload[field.name] = null;
      return;
    }

    if (field.type === 'number') {
      payload[field.name] = Number(raw);
      return;
    }

    payload[field.name] = raw;
  });

  return payload;
}

export function EntityManager<T extends { id: string }>({
  table,
  eyebrow,
  title,
  description,
  rowLabel,
  columns,
  fields,
  searchPlaceholder,
  searchFields,
  defaults,
  order,
  limit = 500,
  allowCreate = true,
  allowEdit = true,
  allowDelete = true,
  createLabel = 'Nouvel enregistrement',
  emptyTitle,
  emptyDescription,
  extraActions,
  toolbar,
  filterRow,
  transform,
  onCreateOverride,
  onChanged,
}: EntityManagerProps<T>) {
  const { rows, loading, error, reload } = useForgeTable<T>(table, { order, limit });
  const { create, update, remove, saving } = useCrud(table, {
    onSuccess: () => {
      reload();
      onChanged?.();
    },
  });

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [creatingOverride, setCreatingOverride] = useState(false);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filterRow && !filterRow(row)) return false;
      if (!term) return true;
      return searchFields(row).toLowerCase().includes(term);
    });
  }, [rows, search, filterRow, searchFields]);

  function openCreate() {
    const initial: Record<string, string | boolean> = {};
    fields.forEach((field) => {
      initial[field.name] =
        defaults?.[field.name] ?? field.defaultValue ?? (field.type === 'checkbox' ? false : '');
    });
    setValues(initial);
    setEditing(null);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(row: T) {
    const initial: Record<string, string | boolean> = {};
    fields.forEach((field) => {
      initial[field.name] = toFormValue(field, (row as Record<string, unknown>)[field.name]);
    });
    setValues(initial);
    setEditing(row);
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const payload = transform
      ? transform(values)
      : buildEntityPayload(fields, values);

    try {
      let result: T | null;

      if (editing) {
        result = await update<T>(editing.id, payload);
      } else if (onCreateOverride) {
        setCreatingOverride(true);
        try {
          result = await onCreateOverride(values);
        } finally {
          setCreatingOverride(false);
        }
      } else {
        result = await create<T>(payload);
      }

      if (!result) {
        setFormError('Enregistrement impossible. Vérifiez les champs et réessayez.');
        return;
      }

      setModalOpen(false);
      notifySuccess(editing ? 'Enregistrement mis à jour' : 'Enregistrement créé');
    } catch (submitError) {
      setFormError(getErrorMessage(submitError));
    }
  }

  async function handleDelete(row: T) {
    const confirmed = await confirmDelete(rowLabel(row));

    if (!confirmed) return;

    const success = await remove(row.id);
    if (success) notifySuccess('Enregistrement supprimé');
    else notifyError('Suppression impossible');
  }

  const allColumns: TableColumn<T>[] = [
    ...columns,
    ...(extraActions
      ? [
          {
            key: 'extra',
            header: '',
            align: 'right' as const,
            render: (row: T) => <div className="flex justify-end gap-1">{extraActions(row)}</div>,
          },
        ]
      : []),
    ...(allowEdit || allowDelete
      ? [
          {
            key: 'actions',
            header: 'Actions',
            align: 'right' as const,
            render: (row: T) => (
              <div className="flex items-center justify-end gap-1">
                {allowEdit && (
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className="flex h-8 w-8 items-center justify-center text-body transition-colors hover:bg-primary/10 hover:text-primary dark:text-body-dark"
                    title="Modifier"
                  >
                    <FiEdit2 className="h-4 w-4" />
                  </button>
                )}
                {allowDelete && (
                  <button
                    type="button"
                    onClick={() => void handleDelete(row)}
                    className="flex h-8 w-8 items-center justify-center text-body transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-body-dark dark:hover:bg-rose-500/10"
                    title="Supprimer"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          allowCreate ? (
            <Button onClick={openCreate} icon={<FiPlus className="h-4 w-4" />}>
              {createLabel}
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={searchPlaceholder ?? 'Rechercher…'}
          className="w-full sm:max-w-sm"
        />
        {toolbar}
      </div>

      <div className="card-root border border-stroke dark:border-white/10">
        <DataTable
          columns={allColumns}
          rows={filteredRows}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyTitle={search ? 'Aucun résultat' : emptyTitle}
          emptyDescription={
            search
              ? `Aucun enregistrement ne correspond à « ${truncate(search, 40)} ».`
              : emptyDescription
          }
          emptyAction={
            allowCreate && !search ? (
              <Button size="sm" onClick={openCreate} icon={<FiPlus className="h-4 w-4" />}>
                {createLabel}
              </Button>
            ) : undefined
          }
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-body dark:text-body-dark">
        <span>
          {filteredRows.length} enregistrement{filteredRows.length > 1 ? 's' : ''}
          {search ? ' trouvé(s)' : ''}
        </span>
        <span>Table Forge : {table}</span>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier l’enregistrement' : createLabel}
        description={
          editing
            ? `Mise à jour de « ${rowLabel(editing)} ».`
            : 'Renseignez les informations puis validez.'
        }
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              form="entity-form"
              loading={saving || creatingOverride}
              icon={<FiPlus className="h-4 w-4" />}
            >
              {editing ? 'Enregistrer' : 'Créer'}
            </Button>
          </>
        }
      >
        <form id="entity-form" onSubmit={handleSubmit}>
          {formError && (
            <div className="mb-4 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((field) => {
              const value = values[field.name] ?? '';
              const wrappperClass = field.fullWidth ? 'sm:col-span-2' : undefined;

              if (field.type === 'checkbox') {
                return (
                  <label
                    key={field.name}
                    className={cn(
                      'flex items-center gap-2.5 border border-stroke px-3.5 py-2.5 text-sm text-dark dark:border-white/10 dark:text-white',
                      wrappperClass,
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [field.name]: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 text-primary focus:ring-primary/20"
                    />
                    {field.label}
                  </label>
                );
              }

              return (
                <Field
                  key={field.name}
                  label={field.label}
                  required={field.required}
                  hint={field.hint}
                  className={wrappperClass}
                >
                  {field.type === 'textarea' ? (
                    <Textarea
                      value={String(value)}
                      required={field.required}
                      placeholder={field.placeholder}
                      rows={field.rows}
                      readOnly={field.readOnly}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [field.name]: event.target.value,
                        }))
                      }
                    />
                  ) : field.type === 'select' ? (
                    <Select
                      value={String(value)}
                      required={field.required}
                      placeholder={field.placeholder ?? 'Sélectionner…'}
                      options={field.options ?? []}
                      disabled={field.readOnly}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [field.name]: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <Input
                      type={field.type}
                      value={String(value)}
                      required={field.required}
                      placeholder={field.placeholder}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      readOnly={field.readOnly}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [field.name]: event.target.value,
                        }))
                      }
                    />
                  )}
                </Field>
              );
            })}
          </div>

          {fields.length === 0 && (
            <EmptyState title="Aucun champ configuré" description="Cette entité ne peut pas être éditée." />
          )}
        </form>
      </Modal>
    </div>
  );
}
