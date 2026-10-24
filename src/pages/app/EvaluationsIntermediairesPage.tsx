import { useMemo, useState } from 'react';
import { FiSave } from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader, StatCard } from '@/components/ui/Feedback';
import { Field, Select, Textarea } from '@/components/ui/Form';
import { useAuth } from '@/context/AuthContext';
import { useForgeTable } from '@/hooks/useForgeTable';
import { useReferenceData } from '@/hooks/useReferenceData';
import { dataService } from '@/services/data.service';
import { DECISION_OPTIONS, optionLabel } from '@/config/options';
import type {
  CompetenceEvaluation,
  Comportement,
  Implication,
  IntermediateEvaluation,
  Note,
  Presence,
  QcmAttempt,
  TravauxSoumission,
} from '@/types/domain';
import { confirmAction, notifyError, notifySuccess } from '@/utils/alerts';
import { average, formatDate, fullName, percentage, round } from '@/utils/format';
import { buildOptions } from '@/utils/options';

export default function EvaluationsIntermediairesPage() {
  const { data } = useReferenceData();
  const { user } = useAuth();
  const [stagiaireId, setStagiaireId] = useState(user?.stagiaire_id ?? '');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    strengths: '',
    improvements: '',
    recommendations: '',
    decision: 'progression_normale',
    observations: '',
  });

  const enabled = Boolean(stagiaireId);

  const { rows: notes } = useForgeTable<Note>('notes', { filters: { stagiaire_id: stagiaireId }, enabled });
  const { rows: presences } = useForgeTable<Presence>('presences', { filters: { stagiaire_id: stagiaireId }, enabled });
  const { rows: attempts } = useForgeTable<QcmAttempt>('qcm_attempts', { filters: { stagiaire_id: stagiaireId }, enabled });
  const { rows: submissions } = useForgeTable<TravauxSoumission>('travaux_soumissions', { filters: { stagiaire_id: stagiaireId }, enabled });
  const { rows: competencies } = useForgeTable<CompetenceEvaluation>('competence_levels', { filters: { stagiaire_id: stagiaireId }, enabled });
  const { rows: implications } = useForgeTable<Implication>('implications', { filters: { stagiaire_id: stagiaireId }, enabled });
  const { rows: behaviors } = useForgeTable<Comportement>('comportements', { filters: { stagiaire_id: stagiaireId }, enabled });

  const { rows: existing, loading, reload } = useForgeTable<IntermediateEvaluation>(
    'intermediate_evaluations',
    { filters: { stagiaire_id: stagiaireId }, order: 'date.desc', enabled },
  );

  const computed = useMemo(() => {
    const normalized = notes
      .filter((note) => note.score !== null && note.score !== undefined)
      .map((note) => round(((note.score ?? 0) / (note.max_score || 20)) * 20, 2));
    const present = presences.filter((presence) =>
      ['present', 'retard', 'sortie_autorisee'].includes(presence.status),
    ).length;
    const latest = new Map<string, CompetenceEvaluation>();
    competencies.forEach((level) => {
      if (!latest.has(level.competence_id)) latest.set(level.competence_id, level);
    });
    const acquired = Array.from(latest.values()).filter((level) =>
      ['acquis', 'maitrise'].includes(level.level),
    ).length;

    return {
      average: average(normalized),
      attendanceRate: percentage(present, Math.max(presences.length, 1)),
      qcmAverage: average(
        attempts.filter((attempt) => attempt.status === 'corrige').map((attempt) => attempt.percentage),
      ),
      tpAverage: average(submissions.map((item) => item.score)),
      competenciesAcquired: acquired,
      competenciesTotal: latest.size,
      implicationAverage: average(implications.map((item) => item.average)),
      behaviorAverage: average(behaviors.map((item) => item.average)),
    };
  }, [notes, presences, attempts, submissions, competencies, implications, behaviors]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stagiaireId) return;

    const confirmed = await confirmAction({
      title: 'Enregistrer l’évaluation intermédiaire',
      text: 'La synthèse et la décision seront archivées pour ce stagiaire.',
      confirmText: 'Enregistrer',
    });
    if (!confirmed) return;

    setSaving(true);

    try {
      await dataService.createRow<IntermediateEvaluation>('intermediate_evaluations', {
        stagiaire_id: stagiaireId,
        date: new Date().toISOString().slice(0, 10),
        average: computed.average,
        attendance_rate: computed.attendanceRate,
        qcm_average: computed.qcmAverage,
        tp_average: computed.tpAverage,
        competencies_acquired: computed.competenciesAcquired,
        implication_average: computed.implicationAverage,
        behavior_average: computed.behaviorAverage,
        strengths: form.strengths.trim() || null,
        improvements: form.improvements.trim() || null,
        recommendations: form.recommendations.trim() || null,
        decision: form.decision,
        observations: form.observations.trim() || null,
        evaluator_id: user?.id ?? null,
      });
      notifySuccess('Évaluation enregistrée');
      setForm({
        strengths: '',
        improvements: '',
        recommendations: '',
        decision: 'progression_normale',
        observations: '',
      });
      reload();
    } catch {
      notifyError('Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  const columns: TableColumn<IntermediateEvaluation>[] = [
    { key: 'date', header: 'Date', render: (row) => formatDate(row.date) },
    {
      key: 'average',
      header: 'Moyenne',
      render: (row) => <Badge tone={statusTone((row.average ?? 0) >= 10 ? 'acquis' : 'non_acquis')}>{row.average ?? 0}/20</Badge>,
    },
    { key: 'attendance', header: 'Présence', hideBelow: 'md', render: (row) => `${row.attendance_rate ?? 0}%` },
    {
      key: 'decision',
      header: 'Décision',
      render: (row) => (
        <Badge tone={statusTone(row.decision)}>
          {optionLabel(DECISION_OPTIONS, row.decision)}
        </Badge>
      ),
    },
    {
      key: 'recommendations',
      header: 'Recommandations',
      hideBelow: 'lg',
      render: (row) => <span className="line-clamp-2 max-w-xs">{row.recommendations ?? '—'}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Suivi"
        title="Évaluations intermédiaires"
        description="Générez une synthèse consolidée et formalisez la décision pédagogique à mi-parcours."
      />

      <div className="mb-5 card-root border border-stroke p-5 dark:border-white/10">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-body dark:text-body-dark">
          Stagiaire
        </label>
        <Select
          value={stagiaireId}
          placeholder="Sélectionner un stagiaire…"
          options={buildOptions(data.stagiaires, (item) => `${fullName(item)} (${item.matricule})`)}
          onChange={(event) => setStagiaireId(event.target.value)}
        />
      </div>

      {stagiaireId && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Moyenne" value={`${computed.average.toFixed(2)}/20`} tone={computed.average >= 10 ? 'success' : 'danger'} />
            <StatCard label="Présence" value={`${computed.attendanceRate}%`} tone="primary" />
            <StatCard label="QCM / TP" value={`${computed.qcmAverage.toFixed(0)}% / ${computed.tpAverage.toFixed(1)}`} tone="purple" />
            <StatCard label="Compétences" value={`${computed.competenciesAcquired}/${computed.competenciesTotal}`} tone="warning" />
          </div>

          <form onSubmit={handleSave} className="mb-6 card-root grid gap-4 border border-stroke p-5 dark:border-white/10 lg:grid-cols-2">
            <Field label="Points forts" className="lg:col-span-2">
              <Textarea
                rows={3}
                value={form.strengths}
                onChange={(event) => setForm((current) => ({ ...current, strengths: event.target.value }))}
              />
            </Field>
            <Field label="Points à améliorer">
              <Textarea
                rows={3}
                value={form.improvements}
                onChange={(event) => setForm((current) => ({ ...current, improvements: event.target.value }))}
              />
            </Field>
            <Field label="Recommandations">
              <Textarea
                rows={3}
                value={form.recommendations}
                onChange={(event) => setForm((current) => ({ ...current, recommendations: event.target.value }))}
              />
            </Field>
            <Field label="Décision" required>
              <Select
                value={form.decision}
                options={DECISION_OPTIONS}
                onChange={(event) => setForm((current) => ({ ...current, decision: event.target.value }))}
              />
            </Field>
            <Field label="Observations complémentaires">
              <Textarea
                rows={3}
                value={form.observations}
                onChange={(event) => setForm((current) => ({ ...current, observations: event.target.value }))}
              />
            </Field>
            <div className="lg:col-span-2">
              <Button type="submit" loading={saving} icon={<FiSave className="h-4 w-4" />}>
                Enregistrer l’évaluation
              </Button>
            </div>
          </form>

          <div className="card-root border border-stroke dark:border-white/10">
            <div className="border-b border-stroke px-5 py-4 dark:border-white/10">
              <h2 className="text-sm font-bold text-black dark:text-white">Historique des évaluations</h2>
            </div>
            <DataTable
              columns={columns}
              rows={existing}
              loading={loading}
              onRetry={reload}
              emptyTitle="Aucune évaluation intermédiaire"
              emptyDescription="Enregistrez la première synthèse pour ce stagiaire."
            />
          </div>
        </>
      )}
    </div>
  );
}
