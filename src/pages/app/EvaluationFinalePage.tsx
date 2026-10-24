import { useEffect, useMemo, useState } from 'react';
import { FiCheckCircle, FiSave } from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader, StatCard } from '@/components/ui/Feedback';
import { Field, Input, Select, Textarea } from '@/components/ui/Form';
import { useAuth } from '@/context/AuthContext';
import { useForgeTable } from '@/hooks/useForgeTable';
import { useReferenceData } from '@/hooks/useReferenceData';
import { dataService } from '@/services/data.service';
import type {
  Comportement,
  FinalEvaluation,
  FinalProject,
  Implication,
  Note,
  Presence,
  QcmAttempt,
  TravauxSoumission,
} from '@/types/domain';
import { confirmAction, notifyError, notifySuccess } from '@/utils/alerts';
import { average, formatDate, fullName, percentage, round } from '@/utils/format';
import { buildOptions } from '@/utils/options';

const decisionLabels: Record<string, string> = {
  en_attente: 'En attente',
  valide: 'Validé',
  non_valide: 'Non validé',
};

const decisionOptions = Object.entries(decisionLabels).map(([value, label]) => ({ value, label }));

const defaultCoefficients = {
  modules: 40,
  qcm: 10,
  tp: 15,
  project: 20,
  implication: 5,
  professionalism: 5,
  attendance: 5,
};

