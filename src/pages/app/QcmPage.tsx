import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiBarChart2,
  FiEdit2,
  FiList,
  FiPlay,
  FiPlus,
  FiTrash2,
} from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader, StatCard } from '@/components/ui/Feedback';
import { Field, Input, Select, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { useForgeTable } from '@/hooks/useForgeTable';
import { useReferenceData } from '@/hooks/useReferenceData';
import { dataService } from '@/services/data.service';
import type { QcmAttempt, QcmQuestion } from '@/types/domain';
import { confirmDelete, notifyError, notifySuccess } from '@/utils/alerts';
import { formatDate, formatDateTime, fullName, percentage } from '@/utils/format';
import { buildOptions } from '@/utils/options';

const questionTypeOptions = [
  { value: 'single', label: 'Choix unique' },
  { value: 'multiple', label: 'Choix multiple' },
  { value: 'true_false', label: 'Vrai / Faux' },
  { value: 'short_answer', label: 'Réponse courte' },
  { value: 'matching', label: 'Association' },
];

type QuestionDraft = {
  question_text: string;
  type: string;
  options: string;
  correct_answer: string;
  points: string;
  sort_order: string;
};

const emptyDraft: QuestionDraft = {
  question_text: '',
  type: 'single',
  options: '',
  correct_answer: '',
  points: '1',
  sort_order: '0',
};

export default function QcmPage() {
  const { data } = useReferenceData();
  const navigate = useNavigate();
  const [evaluationId, setEvaluationId] = useState('');
  const [tab, setTab] = useState<'questions' | 'attempts'>('questions');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QcmQuestion | null>(null);
  const [draft, setDraft] = useState<QuestionDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const qcmEvaluations = useMemo(
    () => data.evaluations.filter((evaluation) => evaluation.is_qcm),
    [data.evaluations],
  );

  const evaluation = qcmEvaluations.find((item) => item.id === evaluationId);

  const { rows: questions, loading: questionsLoading, error: questionsError, reload: reloadQuestions } =
    useForgeTable<QcmQuestion>('qcm_questions', {
      filters: { evaluation_id: evaluationId },
      order: 'sort_order.asc',
      enabled: Boolean(evaluationId),
    });

  const { rows: attempts, loading: attemptsLoading, reload: reloadAttempts } =
    useForgeTable<QcmAttempt>('qcm_attempts', {
      filters: { evaluation_id: evaluationId },
      order: 'started_at.desc',
      enabled: Boolean(evaluationId),
    });

  const evaluationOptions = useMemo(
    () =>
      buildOptions(qcmEvaluations, (item) => `${item.title} — ${formatDate(item.date)}`),
    [qcmEvaluations],
  );

  useEffect(() => {
    if (qcmEvaluations.length > 0 && !evaluationId) {
      setEvaluationId(qcmEvaluations[0].id);
    }
  }, [qcmEvaluations, evaluationId]);

  const stats = useMemo(() => {
    const corrected = attempts.filter((attempt) => attempt.status === 'corrige');
    const average = corrected.length
      ? corrected.reduce((sum, attempt) => sum + (attempt.score ?? 0), 0) / corrected.length
      : 0;
    const passed = corrected.filter((attempt) => attempt.passed).length;
    return { total: attempts.length, corrected: corrected.length, average, passed };
  }, [attempts]);

  function openCreate() {
    setEditing(null);
    const nextOrder = questions.length
      ? Math.max(...questions.map((question) => question.sort_order)) + 1
      : 0;
    setDraft({ ...emptyDraft, sort_order: String(nextOrder) });
    setModalOpen(true);
  }

  function openEdit(question: QcmQuestion) {
    setEditing(question);
    setDraft({
      question_text: question.question_text,
      type: question.type,
      options: question.options
        .map((option) =>
          typeof option === 'string' ? option : String((option as { label?: string }).label ?? ''),
        )
        .join('\n'),
      correct_answer: Array.isArray(question.correct_answer)
        ? question.correct_answer.join(', ')
        : String(question.correct_answer ?? ''),
      points: String(question.points),
      sort_order: String(question.sort_order),
    });
    setModalOpen(true);
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!evaluationId) return;

    const options =
      draft.type === 'true_false' && !draft.options.trim()
        ? ['Vrai', 'Faux']
        : draft.options
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);

    if (['single', 'multiple', 'true_false'].includes(draft.type) && options.length < 2) {
      notifyError('Options insuffisantes', 'Ajoutez au moins deux options, une par ligne.');
      return;
    }

    const correctAnswer =
      draft.type === 'multiple'
        ? draft.correct_answer.split(',').map((item) => item.trim()).filter(Boolean)
        : draft.correct_answer.trim();

    const payload = {
      evaluation_id: evaluationId,
      question_text: draft.question_text.trim(),
      type: draft.type,
      options,
      correct_answer: correctAnswer,
      points: Number(draft.points) || 1,
      sort_order: Number(draft.sort_order) || 0,
    };

    setSaving(true);

    try {
      if (editing) {
        await dataService.updateRow<QcmQuestion>('qcm_questions', editing.id, payload);
        notifySuccess('Question mise à jour');
      } else {
        await dataService.createRow<QcmQuestion>('qcm_questions', payload);
        notifySuccess('Question créée');
      }
      setModalOpen(false);
      reloadQuestions();
    } catch {
      notifyError('Enregistrement impossible', 'Vérifiez les champs de la question.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(question: QcmQuestion) {
    const confirmed = await confirmDelete(question.question_text.slice(0, 60));
    if (!confirmed) return;
    try {
      await dataService.deleteRow('qcm_questions', question.id);
      notifySuccess('Question supprimée');
      reloadQuestions();
    } catch {
      notifyError('Suppression impossible');
    }
  }

  const questionColumns: TableColumn<QcmQuestion>[] = [
    {
      key: 'question',
      header: 'Question',
      render: (row) => (
        <div className="max-w-md">
          <p className="font-medium text-black dark:text-white">{row.question_text}</p>
          <p className="mt-1 text-xs text-body dark:text-body-dark">
            {row.options.length} option(s) · {row.points} point(s)
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      hideBelow: 'md',
      render: (row) =>
        questionTypeOptions.find((option) => option.value === row.type)?.label ?? row.type,
    },
    {
      key: 'answer',
      header: 'Réponse correcte',
      hideBelow: 'lg',
      render: (row) =>
        Array.isArray(row.correct_answer)
          ? row.correct_answer.join(', ')
          : String(row.correct_answer ?? '—'),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="flex h-8 w-8 items-center justify-center text-body hover:bg-primary/10 hover:text-primary dark:text-body-dark"
            title="Modifier"
          >
            <FiEdit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void handleDelete(row)}
            className="flex h-8 w-8 items-center justify-center text-body hover:bg-rose-50 hover:text-rose-600 dark:text-body-dark dark:hover:bg-rose-500/10"
            title="Supprimer"
          >
            <FiTrash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const attemptColumns: TableColumn<QcmAttempt>[] = [
    {
      key: 'stagiaire',
      header: 'Stagiaire',
      render: (row) => (
        <div>
          <p className="font-semibold text-black dark:text-white">
            {fullName(data.stagiaires.find((item) => item.id === row.stagiaire_id))}
          </p>
          <p className="text-xs text-body dark:text-body-dark">
            Tentative n°{row.attempt_number} · {formatDateTime(row.started_at)}
          </p>
        </div>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      render: (row) =>
        row.score !== null && row.score !== undefined ? (
          <div>
            <p className="font-semibold">
              {row.score}/{row.max_score ?? '—'}
            </p>
            <p className="text-xs text-body dark:text-body-dark">
              {row.percentage !== null && row.percentage !== undefined
                ? `${row.percentage}%`
                : '—'}
            </p>
          </div>
        ) : (
          '—'
        ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => (
        <Badge tone={statusTone(row.status)}>{row.status.replace('_', ' ')}</Badge>
      ),
    },
    {
      key: 'passed',
      header: 'Réussi',
      render: (row) =>
        row.passed === null || row.passed === undefined ? (
          '—'
        ) : row.passed ? (
          <Badge tone="success">Oui</Badge>
        ) : (
          <Badge tone="danger">Non</Badge>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Évaluations"
        title="Questionnaires QCM"
        description="Construisez des QCM, lancez les passations et consultez les résultats corrigés automatiquement."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setTab('attempts')}
              icon={<FiBarChart2 className="h-4 w-4" />}
            >
              Résultats
            </Button>
            <Button
              onClick={() => (evaluationId ? openCreate() : notifyError('Sélectionnez un QCM'))}
              disabled={!evaluationId}
              icon={<FiPlus className="h-4 w-4" />}
            >
              Nouvelle question
            </Button>
            <Button
              onClick={() => evaluationId && navigate(`/app/qcm/${evaluationId}/passer`)}
              disabled={!evaluationId || questions.length === 0}
              icon={<FiPlay className="h-4 w-4" />}
            >
              Lancer une passation
            </Button>
          </>
        }
      />

      <div className="mb-5 card-root border border-stroke p-5 dark:border-white/10">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-body dark:text-body-dark">
          Questionnaire
        </label>
        <Select
          value={evaluationId}
          placeholder="Sélectionner un QCM…"
          options={evaluationOptions}
          onChange={(event) => setEvaluationId(event.target.value)}
        />
        {evaluation && (
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-body dark:text-body-dark">
            <span>Module : <strong className="text-dark dark:text-white">{data.modules.find((module) => module.id === evaluation.module_id)?.name ?? '—'}</strong></span>
            <span>Barème : <strong className="text-dark dark:text-white">{evaluation.max_score} pts</strong></span>
            <span>Durée : <strong className="text-dark dark:text-white">{evaluation.duration_minutes ?? 0} min</strong></span>
            <Badge tone={statusTone(evaluation.status)}>{evaluation.status.replace('_', ' ')}</Badge>
          </div>
        )}
        {qcmEvaluations.length === 0 && (
          <p className="mt-3 text-sm text-amber-600">
            Aucune évaluation n’est marquée comme QCM. Créez-en une dans le module Évaluations en cochant « Cette évaluation est un QCM ».
          </p>
        )}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Questions" value={questions.length} tone="primary" icon={<FiList className="h-4 w-4" />} />
        <StatCard label="Passations" value={stats.total} tone="purple" />
        <StatCard label="Corrigées" value={stats.corrected} tone="success" />
        <StatCard label="Moyenne" value={stats.corrected ? stats.average.toFixed(2) : '—'} tone="warning" />
      </div>

      <div className="mb-4 flex gap-1 border-b border-stroke dark:border-white/10">
        {[
          { key: 'questions' as const, label: 'Questions' },
          { key: 'attempts' as const, label: 'Passations' },
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
        {tab === 'questions' ? (
          <DataTable
            columns={questionColumns}
            rows={questions}
            loading={questionsLoading}
            error={questionsError}
            onRetry={reloadQuestions}
            emptyTitle="Aucune question"
            emptyDescription="Ajoutez la première question de ce QCM."
            emptyAction={
              <Button size="sm" onClick={openCreate} icon={<FiPlus className="h-4 w-4" />}>
                Ajouter une question
              </Button>
            }
          />
        ) : (
          <DataTable
            columns={attemptColumns}
            rows={attempts}
            loading={attemptsLoading}
            onRetry={reloadAttempts}
            footer={
              <p className="text-xs text-body dark:text-body-dark">
                Taux de réussite : {percentage(stats.passed, Math.max(stats.corrected, 1))}% sur {stats.corrected} copie(s) corrigée(s).
              </p>
            }
            emptyTitle="Aucune passation"
            emptyDescription="Lancez une passation pour recueillir les réponses des stagiaires."
          />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier la question' : 'Nouvelle question'}
        description="Les options doivent être saisies une par ligne."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" form="question-form" loading={saving}>
              {editing ? 'Enregistrer' : 'Créer la question'}
            </Button>
          </>
        }
      >
        <form id="question-form" onSubmit={handleSave} className="space-y-4">
          <Field label="Question" required>
            <Textarea
              required
              rows={3}
              value={draft.question_text}
              onChange={(event) => setDraft((current) => ({ ...current, question_text: event.target.value }))}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Type" required>
              <Select
                value={draft.type}
                options={questionTypeOptions}
                onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))}
              />
            </Field>
            <Field label="Points" required>
              <Input
                type="number"
                min={0.5}
                step={0.5}
                value={draft.points}
                onChange={(event) => setDraft((current) => ({ ...current, points: event.target.value }))}
              />
            </Field>
            <Field label="Ordre">
              <Input
                type="number"
                min={0}
                value={draft.sort_order}
                onChange={(event) => setDraft((current) => ({ ...current, sort_order: event.target.value }))}
              />
            </Field>
          </div>
          <Field label="Options" hint="Une option par ligne. Laissez vide pour Vrai/Faux.">
            <Textarea
              rows={4}
              value={draft.options}
              onChange={(event) => setDraft((current) => ({ ...current, options: event.target.value }))}
            />
          </Field>
          <Field
            label="Réponse correcte"
            required
            hint="Choix multiple : séparez les réponses par des virgules."
          >
            <Input
              required
              value={draft.correct_answer}
              onChange={(event) => setDraft((current) => ({ ...current, correct_answer: event.target.value }))}
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
