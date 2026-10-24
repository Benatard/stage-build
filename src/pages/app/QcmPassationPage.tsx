import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCheckCircle, FiClock } from 'react-icons/fi';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/Feedback';
import { Field, Select } from '@/components/ui/Form';
import { useAuth } from '@/context/AuthContext';
import { useForgeTable } from '@/hooks/useForgeTable';
import { useReferenceData } from '@/hooks/useReferenceData';
import { dataService } from '@/services/data.service';
import type { QcmAttempt, QcmQuestion } from '@/types/domain';
import { confirmAction, notifyError, notifySuccess } from '@/utils/alerts';
import { formatDate, fullName, round } from '@/utils/format';

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

export default function QcmPassationPage() {
  const { evaluationId = '' } = useParams();
  const navigate = useNavigate();
  const { data } = useReferenceData();
  const { user } = useAuth();
  const [stagiaireId, setStagiaireId] = useState(user?.stagiaire_id ?? '');
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [startedAt] = useState(() => new Date().toISOString());

  const evaluation = data.evaluations.find((item) => item.id === evaluationId);

  const { rows: questions, loading } = useForgeTable<QcmQuestion>('qcm_questions', {
    filters: { evaluation_id: evaluationId },
    order: 'sort_order.asc',
    enabled: Boolean(evaluationId),
  });

  const { rows: attempts } = useForgeTable<QcmAttempt>('qcm_attempts', {
    filters: { evaluation_id: evaluationId },
    enabled: Boolean(evaluationId),
  });

  const maxScore = useMemo(
    () => questions.reduce((sum, question) => sum + (question.points ?? 0), 0),
    [questions],
  );

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

  async function handleSubmit() {
    if (!evaluation) return;
    if (!stagiaireId) {
      notifyError('Sélectionnez un stagiaire');
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
    const attemptNumber =
      attempts.filter((attempt) => attempt.stagiaire_id === stagiaireId).length + 1;

    try {
      await dataService.createRow<QcmAttempt>('qcm_attempts', {
        evaluation_id: evaluationId,
        stagiaire_id: stagiaireId,
        attempt_number: attemptNumber,
        started_at: startedAt,
        submitted_at: new Date().toISOString(),
        score: round(score, 2),
        max_score: maxScore,
        percentage,
        passed: percentage >= 50,
        time_spent_seconds: Math.max(
          1,
          Math.round((Date.now() - new Date(startedAt).getTime()) / 1000),
        ),
        answers,
        status: 'corrige',
      });

      notifySuccess(
        'QCM soumis',
        `Score : ${round(score, 2)}/${maxScore} (${percentage}%).`,
      );
      navigate('/app/qcm');
    } catch {
      notifyError('Soumission impossible', 'Vos réponses n’ont pas pu être enregistrées.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!evaluation) {
    return (
      <div>
        <PageHeader title="QCM introuvable" description="Le questionnaire demandé n’existe pas ou a été supprimé." />
        <Link to="/app/qcm">
          <Button variant="outline" icon={<FiArrowLeft className="h-4 w-4" />}>
            Retour aux QCM
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Passation QCM"
        title={evaluation.title}
        description={`${evaluation.instructions ?? 'Répondez à toutes les questions puis soumettez votre copie.'} Barème : ${maxScore} points.`}
        actions={
          <Link to="/app/qcm">
            <Button variant="outline" icon={<FiArrowLeft className="h-4 w-4" />}>
              Quitter
            </Button>
          </Link>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-4 text-xs text-body dark:text-body-dark">
        <span className="flex items-center gap-1.5">
          <FiClock className="h-4 w-4" />
          Durée prévue : {evaluation.duration_minutes ?? 0} min
        </span>
        <span>Date : {formatDate(evaluation.date)}</span>
        <Badge tone="primary">{questions.length} question(s)</Badge>
      </div>

      <div className="mb-5 card-root border border-stroke p-5 dark:border-white/10">
        <Field label="Stagiaire concerné" required>
          <Select
            value={stagiaireId}
            placeholder="Sélectionner le stagiaire…"
            options={data.stagiaires.map((stagiaire) => ({
              value: stagiaire.id,
              label: `${fullName(stagiaire)} (${stagiaire.matricule})`,
            }))}
            onChange={(event) => setStagiaireId(event.target.value)}
          />
        </Field>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-body dark:text-body-dark">
          Chargement des questions…
        </p>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => {
            const value = answers[question.id];
            const options =
              question.type === 'true_false' && question.options.length === 0
                ? ['Vrai', 'Faux']
                : question.options.map(optionText);

            return (
              <div key={question.id} className="card-root border border-stroke p-5 dark:border-white/10">
                <div className="mb-4 flex items-start justify-between gap-4">
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

      <div className="mt-6 flex justify-end gap-3">
        <Button
          size="lg"
          onClick={() => void handleSubmit()}
          loading={submitting}
          disabled={questions.length === 0}
          icon={<FiCheckCircle className="h-5 w-5" />}
        >
          Soumettre le QCM
        </Button>
      </div>
    </div>
  );
}
