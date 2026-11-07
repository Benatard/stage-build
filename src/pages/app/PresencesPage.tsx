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
import { downloadExcel, safeFilenamePart } from '@/utils/document-export';
import { formatDate, formatTime, fullName, percentage } from '@/utils/format';

type Draft = {
  status: PresenceStatus;
  note: string;
  id?: string;
};

export default function PresencesPage() {
  const { data } = useReferenceData();
  const { user, activeInstitution } = useAuth();
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

    downloadExcel({
      filename: `presences-${safeFilenamePart(seance.date)}-${safeFilenamePart(seanceModuleName)}`,
      title: 'Feuille de présences',
      subtitle: `${seance.title ?? seanceModuleName} · ${date} · ${seanceTime}`,
      sheetName: 'Présences',
      organization: activeInstitution
        ? {
            name: activeInstitution.name,
            address: activeInstitution.address,
            email: activeInstitution.email,
            phone: activeInstitution.phone,
            website: activeInstitution.website,
            logoUrl: activeInstitution.logo_url,
          }
        : undefined,
      meta: [
        ['Séance', seance.title ?? seanceModuleName],
        ['Date', date],
        ['Horaire', seanceTime],
        ['Module', seanceModuleName],
        ['Promotion', seancePromotion?.code ?? '—'],
        [
          'Formateur',
          seanceFormateur ? fullName(seanceFormateur) : '—',
        ],
        ['Salle', seance.room ?? '—'],
        ['Effectif', String(stats.total)],
        ['Présents', String(stats.present)],
        ['Absents', String(stats.absent)],
        ['Taux de présence', `${stats.rate}%`],
      ],
      table: {
        headers: [
          'N°',
          'Matricule',
          'Stagiaire',
          'Statut',
          'Note / justification',
          'État',
        ],
        rows: eligibleStagiaires.map((stagiaire, index) => {
          const draft = drafts[stagiaire.id];
          return [
            index + 1,
            stagiaire.matricule,
            fullName(stagiaire),
            optionLabel(PRESENCE_OPTIONS, draft?.status),
            draft?.note.trim() || '—',
            draft?.id ? 'Enregistré' : 'À enregistrer',
          ];
        }),
        widths: [38, 100, 200, 120, 220, 100],
      },
      note:
        'Feuille générée depuis StageBuild. Les statuts affichés correspondent aux valeurs actuellement saisies dans l’application.',
    });
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
              Exporter Excel
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={!seance || eligibleStagiaires.length === 0}
              icon={<FiPrinter className="h-4 w-4" />}
            >
              Imprimer / PDF
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
              <div className="flex flex-col gap-4 border-b-[3px] border-black pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xl font-extrabold tracking-tight">
                    {activeInstitution?.name ?? 'StageBuild'}
                  </p>
                  <p className="mt-1 text-xs">
                    {activeInstitution?.address ??
                      'Gestion et suivi des stagiaires'}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-600">
                    {[activeInstitution?.phone, activeInstitution?.email]
                      .filter(Boolean)
                      .join(' · ') || 'Plateforme pédagogique centralisée'}
                  </p>
                </div>
                <div className="shrink-0 sm:text-right">
                  <p className="text-base font-bold uppercase tracking-[0.12em] sm:text-lg">
                    Fiche de présence
                  </p>
                  <p className="mt-1 text-xs">
                    Année académique {new Date().getFullYear()}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-600">
                    Réf. {seance.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-2 break-words text-sm sm:grid-cols-2">
                <p>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Séance
                  </span>
                  <br />
                  <strong>{seance.title ?? seanceModuleName}</strong>
                </p>
                <p>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Date et horaire
                  </span>
                  <br />
                  <strong>
                    {formatDate(seance.date)} · {seanceTime}
                  </strong>
                </p>
                <p>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Module
                  </span>
                  <br />
                  <strong>{seanceModuleName}</strong>
                </p>
                <p>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Promotion
                  </span>
                  <br />
                  <strong>{seancePromotion?.code ?? '—'}</strong>
                </p>
                <p>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Formateur
                  </span>
                  <br />
                  <strong>{seanceFormateur ? fullName(seanceFormateur) : '—'}</strong>
                </p>
                <p>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Salle
                  </span>
                  <br />
                  <strong>{seance.room ?? '—'}</strong>
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                {[
                  ['Effectif', stats.total],
                  ['Présents', stats.present],
                  ['Absents', stats.absent],
                  ['Taux', `${stats.rate}%`],
                ].map(([label, value]) => (
                  <div key={String(label)} className="border border-slate-400 px-3 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                      {label}
                    </p>
                    <p className="mt-0.5 text-lg font-extrabold">{value}</p>
                  </div>
                ))}
              </div>

              <table className="mt-5 w-full break-words border-collapse text-[11px] sm:text-xs">
                <thead>
                  <tr className="bg-slate-100 text-left">
                    <th className="w-10 border border-slate-400 px-2 py-2">N°</th>
                    <th className="w-28 border border-slate-400 px-2 py-2">Matricule</th>
                    <th className="border border-slate-400 px-2 py-2">Stagiaire</th>
                    <th className="w-32 border border-slate-400 px-2 py-2">Statut</th>
                    <th className="border border-slate-400 px-2 py-2">Observation</th>
                    <th className="w-28 border border-slate-400 px-2 py-2 text-center">
                      Signature
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {eligibleStagiaires.map((stagiaire, index) => {
                    const draft = drafts[stagiaire.id];
                    return (
                      <tr
                        key={stagiaire.id}
                        className={`break-inside-avoid align-top ${
                          index % 2 === 1 ? 'bg-slate-50' : ''
                        }`}
                      >
                        <td className="border border-slate-300 px-2 py-2">{index + 1}</td>
                        <td className="border border-slate-300 px-2 py-2">
                          {stagiaire.matricule}
                        </td>
                        <td className="border border-slate-300 px-2 py-2 font-semibold">
                          {fullName(stagiaire)}
                        </td>
                        <td className="border border-slate-300 px-2 py-2">
                          {optionLabel(PRESENCE_OPTIONS, draft?.status)}
                        </td>
                        <td className="border border-slate-300 px-2 py-2">
                          {draft?.note.trim() || '—'}
                        </td>
                        <td className="h-10 border border-slate-300 px-2 py-2" />
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-3 flex flex-wrap justify-between gap-2 text-[10px] text-slate-600">
                <span>
                  Statuts :{' '}
                  {PRESENCE_OPTIONS.map((option) =>
                    optionLabel(PRESENCE_OPTIONS, option.value),
                  ).join(', ')}
                </span>
                <span>Document confidentiel · {activeInstitution?.name ?? 'StageBuild'}</span>
              </div>

              <div className="mt-8 flex flex-col gap-6 text-xs sm:flex-row sm:items-end sm:justify-between">
                <p>
                  Fait {activeInstitution?.city ? `à ${activeInstitution.city}, ` : ''}le{' '}
                  {formatDate(new Date().toISOString())}
                </p>
                <div className="flex gap-12">
                  <div className="min-w-[130px] text-center">
                    <p className="font-semibold">Le formateur</p>
                    <p className="mt-10 border-t border-black pt-2">Signature</p>
                  </div>
                  <div className="min-w-[150px] text-center">
                    <p className="font-semibold">La Direction</p>
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
