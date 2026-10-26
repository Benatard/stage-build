import { useMemo, useState } from 'react';
import {
  FiAward,
  FiClock,
  FiDownload,
  FiEye,
  FiFileText,
  FiFolder,
  FiPrinter,
} from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader, StatCard } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { DOCUMENT_TYPE_OPTIONS, optionLabel } from '@/config/options';
import { useAuth } from '@/context/AuthContext';
import { useScopedRows } from '@/hooks/useScopedRows';
import type { AuditLog, Bulletin, DocumentRecord } from '@/types/domain';
import { formatDate, formatDateTime, round } from '@/utils/format';
import { DefinitionGrid, SelfGate, SectionCard } from './StagiaireShared';
import { useSelfAcademic } from './useStagiaireSelf';

type BulletinContent = {
  organization?: { name?: string; address?: string };
  stagiaire?: {
    matricule?: string;
    nom?: string;
    domaine?: string;
    specialite?: string;
  };
  final?: {
    modules_average?: number;
    qcm_average?: number;
    tp_average?: number;
    project_average?: number;
    implication_average?: number;
    professionalism_average?: number;
    attendance_rate?: number;
    final_average?: number;
    decision?: string;
    appreciation?: string;
  };
  modules?: Array<{ name?: string; average?: number; coefficient?: number }>;
  attendance_rate?: number;
  generated_at?: string;
};

