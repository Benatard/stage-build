import { useState } from 'react';
import { FiArchive, FiRefreshCw } from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/Feedback';
import { useForgeTable } from '@/hooks/useForgeTable';
import { dataService } from '@/services/data.service';
import type { Formation, Promotion, Stagiaire } from '@/types/domain';
import { confirmAction, notifyError, notifySuccess } from '@/utils/alerts';
import { formatDate, fullName } from '@/utils/format';

type Tab = 'stagiaires' | 'formations' | 'promotions';

export default function ArchivagePage() {
  const [tab, setTab] = useState<Tab>('stagiaires');

  const { rows: stagiaires, loading: loadingStagiaires, reload: reloadStagiaires } =
    useForgeTable<Stagiaire>('stagiaires', { filters: { statut: 'archive' }, limit: 500 });
  const { rows: formations, loading: loadingFormations, reload: reloadFormations } =
    useForgeTable<Formation>('formations', { filters: { status: 'archivee' }, limit: 500 });
  const { rows: promotions, loading: loadingPromotions, reload: reloadPromotions } =
    useForgeTable<Promotion>('promotions', { filters: { status: 'archivee' }, limit: 500 });

  async function restoreStagiaire(row: Stagiaire) {
    const confirmed = await confirmAction({
      title: 'Restaurer le stagiaire',
      text: `${fullName(row)} sera réactivé avec le statut « actif ».`,
      confirmText: 'Restaurer',
    });
    if (!confirmed) return;

    try {
      await dataService.updateRow<Stagiaire>('stagiaires', row.id, { statut: 'actif' });
      notifySuccess('Stagiaire restauré');
      reloadStagiaires();
    } catch {
      notifyError('Restauration impossible');
    }
  }

  async function restoreFormation(row: Formation) {
    const confirmed = await confirmAction({
      title: 'Restaurer la formation',
      text: `${row.name} sera réactivée.`,
      confirmText: 'Restaurer',
    });
    if (!confirmed) return;

    try {
      await dataService.updateRow<Formation>('formations', row.id, { status: 'active' });
      notifySuccess('Formation restaurée');
      reloadFormations();
    } catch {
      notifyError('Restauration impossible');
    }
  }

  async function restorePromotion(row: Promotion) {
    const confirmed = await confirmAction({
      title: 'Restaurer la promotion',
      text: `${row.code} sera réactivée.`,
      confirmText: 'Restaurer',
    });
    if (!confirmed) return;

    try {
      await dataService.updateRow<Promotion>('promotions', row.id, { status: 'planifiee' });
      notifySuccess('Promotion restaurée');
      reloadPromotions();
    } catch {
      notifyError('Restauration impossible');
    }
  }

  const stagiaireColumns: TableColumn<Stagiaire>[] = [
    {
      key: 'name',
      header: 'Stagiaire',
      render: (row) => (
        <div>
          <p className="font-semibold text-black dark:text-white">{fullName(row)}</p>
          <p className="text-xs text-body dark:text-body-dark">{row.matricule}</p>
        </div>
      ),
    },
    { key: 'email', header: 'Email', hideBelow: 'md', render: (row) => row.email ?? '—' },
    { key: 'domaine', header: 'Domaine', hideBelow: 'lg', render: (row) => row.domaine ?? '—' },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => <Badge tone={statusTone(row.statut)}>Archivé</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Button size="sm" variant="outline" onClick={() => void restoreStagiaire(row)} icon={<FiRefreshCw className="h-3.5 w-3.5" />}>
          Restaurer
        </Button>
      ),
    },
  ];

  const formationColumns: TableColumn<Formation>[] = [
    { key: 'name', header: 'Formation', render: (row) => row.name },
    { key: 'domain', header: 'Domaine', hideBelow: 'md', render: (row) => row.domain ?? '—' },
    { key: 'created', header: 'Créée le', hideBelow: 'lg', render: (row) => formatDate(row.created_at) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Button size="sm" variant="outline" onClick={() => void restoreFormation(row)} icon={<FiRefreshCw className="h-3.5 w-3.5" />}>
          Restaurer
        </Button>
      ),
    },
  ];

  const promotionColumns: TableColumn<Promotion>[] = [
    { key: 'code', header: 'Promotion', render: (row) => row.code },
    { key: 'period', header: 'Période', hideBelow: 'md', render: (row) => `${formatDate(row.start_date)} → ${formatDate(row.end_date)}` },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Button size="sm" variant="outline" onClick={() => void restorePromotion(row)} icon={<FiRefreshCw className="h-3.5 w-3.5" />}>
          Restaurer
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Archivage"
        description="Consultez les éléments archivés et restaurez-les si nécessaire."
      />

      <div className="mb-5 flex gap-1 border-b border-stroke dark:border-white/10">
        {[
          { key: 'stagiaires' as const, label: `Stagiaires (${stagiaires.length})` },
          { key: 'formations' as const, label: `Formations (${formations.length})` },
          { key: 'promotions' as const, label: `Promotions (${promotions.length})` },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              tab === item.key
                ? 'border-primary text-primary'
                : 'border-transparent text-body hover:text-dark dark:text-body-dark dark:hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="card-root border border-stroke dark:border-white/10">
        {tab === 'stagiaires' && (
          <DataTable
            columns={stagiaireColumns}
            rows={stagiaires}
            loading={loadingStagiaires}
            onRetry={reloadStagiaires}
            emptyTitle="Aucun stagiaire archivé"
            emptyDescription="Les stagiaires archivés apparaîtront ici."
          />
        )}
        {tab === 'formations' && (
          <DataTable
            columns={formationColumns}
            rows={formations}
            loading={loadingFormations}
            onRetry={reloadFormations}
            emptyTitle="Aucune formation archivée"
            emptyDescription="Les formations archivées apparaîtront ici."
          />
        )}
        {tab === 'promotions' && (
          <DataTable
            columns={promotionColumns}
            rows={promotions}
            loading={loadingPromotions}
            onRetry={reloadPromotions}
            emptyTitle="Aucune promotion archivée"
            emptyDescription="Les promotions archivées apparaîtront ici."
          />
        )}
      </div>

      <div className="mt-5 flex items-center gap-3 border border-dashed border-stroke p-4 text-xs text-body dark:border-white/10 dark:text-body-dark">
        <FiArchive className="h-5 w-5 shrink-0 text-primary" />
        L’archivage conserve l’intégralité des données historiques. La restauration réactive l’élément sans modifier ses résultats.
      </div>
    </div>
  );
}
