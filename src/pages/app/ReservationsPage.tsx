import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCheck, FiCopy, FiEye, FiRefreshCw, FiX } from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader, StatCard } from '@/components/ui/Feedback';
import { Select } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { RESERVATION_STATUS_OPTIONS, optionLabel } from '@/config/options';
import { useAuth } from '@/context/AuthContext';
import { useForgeTable } from '@/hooks/useForgeTable';
import { useReferenceData } from '@/hooks/useReferenceData';
import {
  buildAvailability,
  cancelReservation,
  confirmReservation,
  isReservationsTableMissing,
  type ReservationConfirmation,
} from '@/services/reservation.service';
import type { Reservation, ReservationStatus } from '@/types/domain';
import { confirmAction, notifyError, notifySuccess } from '@/utils/alerts';
import { formatDate, formatDateTime, fullName, getErrorMessage } from '@/utils/format';

type StatusFilter = 'all' | ReservationStatus;

type ConfirmationState = {
  result: ReservationConfirmation;
  reservation: Reservation;
};

export default function ReservationsPage() {
  const { user } = useAuth();
  const { data, refresh, loading: referenceLoading } = useReferenceData();
  const { rows, loading, error, reload } = useForgeTable<Reservation>('reservations', {
    order: 'created_at.desc',
    limit: 500,
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [detail, setDetail] = useState<Reservation | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);

  const missingTable = isReservationsTableMissing(error);

  const availability = useMemo(
    () =>
      buildAvailability(data.formations, data.promotions, data.inscriptions, rows),
    [data.formations, data.promotions, data.inscriptions, rows],
  );

  const pendingCount = rows.filter((row) => row.status === 'en_attente').length;
  const confirmedCount = rows.filter((row) => row.status === 'confirmee').length;
  const cancelledCount = rows.filter((row) => row.status === 'annulee').length;
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = rows.filter((row) => (row.created_at ?? '').slice(0, 10) === today).length;

  const formationName = (formationId: string) =>
    data.formations.find((formation) => formation.id === formationId)?.name ?? '—';
  const promotionCode = (promotionId: string) =>
    data.promotions.find((promotion) => promotion.id === promotionId)?.code ?? '—';

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (!term) return true;

      return [
        row.reference,
        fullName(row),
        row.email,
        row.telephone,
        formationName(row.formation_id),
        promotionCode(row.promotion_id),
        row.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [rows, search, statusFilter, data.formations, data.promotions]);

  async function handleRefresh() {
    reload();
    await refresh();
  }

  async function handleConfirm(reservation: Reservation) {
    if (!user) {
      notifyError('Session expirée', 'Reconnectez-vous avant de confirmer une réservation.');
      return;
    }

    if (referenceLoading) {
      notifyError(
        'Chargement en cours',
        'Attendez la fin du chargement des formations et des inscriptions.',
      );
      return;
    }

    const accepted = await confirmAction({
      title: 'Confirmer cette réservation ?',
      text: `La réservation ${reservation.reference} sera transformée en inscription validée. Un dossier stagiaire et un compte seront créés.`,
      confirmText: 'Confirmer la réservation',
    });

    if (!accepted) return;

    setConfirmingId(reservation.id);

    try {
      const result = await confirmReservation({
        reservation,
        formations: data.formations,
        promotions: data.promotions,
        currentUserId: user.id,
      });

      setConfirmation({ result, reservation: result.reservation });
      setDetail(null);
      notifySuccess('Réservation confirmée', `Référence ${reservation.reference}`);
      reload();
      await refresh();
    } catch (confirmError) {
      notifyError('Confirmation impossible', getErrorMessage(confirmError));
    } finally {
      setConfirmingId(null);
    }
  }

  async function handleCancel(reservation: Reservation) {
    const accepted = await confirmAction({
      title: 'Annuler cette réservation ?',
      text: `La réservation ${reservation.reference} sera marquée comme annulée et sa place sera libérée.`,
      confirmText: 'Annuler la réservation',
      danger: true,
    });

    if (!accepted) return;

    setCancellingId(reservation.id);

    try {
      await cancelReservation(reservation);
      notifySuccess('Réservation annulée');
      setDetail(null);
      reload();
    } catch (cancelError) {
      notifyError('Annulation impossible', getErrorMessage(cancelError));
    } finally {
      setCancellingId(null);
    }
  }

  async function copyPassword(password: string) {
    try {
      await navigator.clipboard.writeText(password);
      notifySuccess('Mot de passe copié');
    } catch {
      notifyError('Copie impossible', 'Sélectionnez le mot de passe manuellement.');
    }
  }

  const columns: TableColumn<Reservation>[] = [
    {
      key: 'reference',
      header: 'Référence',
      render: (row) => (
        <div>
          <p className="font-mono text-xs font-bold text-primary">{row.reference}</p>
          <p className="mt-1 text-xs text-body dark:text-body-dark">
            {formatDateTime(row.created_at)}
          </p>
        </div>
      ),
    },
    {
      key: 'candidate',
      header: 'Candidat',
      render: (row) => (
        <div>
          <p className="font-semibold text-black dark:text-white">{fullName(row)}</p>
          <p className="text-xs text-body dark:text-body-dark">{row.email}</p>
          <p className="text-xs text-body dark:text-body-dark">{row.telephone}</p>
        </div>
      ),
    },
    {
      key: 'formation',
      header: 'Formation',
      hideBelow: 'md',
      render: (row) => (
        <div>
          <p>{formationName(row.formation_id)}</p>
          <p className="text-xs text-body dark:text-body-dark">
            {promotionCode(row.promotion_id)}
          </p>
        </div>
      ),
    },
    {
      key: 'birth',
      header: 'Naissance',
      hideBelow: 'lg',
      render: (row) => formatDate(row.date_naissance),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => (
        <Badge tone={statusTone(row.status)}>
          {optionLabel(RESERVATION_STATUS_OPTIONS, row.status)}
        </Badge>
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
            onClick={() => setDetail(row)}
            className="flex h-8 w-8 items-center justify-center text-body transition-colors hover:bg-primary/10 hover:text-primary dark:text-body-dark"
            title="Voir le détail"
          >
            <FiEye className="h-4 w-4" />
          </button>
          {row.status === 'en_attente' && (
            <>
              <button
                type="button"
                onClick={() => void handleConfirm(row)}
                disabled={confirmingId === row.id || referenceLoading}
                className="flex h-8 w-8 items-center justify-center text-body transition-colors hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50 dark:text-body-dark dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
                title="Confirmer"
              >
                <FiCheck className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => void handleCancel(row)}
                disabled={cancellingId === row.id}
                className="flex h-8 w-8 items-center justify-center text-body transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:text-body-dark dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                title="Annuler"
              >
                <FiX className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Dossiers"
        title="Réservations en ligne"
        description="Suivez les pré-réservations reçues depuis le site public, contrôlez les places disponibles et transformez les réservations en inscriptions confirmées."
        actions={
          <Button
            variant="outline"
            onClick={() => void handleRefresh()}
            icon={<FiRefreshCw className="h-4 w-4" />}
          >
            Actualiser
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="En attente" value={pendingCount} tone="warning" />
        <StatCard label="Confirmées" value={confirmedCount} tone="success" />
        <StatCard label="Annulées" value={cancelledCount} tone="danger" />
        <StatCard label="Aujourd’hui" value={todayCount} tone="primary" />
      </div>

      {missingTable ? (
        <div className="border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <p className="font-semibold">La table « reservations » n’existe pas encore.</p>
          <p className="mt-1 leading-relaxed">
            Exécutez <code className="font-mono text-xs">sql/add_reservations.sql</code> dans la
            console Forge (onglet Schema ou Import SQL), puis rechargez cette page.
          </p>
        </div>
      ) : (
        <>
          {availability.length > 0 && (
            <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {availability.map((item) => {
                const occupied = item.used + item.pending;
                const ratio =
                  item.capacity && item.capacity > 0
                    ? Math.min((occupied / item.capacity) * 100, 100)
                    : 0;

                return (
                  <div
                    key={item.promotion.id}
                    className="border border-stroke bg-white p-4 dark:border-white/10 dark:bg-gray-dark"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-black dark:text-white">
                          {item.promotion.code}
                        </p>
                        <p className="mt-0.5 text-xs text-body dark:text-body-dark">
                          {item.formation.name}
                        </p>
                      </div>
                      <Badge
                        tone={
                          item.available === 0
                            ? 'danger'
                            : item.available === null
                              ? 'info'
                              : 'success'
                        }
                      >
                        {item.available === null
                          ? 'Illimité'
                          : item.available === 0
                            ? 'Complet'
                            : `${item.available} libre${item.available > 1 ? 's' : ''}`}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-body dark:text-body-dark">
                      <span>
                        {occupied} occupée{occupied > 1 ? 's' : ''}
                        {item.capacity !== null ? ` / ${item.capacity}` : ''}
                      </span>
                      <span>{item.pending} en attente</span>
                    </div>

                    {item.capacity !== null && (
                      <div className="mt-2 h-1.5 bg-stroke dark:bg-white/10">
                        <div
                          className={
                            ratio >= 100
                              ? 'h-full bg-rose-500'
                              : ratio >= 80
                                ? 'h-full bg-amber-500'
                                : 'h-full bg-primary'
                          }
                          style={{ width: `${Math.max(ratio, 2)}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Rechercher une référence, un nom, un email…"
              className="w-full sm:max-w-md"
            />
            <Select
              value={statusFilter}
              options={[
                { value: 'all', label: 'Tous les statuts' },
                ...RESERVATION_STATUS_OPTIONS,
              ]}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="w-full sm:w-52"
            />
          </div>

          <div className="card-root border border-stroke dark:border-white/10">
            <DataTable
              columns={columns}
              rows={filtered}
              loading={loading}
              error={error}
              onRetry={reload}
              emptyTitle="Aucune réservation"
              emptyDescription="Les réservations envoyées depuis le site public apparaîtront ici."
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-body dark:text-body-dark">
            <span>
              {filtered.length} réservation{filtered.length > 1 ? 's' : ''}
            </span>
            <span>Table Forge : reservations</span>
          </div>
        </>
      )}

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail ? `Réservation ${detail.reference}` : 'Réservation'}
        description={
          detail
            ? `${fullName(detail)} · ${formationName(detail.formation_id)} · ${promotionCode(detail.promotion_id)}`
            : undefined
        }
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setDetail(null)}>
              Fermer
            </Button>
            {detail?.status === 'en_attente' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => void handleCancel(detail)}
                  loading={cancellingId === detail.id}
                  icon={<FiX className="h-4 w-4" />}
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => void handleConfirm(detail)}
                  loading={confirmingId === detail.id}
                  disabled={referenceLoading}
                  icon={<FiCheck className="h-4 w-4" />}
                >
                  Confirmer
                </Button>
              </>
            )}
          </>
        }
      >
        {detail && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['Prénom', detail.prenom],
                ['Nom', detail.nom],
                ['Postnom', detail.postnom ?? '—'],
                ['Sexe', detail.sexe ?? '—'],
                ['Date de naissance', formatDate(detail.date_naissance)],
                ['Téléphone', detail.telephone],
                ['Email', detail.email],
                ['Statut', optionLabel(RESERVATION_STATUS_OPTIONS, detail.status)],
                ['Formation', formationName(detail.formation_id)],
                ['Promotion', promotionCode(detail.promotion_id)],
                ['Créée le', formatDateTime(detail.created_at)],
                ['Confirmée le', formatDateTime(detail.confirmed_at)],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-body dark:text-body-dark">
                    {label}
                  </p>
                  <p className="mt-1 text-sm text-black dark:text-white">{value}</p>
                </div>
              ))}
            </div>

            {detail.notes && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-body dark:text-body-dark">
                  Notes
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-body dark:text-body-dark">
                  {detail.notes}
                </p>
              </div>
            )}

            {detail.status === 'confirmee' && (
              <div className="border border-emerald-200 bg-emerald-50/60 p-4 text-sm dark:border-emerald-500/20 dark:bg-emerald-500/5">
                <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                  Réservation confirmée
                </p>
                <div className="mt-2 space-y-1 text-xs text-emerald-700 dark:text-emerald-300">
                  {detail.stagiaire_id && (
                    <p>
                      Dossier stagiaire :{' '}
                      <Link
                        to={`/app/stagiaires/${detail.stagiaire_id}`}
                        className="font-semibold underline"
                      >
                        ouvrir le dossier
                      </Link>
                    </p>
                  )}
                  {detail.inscription_id && <p>Inscription : {detail.inscription_id}</p>}
                  {detail.user_id && <p>Compte utilisateur : {detail.user_id}</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(confirmation)}
        onClose={() => setConfirmation(null)}
        title="Réservation confirmée"
        description="Le dossier stagiaire, l’inscription et le compte ont été préparés."
        footer={
          <Button onClick={() => setConfirmation(null)}>Fermer</Button>
        }
      >
        {confirmation && (
          <div className="space-y-5">
            <div className="border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Référence
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-emerald-800 dark:text-emerald-200">
                {confirmation.reservation.reference}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-body dark:text-body-dark">
                  Matricule stagiaire
                </p>
                <p className="mt-1 text-sm text-black dark:text-white">
                  {data.stagiaires.find((item) => item.id === confirmation.result.stagiaireId)
                    ?.matricule ?? confirmation.result.stagiaireId}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-body dark:text-body-dark">
                  Compte
                </p>
                <p className="mt-1 text-sm text-black dark:text-white">
                  {confirmation.result.existingAccount
                    ? 'Compte stagiaire existant réutilisé'
                    : 'Nouveau compte stagiaire'}
                </p>
              </div>
            </div>

            {confirmation.result.temporaryPassword && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-body dark:text-body-dark">
                  Mot de passe temporaire
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="border border-stroke bg-gray2 px-3 py-2 font-mono text-sm font-bold text-black dark:border-white/10 dark:bg-white/5 dark:text-white">
                    {confirmation.result.temporaryPassword}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<FiCopy className="h-3.5 w-3.5" />}
                    onClick={() =>
                      void copyPassword(confirmation.result.temporaryPassword as string)
                    }
                  >
                    Copier
                  </Button>
                </div>
                <p className="mt-2 text-xs text-body dark:text-body-dark">
                  Communiquez ce mot de passe au stagiaire. Il pourra le modifier après sa première
                  connexion.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Link
                to={`/app/stagiaires/${confirmation.result.stagiaireId}`}
                className="btn-outline-root"
                onClick={() => setConfirmation(null)}
              >
                Ouvrir le dossier stagiaire
              </Link>
              <Link
                to="/app/inscriptions"
                className="btn-outline-root"
                onClick={() => setConfirmation(null)}
              >
                Voir les inscriptions
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