type DocumentContent = {
  organization?: { name?: string; address?: string };
  stagiaire?: Record<string, unknown>;
  final?: Record<string, unknown>;
  modules?: Array<{ name?: string; average?: number }>;
  generated_at?: string;
};

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function numberLabel(value: unknown, suffix = ''): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${round(value, 2)}${suffix}` : '—';
}

export function StagiaireBulletin() {
  const academic = useSelfAcademic();
  const stagiaireId = academic.stagiaireId;
  const { rows, loading, error } = useScopedRows<Bulletin>('bulletins', {
    scope: { stagiaire_id: stagiaireId },
    order: 'generated_at.desc',
    enabled: Boolean(stagiaireId),
  });

  const published = useMemo(
    () => rows.filter((bulletin) => bulletin.status === 'publie'),
    [rows],
  );
  const latest = published[0] ?? null;
  const [selected, setSelected] = useState<Bulletin | null>(null);

  const current = selected ?? latest;
  const content = (current?.content ?? {}) as BulletinContent;

  return (
    <SelfGate loading={academic.loading || loading} error={academic.error ?? error} onRetry={academic.reload}>
      <PageHeader
        eyebrow="Mes résultats"
        title="Mon bulletin"
        description="Seuls les bulletins publiés par l’administration sont consultables."
        actions={
          current ? (
            <>
              {current.file_url && (
                <a
                  href={current.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center gap-2 border border-stroke px-4 text-sm font-semibold text-dark hover:border-primary hover:text-primary dark:border-white/10 dark:text-white"
                >
                  <FiDownload className="h-4 w-4" /> Télécharger
                </a>
              )}
              <Button variant="outline" onClick={() => window.print()} icon={<FiPrinter className="h-4 w-4" />}>
                Imprimer
              </Button>
            </>
          ) : undefined
        }
      />

      {!current ? (
        <div className="card-root border border-stroke px-6 py-16 text-center dark:border-white/10">
          <FiFileText className="mx-auto mb-3 h-8 w-8 text-body dark:text-body-dark" />
          <p className="text-sm font-semibold text-black dark:text-white">Aucun bulletin publié</p>
          <p className="mt-1 text-xs text-body dark:text-body-dark">
            Votre bulletin apparaîtra ici dès sa publication par l’administration.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Moyenne générale" value={numberLabel(content.final?.final_average, '/20')} tone="primary" icon={<FiAward className="h-4 w-4" />} />
            <StatCard label="Modules" value={numberLabel(content.final?.modules_average, '/20')} tone="purple" />
            <StatCard label="Assiduité" value={numberLabel(content.final?.attendance_rate ?? content.attendance_rate, '%')} tone="success" />
            <StatCard label="Période" value={current.period ?? '—'} tone="warning" />
          </div>

          {published.length > 1 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {published.map((bulletin) => (
                <button
                  key={bulletin.id}
                  type="button"
                  onClick={() => setSelected(bulletin)}
                  className={`border px-3 py-2 text-xs font-semibold ${
                    current.id === bulletin.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-stroke text-body hover:border-primary/40 dark:border-white/10 dark:text-body-dark'
                  }`}
                >
                  {bulletin.period ?? formatDate(bulletin.generated_at)}
                </button>
              ))}
            </div>
          )}

          <SectionCard
            title={`Bulletin ${current.period ?? formatDate(current.generated_at)}`}
            description={`Publié le ${formatDateTime(current.published_at ?? current.generated_at)}`}
            className="mb-5"
          >
            <DefinitionGrid
              columns={3}
              items={[
                ['Établissement', displayValue(content.organization?.name ?? 'StageBuild')],
                ['Stagiaire', displayValue(content.stagiaire?.nom)],
                ['Matricule', displayValue(content.stagiaire?.matricule)],
                ['Domaine', displayValue(content.stagiaire?.domaine)],
                ['Spécialité', displayValue(content.stagiaire?.specialite)],
                ['Décision', displayValue(content.final?.decision)],
              ]}
            />
          </SectionCard>

          <SectionCard title="Résultats par module" description="Moyennes calculées à partir des notes publiées." className="mb-5">
            {(content.modules ?? []).length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-body dark:text-body-dark">
                Aucun détail de module disponible.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full break-words text-left text-sm">
                  <thead>
                    <tr className="border-b border-stroke dark:border-white/10">
                      <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-body dark:text-body-dark sm:px-5">Module</th>
                      <th className="px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-body dark:text-body-dark sm:px-5">Coefficient</th>
                      <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-body dark:text-body-dark sm:px-5">Moyenne</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(content.modules ?? []).map((module, index) => (
                      <tr key={`${module.name}-${index}`} className="border-b border-stroke/70 last:border-0 dark:border-white/5">
                        <td className="px-3 py-3 font-medium text-black dark:text-white sm:px-5">{module.name ?? 'Module'}</td>
                        <td className="px-2 py-3 text-center sm:px-5">{module.coefficient ?? '—'}</td>
                        <td className="px-3 py-3 text-right font-semibold text-primary sm:px-5">{numberLabel(module.average, '/20')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['QCM', content.final?.qcm_average],
              ['Travaux pratiques', content.final?.tp_average],
              ['Projet final', content.final?.project_average],
              ['Implication', content.final?.implication_average],
              ['Professionnalisme', content.final?.professionalism_average],
              ['Assiduité', content.final?.attendance_rate ?? content.attendance_rate],
            ].map(([label, value]) => (
              <div key={String(label)} className="card-root border border-stroke p-4 dark:border-white/10">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-body dark:text-body-dark">{String(label)}</p>
                <p className="mt-1 text-xl font-bold text-black dark:text-white">
                  {numberLabel(value, String(label) === 'Assiduité' ? '%' : '/20')}
                </p>
              </div>
            ))}
          </div>

          {content.final?.appreciation && (
            <SectionCard title="Appréciation générale" className="mt-5">
              <p className="px-5 py-4 text-sm leading-relaxed text-body dark:text-body-dark">
                {content.final.appreciation}
              </p>
            </SectionCard>
          )}
        </>
      )}
    </SelfGate>
  );
}

function DocumentPreview({ content }: { content: DocumentContent }) {
  const stagiaire = content.stagiaire ?? {};
  const final = content.final ?? {};

  return (
    <div className="space-y-5">
      <DefinitionGrid
        columns={2}
        items={[
          ['Établissement', displayValue(content.organization?.name ?? 'StageBuild')],
          ['Stagiaire', displayValue(stagiaire.nom)],
          ['Matricule', displayValue(stagiaire.matricule)],
          ['Domaine', displayValue(stagiaire.domaine)],
          ['Spécialité', displayValue(stagiaire.specialite)],
          ['Généré le', formatDateTime(content.generated_at)],
        ]}
      />

      {Object.keys(final).length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-body dark:text-body-dark">
            Résultats
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(final)
              .filter(([, value]) => typeof value === 'string' || typeof value === 'number')
              .map(([key, value]) => (
                <div key={key} className="border border-stroke px-3 py-2 dark:border-white/10">
                  <p className="text-[10px] uppercase tracking-wide text-body dark:text-body-dark">{key.replace(/_/g, ' ')}</p>
                  <p className="mt-0.5 text-sm font-semibold text-black dark:text-white">{displayValue(value)}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {(content.modules ?? []).length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-body dark:text-body-dark">
            Modules
          </p>
          <div className="space-y-1">
            {(content.modules ?? []).map((module, index) => (
              <div key={`${module.name}-${index}`} className="flex items-center justify-between border border-stroke px-3 py-2 text-sm dark:border-white/10">
                <span className="text-black dark:text-white">{module.name ?? 'Module'}</span>
                <span className="font-semibold text-primary">{numberLabel(module.average, '/20')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function StagiaireDocuments() {
  const academic = useSelfAcademic();
  const stagiaireId = academic.stagiaireId;
  const { rows, loading, error, reload } = useScopedRows<DocumentRecord>('documents', {
    scope: { stagiaire_id: stagiaireId },
    order: 'created_at.desc',
    enabled: Boolean(stagiaireId),
  });

  const [selected, setSelected] = useState<DocumentRecord | null>(null);

  return (
    <SelfGate loading={academic.loading || loading} error={academic.error ?? error} onRetry={academic.reload}>
      <PageHeader
        eyebrow="Mes résultats"
        title="Mes documents"
        description="Consultez les documents officiels générés pour votre dossier."
      />

      <SectionCard title="Documents disponibles">
        <DataTable
          columns={[
            {
              key: 'title',
              header: 'Document',
              render: (row) => (
                <div>
                  <p className="font-semibold text-black dark:text-white">{row.title}</p>
                  <p className="text-xs text-body dark:text-body-dark">
                    {optionLabel(DOCUMENT_TYPE_OPTIONS, row.type)}
                  </p>
                </div>
              ),
            },
            { key: 'date', header: 'Généré le', hideBelow: 'md', render: (row) => formatDate(row.created_at) },
            {
              key: 'type',
              header: 'Type',
              hideBelow: 'lg',
              render: (row) => <Badge tone={statusTone(row.type)}>{optionLabel(DOCUMENT_TYPE_OPTIONS, row.type)}</Badge>,
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (row) => (
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setSelected(row)}
                    className="flex h-8 w-8 items-center justify-center text-body hover:bg-primary/10 hover:text-primary dark:text-body-dark"
                    title="Consulter"
                  >
                    <FiEye className="h-4 w-4" />
                  </button>
                  {row.file_url && (
                    <a
                      href={row.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-8 w-8 items-center justify-center text-body hover:bg-emerald-50 hover:text-emerald-600 dark:text-body-dark"
                      title="Télécharger"
                    >
                      <FiDownload className="h-4 w-4" />
                    </a>
                  )}
                </div>
              ),
            },
          ]}
          rows={rows}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyTitle="Aucun document"
          emptyDescription="Les documents générés par l’administration apparaîtront ici."
        />
      </SectionCard>

      <div className="mt-4 flex items-center gap-2 text-xs text-body dark:text-body-dark">
        <FiFolder className="h-4 w-4" />
        Ces documents sont en lecture seule. Contactez l’administration en cas d’erreur.
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.title ?? 'Document'}
        description={selected ? optionLabel(DOCUMENT_TYPE_OPTIONS, selected.type) : undefined}
        size="lg"
        footer={
          <>
            {selected?.file_url && (
              <a
                href={selected.file_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 border border-stroke px-4 text-sm font-semibold text-dark hover:border-primary hover:text-primary dark:border-white/10 dark:text-white"
              >
                <FiDownload className="h-4 w-4" /> Télécharger
              </a>
            )}
            <Button variant="outline" onClick={() => window.print()} icon={<FiPrinter className="h-4 w-4" />}>
              Imprimer
            </Button>
          </>
        }
      >
        {selected && <DocumentPreview content={selected.content as DocumentContent} />}
      </Modal>
    </SelfGate>
  );
}

export function StagiaireHistory() {
  const academic = useSelfAcademic();
  const { user } = useAuth();
  const { rows, loading, error, reload } = useScopedRows<AuditLog>('audit_logs', {
    scope: { user_id: user?.id ?? '' },
    order: 'created_at.desc',
    limit: 100,
    enabled: Boolean(user?.id),
  });

  const columns: TableColumn<AuditLog>[] = [
    { key: 'date', header: 'Date', render: (row) => formatDateTime(row.created_at) },
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
    { key: 'reason', header: 'Motif', hideBelow: 'md', render: (row) => row.reason ?? '—' },
  ];

  return (
    <SelfGate loading={academic.loading || loading} error={academic.error ?? error} onRetry={academic.reload}>
      <PageHeader
        eyebrow="Mon compte"
        title="Mon historique"
        description="Retrouvez uniquement les actions enregistrées avec votre propre compte."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Actions enregistrées" value={rows.length} tone="primary" icon={<FiClock className="h-4 w-4" />} />
        <StatCard label="Dernière action" value={formatDate(rows[0]?.created_at)} tone="purple" />
        <StatCard label="Compte" value={user?.email ?? '—'} tone="success" />
      </div>

      <SectionCard title="Dernières actions">
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyTitle="Aucun historique"
          emptyDescription="Vos actions apparaîtront ici lorsqu’elles seront enregistrées."
        />
      </SectionCard>
    </SelfGate>
  );
}
