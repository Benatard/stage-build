import { useMemo, useState } from 'react';
import {
  FiBell,
  FiCheck,
  FiCheckCircle,
  FiEdit3,
  FiExternalLink,
  FiFileText,
  FiPlus,
  FiSend,
} from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader, StatCard } from '@/components/ui/Feedback';
import { Field, Input, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { useScopedRows } from '@/hooks/useScopedRows';
import { dataService } from '@/services/data.service';
import type {
  AppNotification,
  QcmAttempt,
  QcmQuestion,
  StageJournal,
  TravauxPratique,
  TravauxSoumission,
} from '@/types/domain';
import { confirmAction, notifyError, notifySuccess } from '@/utils/alerts';
import { formatDate, formatDateTime, round, todayISO } from '@/utils/format';
import { SelfGate, SectionCard } from './StagiaireShared';
import { useSelfAcademic } from './useStagiaireSelf';

function optionText(option: unknown): string {
  if (typeof option === 'string') return option;
  if (option && typeof option === 'object') {
    const record = option as Record<string, unknown>;
    return String(record.label ?? record.value ?? record.text ?? '');
  }
  return String(option ?? '');
}

function normalizeAnswers(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim().toLowerCase());
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

export function StagiaireQcm() {
  const academic = useSelfAcademic();
  const stagiaireId = academic.stagiaireId;

  const { rows: attempts, loading, error, reload } = useScopedRows<QcmAttempt>('qcm_attempts', {
    scope: { stagiaire_id: stagiaireId },
    order: 'started_at.desc',
    enabled: Boolean(stagiaireId),
  });

  const [evaluationId, setEvaluationId] = useState('');
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [startedAt, setStartedAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const evaluation = academic.evaluations.find((item) => item.id === evaluationId);

  const { rows: questions, loading: questionsLoading } = useScopedRows<QcmQuestion>(
    'qcm_questions',
    {
      scope: { evaluation_id: evaluationId },
      order: 'sort_order.asc',
      enabled: Boolean(evaluationId),
    },
  );

  const qcmEvaluations = useMemo(
    () =>
      academic.evaluations
        .filter(
          (item) =>
            item.is_qcm && !['brouillon', 'archivee'].includes(item.status),
        )
        .sort((left, right) => (right.date ?? '').localeCompare(left.date ?? '')),
    [academic.evaluations],
  );

  const ownAttempts = (evaluationId: string) =>
    attempts.filter((attempt) => attempt.evaluation_id === evaluationId);

  const maxScore = questions.reduce((sum, question) => sum + (question.points ?? 0), 0);

  function openPassation(id: string) {
    setEvaluationId(id);
    setAnswers({});
    setStartedAt(new Date().toISOString());
  }

  function setAnswer(questionId: string, value: string | string[]) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  }

  function toggleMultiple(questionId: string, option: string) {
    setAnswers((current) => {
      const existing = Array.isArray(current[questionId])
        ? (current[questionId] as string[])
        : [];
      const next = existing.includes(option)
        ? existing.filter((item) => item !== option)
        : [...existing, option];
      return { ...current, [questionId]: next };
    });
  }

  async function submit() {
    if (!evaluation) return;
    if (!stagiaireId) {
      notifyError('Dossier stagiaire introuvable');
      return;
    }
    if (questions.length === 0) {
      notifyError('Aucune question', 'Ce QCM ne contient aucune question.');
      return;
    }

    const confirmed = await confirmAction({
      title: 'Soumettre le QCM',
      text: 'Votre copie sera corrigée automatiquement. Cette action est définitive.',
      confirmText: 'Soumettre',
    });
    if (!confirmed) return;

    setSubmitting(true);
    let score = 0;

    questions.forEach((question) => {
      const answer = answers[question.id];
      const expected = normalizeAnswers(question.correct_answer);
      if (answer === undefined || answer === null) return;

      if (question.type === 'multiple') {
        const selected = normalizeAnswers(answer);
        const isCorrect =
          selected.length === expected.length &&
          expected.every((item) => selected.includes(item));
        if (isCorrect) score += question.points;
        return;
      }

      const selected = String(answer).trim().toLowerCase();
      if (expected.length > 0 && expected.includes(selected)) {
        score += question.points;
      }
    });

    const percentage = maxScore > 0 ? round((score / maxScore) * 100, 2) : 0;
    const attemptNumber = ownAttempts(evaluation.id).length + 1;

    try {
      await dataService.createRow<QcmAttempt>('qcm_attempts', {
        evaluation_id: evaluation.id,
        stagiaire_id: stagiaireId,
        attempt_number: attemptNumber,
        started_at: startedAt || new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        score: round(score, 2),
        max_score: maxScore,
        percentage,
        passed: percentage >= 50,
        time_spent_seconds: startedAt
          ? Math.max(1, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000))
          : null,
        answers,
        status: 'corrige',
      });
      notifySuccess('QCM soumis', `Score : ${round(score, 2)}/${maxScore} (${percentage}%).`);
      setEvaluationId('');
      setAnswers({});
      reload();
    } catch {
      notifyError('Soumission impossible', 'Vos réponses n’ont pas pu être enregistrées.');
    } finally {
      setSubmitting(false);
    }
  }

  const columns: TableColumn<QcmAttempt>[] = [
    {
      key: 'evaluation',
      header: 'QCM',
      render: (row) => (
        <div>
          <p className="font-semibold text-black dark:text-white">
            {academic.evaluations.find((item) => item.id === row.evaluation_id)?.title ?? 'QCM'}
          </p>
          <p className="text-xs text-body dark:text-body-dark">
            Tentative n°{row.attempt_number} · {formatDateTime(row.submitted_at ?? row.started_at)}
          </p>
        </div>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      render: (row) => (
        <Badge tone={row.passed ? 'success' : 'danger'}>
          {row.score ?? '—'}/{row.max_score ?? '—'} ({row.percentage ?? 0}%)
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => (
        <Badge tone={statusTone(row.status)}>{row.status.replace('_', ' ')}</Badge>
      ),
    },
  ];

  return (
    <SelfGate loading={academic.loading || loading} error={academic.error ?? error} onRetry={academic.reload}>
      <PageHeader
        eyebrow="Ma scolarité"
        title="Mes QCM"
        description="Passez les questionnaires autorisés et consultez vos tentatives corrigées."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="QCM disponibles" value={qcmEvaluations.length} tone="primary" />
        <StatCard label="Tentatives" value={attempts.length} tone="purple" />
        <StatCard label="Réussies" value={attempts.filter((attempt) => attempt.passed).length} tone="success" />
      </div>

      <SectionCard title="Questionnaires disponibles" className="mb-5">
        {qcmEvaluations.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-body dark:text-body-dark">
            Aucun QCM disponible pour votre formation.
          </p>
        ) : (
          <div className="divide-y divide-stroke dark:divide-white/5">
            {qcmEvaluations.map((item) => {
              const itemAttempts = ownAttempts(item.id);
              const module = academic.modules.find((entry) => entry.id === item.module_id);
              return (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-black dark:text-white">{item.title}</p>
                    <p className="text-xs text-body dark:text-body-dark">
                      {module?.name ?? 'Module'} · {formatDate(item.date)} ·{' '}
                      {item.duration_minutes ?? 0} min · {itemAttempts.length} tentative(s)
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={itemAttempts.length > 0 ? 'outline' : 'primary'}
                    onClick={() => openPassation(item.id)}
                    icon={<FiEdit3 className="h-4 w-4" />}
                  >
                    {itemAttempts.length > 0 ? 'Repasser' : 'Passer le QCM'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Mes tentatives">
        <DataTable
          columns={columns}
          rows={attempts}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyTitle="Aucune tentative"
          emptyDescription="Vos résultats de QCM apparaîtront ici."
        />
      </SectionCard>

      <Modal
        open={Boolean(evaluationId)}
        onClose={() => setEvaluationId('')}
        title={evaluation?.title ?? 'Passation QCM'}
        description="Répondez à toutes les questions puis soumettez votre copie."
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setEvaluationId('')}>
              Annuler
            </Button>
            <Button
              onClick={() => void submit()}
              loading={submitting}
              disabled={questions.length === 0}
              icon={<FiCheckCircle className="h-4 w-4" />}
            >
              Soumettre
            </Button>
          </>
        }
      >
        {questionsLoading ? (
          <p className="py-10 text-center text-sm text-body dark:text-body-dark">
            Chargement des questions…
          </p>
        ) : questions.length === 0 ? (
          <p className="py-10 text-center text-sm text-body dark:text-body-dark">
            Aucune question dans ce QCM.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 text-xs text-body dark:text-body-dark">
              <Badge tone="primary">{questions.length} question(s)</Badge>
              <Badge tone="neutral">Barème {maxScore} points</Badge>
              <Badge tone="neutral">Durée {evaluation?.duration_minutes ?? 0} min</Badge>
            </div>
            {questions.map((question, index) => {
              const value = answers[question.id];
              const options =
                question.type === 'true_false' && question.options.length === 0
                  ? ['Vrai', 'Faux']
                  : question.options.map(optionText);

              return (
                <div key={question.id} className="border border-stroke p-4 dark:border-white/10">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-black dark:text-white">
                      {index + 1}. {question.question_text}
                    </p>
                    <Badge tone="neutral">{question.points} pt(s)</Badge>
                  </div>

                  {question.type === 'multiple' ? (
                    <div className="space-y-2">
                      {options.map((option) => (
                        <label key={option} className="flex cursor-pointer items-center gap-3 border border-stroke px-3 py-2.5 text-sm dark:border-white/10">
                          <input
                            type="checkbox"
                            checked={Array.isArray(value) && value.includes(option)}
                            onChange={() => toggleMultiple(question.id, option)}
                            className="h-4 w-4 text-primary focus:ring-primary/20"
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  ) : question.type === 'short_answer' ? (
                    <input
                      value={typeof value === 'string' ? value : ''}
                      onChange={(event) => setAnswer(question.id, event.target.value)}
                      placeholder="Votre réponse…"
                      className="w-full border border-stroke bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary dark:border-white/10 dark:bg-[#242936] dark:text-white"
                    />
                  ) : (
                    <div className="space-y-2">
                      {options.map((option) => (
                        <label key={option} className="flex cursor-pointer items-center gap-3 border border-stroke px-3 py-2.5 text-sm dark:border-white/10">
                          <input
                            type="radio"
                            name={question.id}
                            checked={value === option}
                            onChange={() => setAnswer(question.id, option)}
                            className="h-4 w-4 text-primary focus:ring-primary/20"
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </SelfGate>
  );
}

export function StagiaireTravaux() {
  const academic = useSelfAcademic();
  const stagiaireId = academic.stagiaireId;

  const { rows: travaux, loading, error } = useScopedRows<TravauxPratique>('travaux_pratiques', {
    scope: { status: 'publie' },
    order: 'deadline.asc',
  });
  const { rows: submissions, loading: submissionsLoading, error: submissionsError, reload } =
    useScopedRows<TravauxSoumission>('travaux_soumissions', {
      scope: { stagiaire_id: stagiaireId },
      order: 'submitted_at.desc',
      enabled: Boolean(stagiaireId),
    });

  const [selected, setSelected] = useState<TravauxPratique | null>(null);
  const [draft, setDraft] = useState({ file_url: '', file_name: '', link_url: '' });
  const [saving, setSaving] = useState(false);

  const ownTravaux = travaux.filter((tp) =>
    academic.modules.some((module) => module.id === tp.module_id),
  );

  const submissionFor = (tpId: string) =>
    submissions.find((submission) => submission.tp_id === tpId) ?? null;

  function openDeposit(tp: TravauxPratique) {
    const existing = submissionFor(tp.id);
    setDraft({
      file_url: existing?.file_url ?? '',
      file_name: existing?.file_name ?? '',
      link_url: existing?.link_url ?? '',
    });
    setSelected(tp);
  }

  async function deposit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !stagiaireId) return;
    if (!draft.file_url.trim() && !draft.link_url.trim()) {
      notifyError('Dépôt incomplet', 'Ajoutez un lien de fichier ou un lien externe.');
      return;
    }

    setSaving(true);
    try {
      const existing = submissionFor(selected.id);
      const payload = {
        tp_id: selected.id,
        stagiaire_id: stagiaireId,
        file_url: draft.file_url.trim() || null,
        file_name: draft.file_name.trim() || null,
        link_url: draft.link_url.trim() || null,
        submitted_at: new Date().toISOString(),
        status: 'soumis',
        score: null,
        feedback: null,
        graded_by: null,
        graded_at: null,
      };

      if (existing) {
        await dataService.updateRow<TravauxSoumission>('travaux_soumissions', existing.id, payload);
      } else {
        await dataService.createRow<TravauxSoumission>('travaux_soumissions', payload);
      }
      notifySuccess(existing ? 'Dépôt mis à jour' : 'Travail déposé');
      setSelected(null);
      reload();
    } catch {
      notifyError('Dépôt impossible');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SelfGate loading={academic.loading || loading || submissionsLoading} error={academic.error ?? error ?? submissionsError} onRetry={academic.reload}>
      <PageHeader
        eyebrow="Ma scolarité"
        title="Mes travaux pratiques"
        description="Consultez les TP publiés, déposez vos livrables et prenez connaissance des corrections publiées."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="TP disponibles" value={ownTravaux.length} tone="primary" />
        <StatCard label="Dépôts" value={submissions.length} tone="purple" />
        <StatCard label="Corrigés" value={submissions.filter((row) => ['corrige', 'valide'].includes(row.status)).length} tone="success" />
      </div>

      <SectionCard title="Travaux pratiques" className="mb-5">
        <DataTable
          columns={[
            {
              key: 'title',
              header: 'Travail pratique',
              render: (row) => (
                <div className="max-w-md">
                  <p className="font-semibold text-black dark:text-white">{row.title}</p>
                  <p className="text-xs text-body dark:text-body-dark">
                    {academic.modules.find((module) => module.id === row.module_id)?.name ?? 'Module'}
                  </p>
                </div>
              ),
            },
            { key: 'deadline', header: 'Échéance', hideBelow: 'md', render: (row) => formatDateTime(row.deadline) },
            { key: 'score', header: 'Barème', hideBelow: 'lg', render: (row) => `${row.max_score} pts · coef. ${row.coefficient}` },
            {
              key: 'status',
              header: 'Mon dépôt',
              render: (row) => {
                const submission = submissionFor(row.id);
                return submission ? (
                  <Badge tone={statusTone(submission.status)}>{submission.status.replace('_', ' ')}</Badge>
                ) : (
                  <Badge tone="warning">À déposer</Badge>
                );
              },
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (row) => {
                const submission = submissionFor(row.id);
                if (submission && submission.status !== 'a_refaire' && submission.status !== 'soumis') {
                  return (
                    <a href={submission.link_url ?? submission.file_url ?? '#'} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                      <FiExternalLink className="h-3.5 w-3.5" /> Mon dépôt
                    </a>
                  );
                }
                return (
                  <Button size="sm" variant="outline" onClick={() => openDeposit(row)} icon={<FiPlus className="h-4 w-4" />}>
                    {submission ? 'Mettre à jour' : 'Déposer'}
                  </Button>
                );
              },
            },
          ]}
          rows={ownTravaux}
          loading={loading}
          error={error}
          onRetry={academic.reload}
          emptyTitle="Aucun travail pratique"
          emptyDescription="Les TP publiés pour votre formation apparaîtront ici."
        />
      </SectionCard>

      <SectionCard title="Mes dépôts et corrections">
        <DataTable
          columns={[
            {
              key: 'tp',
              header: 'Travail',
              render: (row) => (
                <div>
                  <p className="font-semibold text-black dark:text-white">
                    {ownTravaux.find((tp) => tp.id === row.tp_id)?.title ?? 'Travail pratique'}
                  </p>
                  <p className="text-xs text-body dark:text-body-dark">{formatDateTime(row.submitted_at)}</p>
                </div>
              ),
            },
            {
              key: 'file',
              header: 'Dépôt',
              hideBelow: 'md',
              render: (row) =>
                row.link_url || row.file_url ? (
                  <a href={row.link_url ?? row.file_url ?? '#'} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {row.link_url ? 'Lien externe' : row.file_name ?? 'Fichier'}
                  </a>
                ) : (
                  '—'
                ),
            },
            { key: 'score', header: 'Note', hideBelow: 'md', render: (row) => (row.score !== null && row.score !== undefined ? `${row.score}/20` : '—') },
            {
              key: 'status',
              header: 'Statut',
              render: (row) => (
                <Badge tone={statusTone(row.status)}>{row.status.replace('_', ' ')}</Badge>
              ),
            },
            { key: 'feedback', header: 'Appréciation', hideBelow: 'lg', render: (row) => row.feedback ?? '—' },
          ]}
          rows={submissions}
          loading={submissionsLoading}
          error={submissionsError}
          onRetry={reload}
          emptyTitle="Aucun dépôt"
          emptyDescription="Vos dépôts et corrections apparaîtront ici."
        />
      </SectionCard>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.title ?? 'Déposer un travail'}
        description="Ajoutez un lien vers votre fichier ou un lien externe. Le dépôt remplace votre envoi précédent."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setSelected(null)}>Annuler</Button>
            <Button type="submit" form="travaux-form" loading={saving} icon={<FiSend className="h-4 w-4" />}>
              Déposer
            </Button>
          </>
        }
      >
        <form id="travaux-form" onSubmit={deposit} className="grid gap-4 sm:grid-cols-2">
          <Field label="URL du fichier" className="sm:col-span-2">
            <Input
              value={draft.file_url}
              placeholder="https://…"
              onChange={(event) => setDraft((current) => ({ ...current, file_url: event.target.value }))}
            />
          </Field>
          <Field label="Nom du fichier">
            <Input
              value={draft.file_name}
              placeholder="rapport.pdf"
              onChange={(event) => setDraft((current) => ({ ...current, file_name: event.target.value }))}
            />
          </Field>
          <Field label="Lien externe">
            <Input
              value={draft.link_url}
              placeholder="https://…"
              onChange={(event) => setDraft((current) => ({ ...current, link_url: event.target.value }))}
            />
          </Field>
          {selected?.deliverables && selected.deliverables.length > 0 && (
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-body dark:text-body-dark">
                Livrables attendus
              </p>
              <p className="mt-1 text-sm text-body dark:text-body-dark">
                {selected.deliverables.join(', ')}
              </p>
            </div>
          )}
        </form>
      </Modal>
    </SelfGate>
  );
}

type JournalDraft = {
  date: string;
  activity: string;
  competence: string;
  duration_hours: string;
  observation: string;
};

export function StagiaireJournal() {
  const academic = useSelfAcademic();
  const stagiaireId = academic.stagiaireId;
  const { rows, loading, error, reload } = useScopedRows<StageJournal>('stage_journal', {
    scope: { stagiaire_id: stagiaireId },
    order: 'date.desc',
    enabled: Boolean(stagiaireId),
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StageJournal | null>(null);
  const [draft, setDraft] = useState<JournalDraft>({
    date: todayISO(),
    activity: '',
    competence: '',
    duration_hours: '',
    observation: '',
  });
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setDraft({
      date: todayISO(),
      activity: '',
      competence: '',
      duration_hours: '',
      observation: '',
    });
    setModalOpen(true);
  }

  function openEdit(entry: StageJournal) {
    setEditing(entry);
    setDraft({
      date: entry.date,
      activity: entry.activity,
      competence: entry.competence ?? '',
      duration_hours: entry.duration_hours !== null && entry.duration_hours !== undefined ? String(entry.duration_hours) : '',
      observation: entry.observation ?? '',
    });
    setModalOpen(true);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stagiaireId) return;
    setSaving(true);

    const payload = {
      stagiaire_id: stagiaireId,
      date: draft.date,
      activity: draft.activity.trim(),
      competence: draft.competence.trim() || null,
      duration_hours: draft.duration_hours ? Number(draft.duration_hours) : null,
      observation: draft.observation.trim() || null,
      status: 'soumis',
      validated_by: null,
      comment: null,
    };

    try {
      if (editing) {
        await dataService.updateRow<StageJournal>('stage_journal', editing.id, payload);
        notifySuccess('Entrée du journal mise à jour');
      } else {
        await dataService.createRow<StageJournal>('stage_journal', payload);
        notifySuccess('Entrée ajoutée au journal');
      }
      setModalOpen(false);
      reload();
    } catch {
      notifyError('Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  const ownEntries = rows.filter((entry) => entry.stagiaire_id === stagiaireId);

  return (
    <SelfGate loading={academic.loading || loading} error={academic.error ?? error} onRetry={academic.reload}>
      <PageHeader
        eyebrow="Mon suivi"
        title="Mon journal de stage"
        description="Consignez vos activités. Une entrée reste modifiable tant qu’elle n’est pas validée."
        actions={
          <Button onClick={openCreate} icon={<FiPlus className="h-4 w-4" />}>
            Nouvelle entrée
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Entrées" value={ownEntries.length} tone="primary" icon={<FiFileText className="h-4 w-4" />} />
        <StatCard label="Validées" value={ownEntries.filter((entry) => entry.status === 'valide').length} tone="success" />
        <StatCard label="En attente" value={ownEntries.filter((entry) => entry.status === 'soumis').length} tone="warning" />
      </div>

      <SectionCard title="Mes activités">
        <DataTable
          columns={[
            { key: 'date', header: 'Date', render: (row) => formatDate(row.date) },
            {
              key: 'activity',
              header: 'Activité',
              render: (row) => (
                <div className="max-w-md">
                  <p className="font-medium text-black dark:text-white">{row.activity}</p>
                  <p className="text-xs text-body dark:text-body-dark">{row.competence ?? '—'}</p>
                </div>
              ),
            },
            { key: 'duration', header: 'Durée', hideBelow: 'md', render: (row) => (row.duration_hours ? `${row.duration_hours} h` : '—') },
            {
              key: 'status',
              header: 'Statut',
              render: (row) => (
                <Badge tone={statusTone(row.status)}>{row.status.replace('_', ' ')}</Badge>
              ),
            },
            {
              key: 'comment',
              header: 'Commentaire',
              hideBelow: 'lg',
              render: (row) => row.comment ?? '—',
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (row) =>
                row.status !== 'valide' ? (
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <FiEdit3 className="h-3.5 w-3.5" /> Modifier
                  </button>
                ) : null,
            },
          ]}
          rows={ownEntries}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyTitle="Journal vide"
          emptyDescription="Ajoutez votre première activité de stage."
        />
      </SectionCard>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier l’entrée' : 'Nouvelle entrée'}
        description="L’entrée sera transmise pour validation."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" form="journal-form" loading={saving}>Enregistrer</Button>
          </>
        }
      >
        <form id="journal-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" required>
            <Input
              type="date"
              required
              value={draft.date}
              onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
            />
          </Field>
          <Field label="Durée (heures)">
            <Input
              type="number"
              min={0}
              step={0.5}
              value={draft.duration_hours}
              onChange={(event) => setDraft((current) => ({ ...current, duration_hours: event.target.value }))}
            />
          </Field>
          <Field label="Activité réalisée" required className="sm:col-span-2">
            <Textarea
              required
              rows={4}
              value={draft.activity}
              onChange={(event) => setDraft((current) => ({ ...current, activity: event.target.value }))}
            />
          </Field>
          <Field label="Compétence mobilisée">
            <Input
              value={draft.competence}
              onChange={(event) => setDraft((current) => ({ ...current, competence: event.target.value }))}
            />
          </Field>
          <Field label="Observation">
            <Input
              value={draft.observation}
              onChange={(event) => setDraft((current) => ({ ...current, observation: event.target.value }))}
            />
          </Field>
        </form>
      </Modal>
    </SelfGate>
  );
}

export function StagiaireNotifications() {
  const self = useSelfAcademic();
  const { user, stagiaireId } = self;

  const { rows: userNotifications, loading: userLoading, error: userError, reload: reloadUser } =
    useScopedRows<AppNotification>('notifications', {
      scope: { user_id: user?.id ?? '' },
      order: 'created_at.desc',
      enabled: Boolean(user?.id),
    });
  const { rows: stagiaireNotifications, loading: stagiaireLoading, error: stagiaireError, reload: reloadStagiaire } =
    useScopedRows<AppNotification>('notifications', {
      scope: { stagiaire_id: stagiaireId },
      order: 'created_at.desc',
      enabled: Boolean(stagiaireId),
    });

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const rows = useMemo(() => {
    const map = new Map<string, AppNotification>();
    [...userNotifications, ...stagiaireNotifications].forEach((notification) => {
      map.set(notification.id, notification);
    });
    return Array.from(map.values()).sort((left, right) =>
      (right.created_at ?? '').localeCompare(left.created_at ?? ''),
    );
  }, [userNotifications, stagiaireNotifications]);

  const visible = rows.filter((notification) => filter === 'all' || notification.status === 'unread');
  const unread = rows.filter((notification) => notification.status === 'unread').length;

  async function markRead(notification: AppNotification) {
    try {
      await dataService.updateRow<AppNotification>('notifications', notification.id, {
        status: 'read',
        read_at: new Date().toISOString(),
      });
      reloadUser();
      reloadStagiaire();
    } catch {
      notifyError('Mise à jour impossible');
    }
  }

  async function markAllRead() {
    for (const notification of rows.filter((item) => item.status === 'unread')) {
      try {
        await dataService.updateRow<AppNotification>('notifications', notification.id, {
          status: 'read',
          read_at: new Date().toISOString(),
        });
      } catch {
        notifyError('Mise à jour partielle');
      }
    }
    reloadUser();
    reloadStagiaire();
    notifySuccess('Notifications marquées comme lues');
  }

  return (
    <SelfGate loading={self.loading || userLoading || stagiaireLoading} error={self.error ?? userError ?? stagiaireError} onRetry={self.reload}>
      <PageHeader
        eyebrow="Mon espace"
        title="Mes notifications"
        description="Retrouvez uniquement les notifications qui vous sont destinées."
        actions={
          <Button variant="outline" onClick={() => void markAllRead()} disabled={unread === 0} icon={<FiCheckCircle className="h-4 w-4" />}>
            Tout marquer comme lu
          </Button>
        }
      />

      <div className="mb-5 flex gap-1 border-b border-stroke dark:border-white/10">
        {[
          { key: 'all' as const, label: `Toutes (${rows.length})` },
          { key: 'unread' as const, label: `Non lues (${unread})` },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              filter === item.key
                ? 'border-primary text-primary'
                : 'border-transparent text-body hover:text-dark dark:text-body-dark dark:hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card-root flex flex-col items-center border border-stroke px-6 py-20 text-center dark:border-white/10">
          <FiBell className="mb-3 h-8 w-8 text-body dark:text-body-dark" />
          <p className="text-sm font-semibold text-black dark:text-white">Aucune notification</p>
          <p className="mt-1 text-xs text-body dark:text-body-dark">
            Les nouvelles notifications apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((notification) => (
            <div
              key={notification.id}
              className={`card-root flex flex-wrap items-start justify-between gap-4 border p-4 dark:border-white/10 ${
                notification.status === 'unread'
                  ? 'border-primary/30 bg-primary/[0.02]'
                  : 'border-stroke'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-black dark:text-white">{notification.title}</p>
                  {notification.status === 'unread' && <span className="h-2 w-2 rounded-full bg-primary" />}
                  <Badge tone={statusTone(notification.type)}>{notification.type}</Badge>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-body dark:text-body-dark">
                  {notification.message}
                </p>
                <p className="mt-2 text-[11px] text-body dark:text-body-dark">
                  {formatDateTime(notification.created_at)}
                </p>
              </div>
              {notification.status === 'unread' && (
                <button
                  type="button"
                  onClick={() => void markRead(notification)}
                  className="flex h-8 w-8 items-center justify-center text-body hover:bg-emerald-50 hover:text-emerald-600 dark:text-body-dark"
                  title="Marquer comme lu"
                >
                  <FiCheck className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </SelfGate>
  );
}
