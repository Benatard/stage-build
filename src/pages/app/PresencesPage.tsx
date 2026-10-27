import { useEffect, useMemo, useState } from 'react';
import { FiCheck, FiDownload, FiPrinter, FiSave } from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader, StatCard } from '@/components/ui/Feedback';
import { Select } from '@/components/ui/Form';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { useAuth } from '@/context/AuthContext';
import { useForgeTable } from '@/hooks/useForgeTable';
import { useReferenceData } from '@/hooks/useReferenceData';
import { dataService } from '@/services/data.service';
import { PRESENCE_OPTIONS, optionLabel } from '@/config/options';
import type { Presence, PresenceStatus } from '@/types/domain';
import { confirmAction, notifyError, notifySuccess } from '@/utils/alerts';
import { downloadCsv } from '@/utils/csv';
import { formatDate, formatTime, fullName, percentage } from '@/utils/format';

type Draft = {
  status: PresenceStatus;
  note: string;
  id?: string;
};

function safeFilenamePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export default function PresencesPage() {
  const { data } = useReferenceData();
  const { user } = useAuth();
  const [seanceId, setSeanceId] = useState('');
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState(false);

  const seance = data.seances.find((item) => item.id === seanceId);

  const { rows: existing, loading, error, reload } = useForgeTable<Presence>('presences', {
    filters: { seance_id: seanceId },
    limit: 500,
    enabled: Boolean(seanceId),
  });

  const eligibleStagiaires = useMemo(() => {
    if (!seance?.promotion_id) return data.stagiaires;
    const ids = new Set(
      data.inscriptions
        .filter((inscription) => inscription.promotion_id === seance.promotion_id)
        .map((inscription) => inscription.stagiaire_id),
    );
    return data.stagiaires.filter((stagiaire) => ids.has(stagiaire.id));
  }, [seance, data.stagiaires, data.inscriptions]);

  useEffect(() => {
    const next: Record<string, Draft> = {};
    eligibleStagiaires.forEach((stagiaire) => {
      const match = existing.find((presence) => presence.stagiaire_id === stagiaire.id);
      next[stagiaire.id] = {
        status: match?.status ?? 'present',
        note: match?.note ?? '',
        id: match?.id,
      };
    });
    setDrafts(next);
  }, [existing, eligibleStagiaires]);

  const stats = useMemo(() => {
    const values = Object.values(drafts);
    const present = values.filter((draft) =>
      ['present', 'retard', 'sortie_autorisee'].includes(draft.status),
    ).length;
    const absent = values.filter((draft) =>
      ['absent', 'absence_non_justifiee', 'absence_justifiee'].includes(draft.status),
    ).length;
    return {
      total: values.length,
      present,
      absent,
      rate: values.length ? percentage(present, values.length) : 0,
    };
  }, [drafts]);

  const seanceModule = data.modules.find((item) => item.id === seance?.module_id);
  const seancePromotion = data.promotions.find((item) => item.id === seance?.promotion_id);
  const seanceFormateur = data.users.find((item) => item.id === seance?.formateur_id);
  const seanceModuleName = seanceModule?.name ?? 'Séance';
  const seanceTime =
    [formatTime(seance?.start_time), formatTime(seance?.end_time)]
      .filter((value) => value !== '—')
      .join(' - ') || '—';

  function handleExport() {
    if (!seance) return;

    const date = formatDate(seance.date);
    const filename = `presences-${safeFilenamePart(seance.date)}-${safeFilenamePart(seanceModuleName)}.csv`;

    downloadCsv(
      filename,
      [
        'Séance',
        'Date',
        'Horaire',
        'Module',
        'Promotion',
        'Matricule',
        'Stagiaire',
        'Statut',
        'Note / justification',
        'État',
      ],
      eligibleStagiaires.map((stagiaire) => {
        const draft = drafts[stagiaire.id];
        return [
          seance.title ?? seanceModuleName,
          date,
          seanceTime,
          seanceModuleName,
          seancePromotion?.code ?? '—',
          stagiaire.matricule,
          fullName(stagiaire),
          optionLabel(PRESENCE_OPTIONS, draft?.status),
          draft?.note.trim() || '—',
          draft?.id ? 'Enregistré' : 'À enregistrer',
        ];
      }),
    );
  }

  function handlePrint() {
    if (!seance) return;
    window.print();
  }

  function setAll(status: PresenceStatus) {
    setDrafts((current) => {
      const next = { ...current };
      Object.keys(next).forEach((id) => {
        next[id] = { ...next[id], status };
      });
      return next;
    });
  }

  async function handleSave() {
    if (!seanceId) return;

    const confirmed = await confirmAction({
      title: 'Enregistrer les présences',
      text: `${stats.total} stagiaire(s) seront enregistrés pour cette séance.`,
      confirmText: 'Enregistrer',
    });
    if (!confirmed) return;

    setSaving(true);
    let errors = 0;

    for (const stagiaire of eligibleStagiaires) {
      const draft = drafts[stagiaire.id];
      if (!draft) continue;

      const payload = {
        seance_id: seanceId,
        stagiaire_id: stagiaire.id,
        status: draft.status,
        note: draft.note.trim() || null,
        recorded_by: user?.id ?? null,
        recorded_at: new Date().toISOString(),
      };

      try {
        if (draft.id) {
          await dataService.updateRow<Presence>('presences', draft.id, payload);
        } else {
          await dataService.createRow<Presence>('presences', payload);
        }
      } catch {
        errors += 1;
      }
    }

    setSaving(false);
    reload();

    if (errors > 0) {
      notifyError('Enregistrement partiel', `${errors} présence(s) n’ont pas pu être enregistrées.`);
    } else {
      notifySuccess('Présences enregistrées', 'La feuille de présence a été mise à jour.');
    }
  }

  const columns: TableColumn<(typeof eligibleStagiaires)[number]>[] = [
    {
      key: 'stagiaire',
      header: 'Stagiaire',
      render: (stagiaire) => (
        <div>
          <p className="font-semibold text-black dark:text-white">{fullName(stagiaire)}</p>
          <p className="text-xs text-body dark:text-body-dark">{stagiaire.matricule}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Statut de présence',
      render: (stagiaire) => (
        <Select
          className="min-w-[190px]"
          value={drafts[stagiaire.id]?.status ?? 'present'}
          options={PRESENCE_OPTIONS}
          onChange={(event) =>
            setDrafts((current) => ({
              ...current,
              [stagiaire.id]: {
                ...current[stagiaire.id],
                status: event.target.value as PresenceStatus,
              },
            }))
          }
        />
      ),
    },
    {
      key: 'note',
      header: 'Note / justification',
      hideBelow: 'md',
      render: (stagiaire) => (
        <input
          value={drafts[stagiaire.id]?.note ?? ''}
          onChange={(event) =>
            setDrafts((current) => ({
              ...current,
              [stagiaire.id]: { ...current[stagiaire.id], note: event.target.value },
            }))
          }
          placeholder="Facultatif"
          className="w-full min-w-[200px] border border-stroke bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-white/10 dark:bg-[#242936] dark:text-white"
        />
      ),
    },
    {
      key: 'recorded',
      header: 'État',
      render: (stagiaire) => {
        const draft = drafts[stagiaire.id];
        return draft?.id ? (
          <Badge tone="success">
            <FiCheck className="h-3 w-3" /> Enregistré
          </Badge>
        ) : (
          <Badge tone="neutral">À enregistrer</Badge>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Pédagogie"
        title="Feuille de présences"
        description="Sélectionnez une séance, marquez les présences puis enregistrez la feuille complète."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={!seance || eligibleStagiaires.length === 0}
              icon={<FiDownload className="h-4 w-4" />}
            >
              Exporter CSV
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={!seance || eligibleStagiaires.length === 0}
              icon={<FiPrinter className="h-4 w-4" />}
            >
              Imprimer la fiche
            </Button>
            <Button
              onClick={() => void handleSave()}
              loading={saving}
              disabled={!seanceId || eligibleStagiaires.length === 0}
              icon={<FiSave className="h-4 w-4" />}
            >
              Enregistrer la feuille
            </Button>
          </div>
        }
      />

      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="card-root border border-stroke p-5 dark:border-white/10">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-body dark:text-body-dark">
            Séance à renseigner
          </label>
          <Select
            value={seanceId}
            placeholder="Sélectionner une séance…"
            options={data.seances.map((item) => ({
              value: item.id,
              label: `${formatDate(item.date)} · ${item.title ?? data.modules.find((m) => m.id === item.module_id)?.name ?? 'Séance'}${item.start_time ? ` à ${formatTime(item.start_time)}` : ''}`,
            }))}
            onChange={(event) => setSeanceId(event.target.value)}
          />
          {seance && (
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-body dark:text-body-dark">
              <span>
                Module :{' '}
                <strong className="text-dark dark:text-white">
                  {data.modules.find((item) => item.id === seance.module_id)?.name ?? '—'}
                </strong>
              </span>
              <span>
                Salle : <strong className="text-dark dark:text-white">{seance.room ?? '—'}</strong>
              </span>
              <span>
                Statut :{' '}
                <Badge tone={statusTone(seance.status)}>
                  {seance.status.replace('_', ' ')}
                </Badge>
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Présents" value={stats.present} tone="success" />
          <StatCard label="Absents" value={stats.absent} tone="danger" />
          <StatCard label="Taux" value={`${stats.rate}%`} tone="primary" />
          <StatCard label="Effectif" value={stats.total} tone="purple" />
        </div>
      </div>

      {seance && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setAll('present')}>
              Tous présents
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAll('absent')}>
              Tous absents
            </Button>
          </div>

          <div className="card-root border border-stroke dark:border-white/10">
            <DataTable
              columns={columns}
              rows={eligibleStagiaires}
              loading={loading}
              error={error}
              onRetry={reload}
              emptyTitle="Aucun stagiaire éligible"
              emptyDescription="Aucun stagiaire n’est inscrit à la promotion de cette séance."
            />
          </div>

          <p className="mt-3 text-xs text-body dark:text-body-dark">
            {existing.length > 0
              ? `${existing.length} présence(s) déjà enregistrée(s) pour cette séance.`
              : 'Aucune présence enregistrée pour cette séance.'}{' '}
            Statuts : {PRESENCE_OPTIONS.map((option) => optionLabel(PRESENCE_OPTIONS, option.value)).join(', ')}.
          </p>

          <div className="mt-6">
            <div className="mb-3">
              <h2 className="text-sm font-bold text-black dark:text-white">Fiche de présence imprimable</h2>
              <p className="mt-1 text-xs text-body dark:text-body-dark">
                Le document reprend les statuts affichés ci-dessus. Imprimez-le pour signature.
              </p>
            </div>

            <div
              id="print-area"
              className="border border-stroke bg-white p-5 text-black dark:border-white/10 sm:p-8"
            >
              <div className="flex flex-col gap-3 border-b-2 border-black pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xl font-extrabold tracking-tight">StageBuild</p>
                  <p className="text-xs">Gestion et suivi des stagiaires</p>
                  <p className="mt-1 text-xs">Plateforme pédagogique centralisée</p>
                </div>
                <div className="sm:text-right">
                  <p className="text-base font-bold uppercase tracking-wide sm:text-lg">
                    Fiche de présence
                  </p>
                  <p className="text-xs">Année académique {new Date().getFullYear()}</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-2 break-words text-sm sm:grid-cols-2">
                <p>
                  <strong>Séance :</strong> {seance.title ?? seanceModuleName}
                </p>
                <p>
                  <strong>Date :</strong> {formatDate(seance.date)}
                </p>
                <p>
                  <strong>Horaire :</strong> {seanceTime}
                </p>
                <p>
                  <strong>Module :</strong> {seanceModuleName}
                </p>
                <p>
                  <strong>Promotion :</strong> {seancePromotion?.code ?? '—'}
                </p>
                <p>
                  <strong>Formateur :</strong> {seanceFormateur ? fullName(seanceFormateur) : '—'}
                </p>
                <p>
                  <strong>Salle :</strong> {seance.room ?? '—'}
                </p>
                <p>
                  <strong>Effectif :</strong> {eligibleStagiaires.length}
                </p>
              </div>

              <table className="mt-6 w-full break-words border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b-2 border-black text-left">
                    <th className="py-2 pr-2">N°</th>
                    <th className="py-2 pr-2">Matricule</th>
                    <th className="py-2 pr-2">Stagiaire</th>
                    <th className="py-2 pr-2">Statut</th>
                    <th className="py-2 pr-2">Observation</th>
                    <th className="py-2 text-center">Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {eligibleStagiaires.map((stagiaire, index) => {
                    const draft = drafts[stagiaire.id];
                    return (
                      <tr
                        key={stagiaire.id}
                        className="break-inside-avoid border-b border-slate-300 align-top"
                      >
                        <td className="py-2 pr-2">{index + 1}</td>
                        <td className="py-2 pr-2">{stagiaire.matricule}</td>
                        <td className="py-2 pr-2 font-semibold">{fullName(stagiaire)}</td>
                        <td className="py-2 pr-2">
                          {optionLabel(PRESENCE_OPTIONS, draft?.status)}
                        </td>
                        <td className="py-2 pr-2">{draft?.note.trim() || '—'}</td>
                        <td className="h-8 py-2" />
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-4 flex flex-wrap gap-4 text-xs">
                <span>Effectif : {stats.total}</span>
                <span>Présents : {stats.present}</span>
                <span>Absents : {stats.absent}</span>
                <span>Taux : {stats.rate}%</span>
              </div>

              <div className="mt-10 flex flex-col gap-6 text-xs sm:flex-row sm:justify-between">
                <p>Fait le {formatDate(new Date().toISOString())}</p>
                <div className="flex gap-12">
                  <div className="text-center">
                    <p>Le formateur</p>
                    <p className="mt-10 border-t border-black pt-2">Signature</p>
                  </div>
                  <div className="text-center">
                    <p>La Direction</p>
                    <p className="mt-10 border-t border-black pt-2">Signature et cachet</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