export default function EvaluationFinalePage() {
  const { data } = useReferenceData();
  const { user } = useAuth();
  const [stagiaireId, setStagiaireId] = useState(user?.stagiaire_id ?? '');
  const [coefficients, setCoefficients] = useState(defaultCoefficients);
  const [decision, setDecision] = useState('en_attente');
  const [appreciation, setAppreciation] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const linkedStagiaireId = user?.stagiaire_id;
    if (!linkedStagiaireId) return;
    setStagiaireId((current) => current || linkedStagiaireId);
  }, [user?.stagiaire_id]);

  const enabled = Boolean(stagiaireId);

  const { rows: notes } = useForgeTable<Note>('notes', { filters: { stagiaire_id: stagiaireId }, enabled });
  const { rows: presences } = useForgeTable<Presence>('presences', { filters: { stagiaire_id: stagiaireId }, enabled });
  const { rows: attempts } = useForgeTable<QcmAttempt>('qcm_attempts', { filters: { stagiaire_id: stagiaireId }, enabled });
  const { rows: submissions } = useForgeTable<TravauxSoumission>('travaux_soumissions', { filters: { stagiaire_id: stagiaireId }, enabled });
  const { rows: projects } = useForgeTable<FinalProject>('final_projects', { filters: { stagiaire_id: stagiaireId }, enabled });
  const { rows: implications } = useForgeTable<Implication>('implications', { filters: { stagiaire_id: stagiaireId }, enabled });
  const { rows: behaviors } = useForgeTable<Comportement>('comportements', { filters: { stagiaire_id: stagiaireId }, enabled });
  const { rows: existing, loading, reload } = useForgeTable<FinalEvaluation>(
    'final_evaluations',
    { filters: { stagiaire_id: stagiaireId }, order: 'created_at.desc', enabled },
  );

  const computed = useMemo(() => {
    const normalizedNotes = notes
      .filter((note) => note.score !== null && note.score !== undefined)
      .map((note) => ((note.score ?? 0) / (note.max_score || 20)) * 20);
    const present = presences.filter((presence) =>
      ['present', 'retard', 'sortie_autorisee'].includes(presence.status),
    ).length;

    const modulesAverage = average(normalizedNotes);
    const qcmPercentage = average(
      attempts.filter((attempt) => attempt.status === 'corrige').map((attempt) => attempt.percentage),
    );
    const qcmAverage = round((qcmPercentage / 100) * 20, 2);
    const tpAverage = average(submissions.map((item) => item.score));
    const projectAverage = average(projects.map((item) => item.score));
    const implicationAverage = average(implications.map((item) => item.average));
    const professionalismAverage = average(behaviors.map((item) => item.average));
    const attendanceRate = percentage(present, Math.max(presences.length, 1));

    const weighted =
      modulesAverage * coefficients.modules +
      qcmAverage * coefficients.qcm +
      tpAverage * coefficients.tp +
      projectAverage * coefficients.project +
      (implicationAverage * 4) * coefficients.implication +
      (professionalismAverage * 4) * coefficients.professionalism +
      (attendanceRate * 0.2) * coefficients.attendance;

    const totalWeight = Object.values(coefficients).reduce((sum, value) => sum + value, 0);
    const finalAverage = totalWeight > 0 ? round(weighted / totalWeight, 2) : 0;

    return {
      modulesAverage,
      qcmAverage,
      tpAverage,
      projectAverage,
      implicationAverage,
      professionalismAverage,
      attendanceRate,
      finalAverage,
      hasData: normalizedNotes.length > 0 || attempts.length > 0 || submissions.length > 0,
    };
  }, [notes, presences, attempts, submissions, projects, implications, behaviors, coefficients]);

  async function handleSave(publish = false) {
    if (!stagiaireId) return;

    const confirmed = await confirmAction({
      title: publish ? 'Valider et publier' : 'Enregistrer l’évaluation finale',
      text: publish
        ? 'L’évaluation finale sera publiée et visible par le stagiaire.'
        : 'La synthèse finale sera enregistrée.',
      confirmText: publish ? 'Publier' : 'Enregistrer',
    });
    if (!confirmed) return;

    setSaving(true);

    try {
      const row = await dataService.createRow<FinalEvaluation>('final_evaluations', {
        stagiaire_id: stagiaireId,
        modules_average: computed.modulesAverage,
        qcm_average: computed.qcmAverage,
        tp_average: computed.tpAverage,
        project_average: computed.projectAverage,
        implication_average: computed.implicationAverage,
        professionalism_average: computed.professionalismAverage,
        attendance_rate: computed.attendanceRate,
        coefficients,
        final_average: computed.finalAverage,
        decision,
        appreciation: appreciation.trim() || null,
        validated_by: user?.id ?? null,
        published_at: publish ? new Date().toISOString() : null,
      });
      notifySuccess(publish ? 'Évaluation publiée' : 'Évaluation enregistrée', row.final_average ? `Moyenne finale : ${row.final_average}/20` : undefined);
      setAppreciation('');
      reload();
    } catch {
      notifyError('Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  const columns: TableColumn<FinalEvaluation>[] = [
    { key: 'date', header: 'Date', render: (row) => formatDate(row.created_at) },
    {
      key: 'average',
      header: 'Moyenne finale',
      render: (row) => (
        <Badge tone={statusTone((row.final_average ?? 0) >= 10 ? 'valide' : 'non_valide')}>
          {row.final_average ?? 0}/20
        </Badge>
      ),
    },
    { key: 'modules', header: 'Modules', hideBelow: 'md', render: (row) => `${row.modules_average ?? 0}` },
    { key: 'project', header: 'Projet', hideBelow: 'md', render: (row) => `${row.project_average ?? 0}` },
    {
      key: 'decision',
      header: 'Décision',
      render: (row) => (
        <Badge tone={statusTone(row.decision)}>{decisionLabels[row.decision] ?? row.decision}</Badge>
      ),
    },
    {
      key: 'published',
      header: 'Publication',
      hideBelow: 'lg',
      render: (row) => (row.published_at ? formatDate(row.published_at) : 'Non publiée'),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Résultats"
        title="Évaluation finale"
        description="Consolidez les résultats, pondérez les critères et formalisez la décision finale."
      />

      <div className="mb-5 card-root border border-stroke p-5 dark:border-white/10">
        <Field label="Stagiaire" required>
          <Select
            value={stagiaireId}
            placeholder="Sélectionner un stagiaire…"
            options={buildOptions(data.stagiaires, (item) => `${fullName(item)} (${item.matricule})`)}
            onChange={(event) => setStagiaireId(event.target.value)}
          />
        </Field>
      </div>

      {stagiaireId && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Modules" value={`${computed.modulesAverage.toFixed(2)}/20`} tone="primary" />
            <StatCard label="QCM" value={`${computed.qcmAverage.toFixed(2)}/20`} tone="purple" />
            <StatCard label="TP" value={`${computed.tpAverage.toFixed(2)}/20`} tone="warning" />
            <StatCard label="Projet final" value={`${computed.projectAverage.toFixed(2)}/20`} tone="success" />
          </div>

          <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="card-root border border-stroke p-5 dark:border-white/10">
              <h2 className="mb-4 text-sm font-bold text-black dark:text-white">Pondération des critères</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                {Object.entries(defaultCoefficients).map(([key, defaultValue]) => (
                  <Field
                    key={key}
                    label={
                      {
                        modules: 'Modules',
                        qcm: 'QCM',
                        tp: 'TP',
                        project: 'Projet',
                        implication: 'Implication',
                        professionalism: 'Comportement',
                        attendance: 'Présence',
                      }[key] ?? key
                    }
                  >
                    <Input
                      type="number"
                      min={0}
                      value={coefficients[key as keyof typeof coefficients] ?? defaultValue}
                      onChange={(event) =>
                        setCoefficients((current) => ({
                          ...current,
                          [key]: Number(event.target.value),
                        }))
                      }
                    />
                  </Field>
                ))}
              </div>
              <p className="mt-3 text-xs text-body dark:text-body-dark">
                Présence : {computed.attendanceRate}% · Implication : {computed.implicationAverage.toFixed(2)}/5 · Comportement : {computed.professionalismAverage.toFixed(2)}/5
              </p>
            </div>

            <div className="card-root border border-stroke p-5 dark:border-white/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-body dark:text-body-dark">
                Moyenne finale pondérée
              </p>
              <p className={`mt-2 text-4xl font-bold ${computed.finalAverage >= 10 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {computed.finalAverage.toFixed(2)}
                <span className="text-base font-medium text-body">/20</span>
              </p>
              <p className="mt-2 text-xs text-body dark:text-body-dark">
                {computed.hasData ? 'Calculée à partir des résultats enregistrés.' : 'Aucune donnée disponible.'}
              </p>
            </div>
          </div>

          <div className="mb-6 card-root grid gap-4 border border-stroke p-5 dark:border-white/10 lg:grid-cols-2">
            <Field label="Décision finale" required>
              <Select
                value={decision}
                options={decisionOptions}
                onChange={(event) => setDecision(event.target.value)}
              />
            </Field>
            <Field label="Appréciation générale" className="lg:col-span-2">
              <Textarea
                rows={3}
                value={appreciation}
                onChange={(event) => setAppreciation(event.target.value)}
              />
            </Field>
            <div className="flex flex-wrap gap-3 lg:col-span-2">
              <Button onClick={() => void handleSave(false)} loading={saving} icon={<FiSave className="h-4 w-4" />}>
                Enregistrer
              </Button>
              <Button variant="outline" onClick={() => void handleSave(true)} loading={saving} icon={<FiCheckCircle className="h-4 w-4" />}>
                Valider et publier
              </Button>
            </div>
          </div>

          <div className="card-root border border-stroke dark:border-white/10">
            <div className="border-b border-stroke px-5 py-4 dark:border-white/10">
              <h2 className="text-sm font-bold text-black dark:text-white">Historique des évaluations finales</h2>
            </div>
            <DataTable
              columns={columns}
              rows={existing}
              loading={loading}
              onRetry={reload}
              emptyTitle="Aucune évaluation finale"
              emptyDescription="Enregistrez la première synthèse finale."
            />
          </div>
        </>
      )}
    </div>
  );
}
