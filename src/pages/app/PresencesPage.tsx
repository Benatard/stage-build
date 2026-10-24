import { useEffect, useMemo, useState } from 'react';
import { FiCheck, FiSave } from 'react-icons/fi';
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
import { formatDate, formatTime, fullName, percentage } from '@/utils/format';

type Draft = {
  status: PresenceStatus;
  note: string;
  id?: string;
};

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
          <Button
            onClick={() => void handleSave()}
            loading={saving}
            disabled={!seanceId || eligibleStagiaires.length === 0}
            icon={<FiSave className="h-4 w-4" />}
          >
            Enregistrer la feuille
          </Button>
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

      {seanceId && (
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
        </>
      )}
    </div>
  );
}
