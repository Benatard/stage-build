import { useEffect, useMemo, useState } from 'react';
import { FiCheckCircle, FiSave } from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader, StatCard } from '@/components/ui/Feedback';
import { Select } from '@/components/ui/Form';
import { useAuth } from '@/context/AuthContext';
import { useForgeTable } from '@/hooks/useForgeTable';
import { useReferenceData } from '@/hooks/useReferenceData';
import { dataService } from '@/services/data.service';
import { EVALUATION_TYPE_OPTIONS, optionLabel } from '@/config/options';
import type { Note, NoteStatus, Stagiaire } from '@/types/domain';
import { confirmAction, notifyError, notifySuccess } from '@/utils/alerts';
import { formatDate, fullName, round } from '@/utils/format';

type Draft = {
  score: string;
  comment: string;
  id?: string;
  status: NoteStatus;
};

export default function NotesPage() {
  const { data } = useReferenceData();
  const { user } = useAuth();
  const [evaluationId, setEvaluationId] = useState('');
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState(false);

  const evaluation = data.evaluations.find((item) => item.id === evaluationId);

  const { rows: existing, loading, error, reload } = useForgeTable<Note>('notes', {
    filters: { evaluation_id: evaluationId },
    limit: 500,
    enabled: Boolean(evaluationId),
  });

  const eligibleStagiaires = useMemo(() => {
    if (!evaluation?.formation_id) return data.stagiaires;
    const ids = new Set(
      data.inscriptions
        .filter((inscription) => inscription.formation_id === evaluation.formation_id)
        .map((inscription) => inscription.stagiaire_id),
    );
    return ids.size > 0
      ? data.stagiaires.filter((stagiaire) => ids.has(stagiaire.id))
      : data.stagiaires;
  }, [evaluation, data.stagiaires, data.inscriptions]);

  useEffect(() => {
    const next: Record<string, Draft> = {};
    eligibleStagiaires.forEach((stagiaire) => {
      const match = existing.find((note) => note.stagiaire_id === stagiaire.id);
      next[stagiaire.id] = {
        score: match?.score !== null && match?.score !== undefined ? String(match.score) : '',
        comment: match?.comment ?? '',
        id: match?.id,
        status: match?.status ?? 'saisie',
      };
    });
    setDrafts(next);
  }, [existing, eligibleStagiaires]);

  const stats = useMemo(() => {
    const scores = Object.values(drafts)
      .map((draft) => Number(draft.score))
      .filter((score) => Number.isFinite(score));
    const average = scores.length
      ? round(scores.reduce((sum, score) => sum + score, 0) / scores.length, 2)
      : 0;
    const max = evaluation?.max_score ?? 20;
    const passed = scores.filter((score) => (score / max) * 20 >= 10).length;
    return {
      entered: scores.length,
      total: Object.keys(drafts).length,
      average,
      passed,
    };
  }, [drafts, evaluation]);

  async function handleSave(status: NoteStatus) {
    if (!evaluation || !evaluationId) return;

    const confirmed = await confirmAction({
      title: status === 'validee' ? 'Enregistrer et valider' : 'Enregistrer les notes',
      text: `Les notes de « ${evaluation.title} » seront enregistrées.`,
      confirmText: 'Confirmer',
    });
    if (!confirmed) return;

    setSaving(true);
    let errors = 0;

    for (const stagiaire of eligibleStagiaires) {
      const draft = drafts[stagiaire.id];
      if (!draft || draft.score.trim() === '') continue;

      const score = Number(draft.score);
      if (!Number.isFinite(score)) continue;

      const payload = {
        evaluation_id: evaluationId,
        stagiaire_id: stagiaire.id,
        score,
        max_score: evaluation.max_score,
        coefficient: evaluation.coefficient,
        comment: draft.comment.trim() || null,
        status,
        graded_by: user?.id ?? null,
        graded_at: new Date().toISOString(),
        validated_by: status === 'validee' ? user?.id ?? null : null,
        validated_at: status === 'validee' ? new Date().toISOString() : null,
      };

      try {
        if (draft.id) {
          await dataService.updateRow<Note>('notes', draft.id, payload);
        } else {
          await dataService.createRow<Note>('notes', payload);
        }
      } catch {
        errors += 1;
      }
    }

    setSaving(false);
    reload();

    if (errors > 0) {
      notifyError('Enregistrement partiel', `${errors} note(s) n’ont pas pu être enregistrées.`);
    } else {
      notifySuccess(
        status === 'validee' ? 'Notes validées' : 'Notes enregistrées',
        'Le carnet de notes a été mis à jour.',
      );
    }
  }

  const columns: TableColumn<Stagiaire>[] = [
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
      key: 'score',
      header: `Note / ${evaluation?.max_score ?? 20}`,
      render: (stagiaire) => (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={evaluation?.max_score ?? 20}
            step={0.25}
            value={drafts[stagiaire.id]?.score ?? ''}
            onChange={(event) =>
              setDrafts((current) => ({
                ...current,
                [stagiaire.id]: { ...current[stagiaire.id], score: event.target.value },
              }))
            }
            placeholder="—"
            className="w-24 border border-stroke bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-white/10 dark:bg-[#242936] dark:text-white"
          />
          <span className="text-xs text-body dark:text-body-dark">
            coef. {evaluation?.coefficient ?? 1}
          </span>
        </div>
      ),
    },
    {
      key: 'comment',
      header: 'Commentaire',
      hideBelow: 'md',
      render: (stagiaire) => (
        <input
          value={drafts[stagiaire.id]?.comment ?? ''}
          onChange={(event) =>
            setDrafts((current) => ({
              ...current,
              [stagiaire.id]: { ...current[stagiaire.id], comment: event.target.value },
            }))
          }
          placeholder="Facultatif"
          className="w-full min-w-[220px] border border-stroke bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-white/10 dark:bg-[#242936] dark:text-white"
        />
      ),
    },
    {
      key: 'status',
      header: 'État',
      render: (stagiaire) => {
        const draft = drafts[stagiaire.id];
        return draft?.id ? (
          <Badge tone={statusTone(draft.status)}>
            {draft.status === 'validee' ? 'Validée' : 'Saisie'}
          </Badge>
        ) : (
          <Badge tone="neutral">Non saisie</Badge>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Évaluations"
        title="Carnet de notes"
        description="Saisissez les notes par évaluation. Les moyennes et décisions sont recalculées automatiquement."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => void handleSave('saisie')}
              loading={saving}
              disabled={!evaluationId}
              icon={<FiSave className="h-4 w-4" />}
            >
              Enregistrer
            </Button>
            <Button
              onClick={() => void handleSave('validee')}
              loading={saving}
              disabled={!evaluationId}
              icon={<FiCheckCircle className="h-4 w-4" />}
            >
              Enregistrer et valider
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="card-root border border-stroke p-5 dark:border-white/10">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-body dark:text-body-dark">
            Évaluation
          </label>
          <Select
            value={evaluationId}
            placeholder="Sélectionner une évaluation…"
            options={data.evaluations.map((item) => ({
              value: item.id,
              label: `${item.title} · ${formatDate(item.date)} · ${optionLabel(EVALUATION_TYPE_OPTIONS, item.type)}`,
            }))}
            onChange={(event) => setEvaluationId(event.target.value)}
          />
          {evaluation && (
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-body dark:text-body-dark">
              <span>
                Module :{' '}
                <strong className="text-dark dark:text-white">
                  {data.modules.find((item) => item.id === evaluation.module_id)?.name ?? '—'}
                </strong>
              </span>
              <span>
                Barème : <strong className="text-dark dark:text-white">{evaluation.max_score} pts</strong>
              </span>
              <span>
                Coefficient : <strong className="text-dark dark:text-white">{evaluation.coefficient}</strong>
              </span>
              <Badge tone={statusTone(evaluation.status)}>{evaluation.status.replace('_', ' ')}</Badge>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Notes saisies" value={`${stats.entered}/${stats.total}`} tone="primary" />
          <StatCard label="Moyenne" value={`${stats.average}/${evaluation?.max_score ?? 20}`} tone="purple" />
          <StatCard label="Réussites" value={stats.passed} tone="success" />
          <StatCard label="Restants" value={Math.max(stats.total - stats.entered, 0)} tone="warning" />
        </div>
      </div>

      {evaluationId ? (
        <div className="card-root border border-stroke dark:border-white/10">
          <DataTable
            columns={columns}
            rows={eligibleStagiaires}
            loading={loading}
            error={error}
            onRetry={reload}
            emptyTitle="Aucun stagiaire éligible"
            emptyDescription="Aucun stagiaire n’est rattaché à la formation de cette évaluation."
          />
        </div>
      ) : (
        <div className="card-root flex items-center justify-center border border-stroke px-6 py-20 text-sm text-body dark:border-white/10 dark:text-body-dark">
          Sélectionnez une évaluation pour saisir les notes.
        </div>
      )}
    </div>
  );
}
