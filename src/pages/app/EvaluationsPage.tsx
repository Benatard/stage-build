import { useMemo } from 'react';
import { Badge, statusTone } from '@/components/ui/Badge';
import { EntityManager } from '@/components/ui/EntityManager';
import {
  EVALUATION_STATUS_OPTIONS,
  EVALUATION_TYPE_OPTIONS,
  optionLabel,
} from '@/config/options';
import { useReferenceData } from '@/hooks/useReferenceData';
import type { Evaluation } from '@/types/domain';
import { formatDate, fullName } from '@/utils/format';
import { buildOptions } from '@/utils/options';

export default function EvaluationsPage() {
  const { data } = useReferenceData();

  const formationOptions = useMemo(
    () => buildOptions(data.formations, (formation) => formation.name),
    [data.formations],
  );
  const moduleOptions = useMemo(
    () => buildOptions(data.modules, (module) => module.name),
    [data.modules],
  );
  const formateurOptions = useMemo(
    () =>
      buildOptions(
        data.users.filter((item) => ['formateur', 'responsable_pedagogique'].includes(item.role)),
        (item) => fullName(item),
      ),
    [data.users],
  );

  return (
    <EntityManager<Evaluation>
      table="evaluations"
      eyebrow="Évaluations"
      title="Évaluations"
      description="Planifiez les interrogations, examens, QCM, travaux pratiques et évaluations finales."
      createLabel="Nouvelle évaluation"
      order="date.desc"
      rowLabel={(row) => row.title}
      searchPlaceholder="Rechercher une évaluation, un module…"
      searchFields={(row) => {
        const module = data.modules.find((item) => item.id === row.module_id);
        const formation = data.formations.find((item) => item.id === row.formation_id);
        return [row.title, row.type, module?.name, formation?.name, row.period]
          .filter(Boolean)
          .join(' ');
      }}
      columns={[
        {
          key: 'title',
          header: 'Évaluation',
          render: (row) => (
            <div>
              <p className="font-semibold text-black dark:text-white">{row.title}</p>
              <p className="text-xs text-body dark:text-body-dark">
                {optionLabel(EVALUATION_TYPE_OPTIONS, row.type)} ·{' '}
                {data.modules.find((item) => item.id === row.module_id)?.name ?? 'Sans module'}
              </p>
            </div>
          ),
        },
        { key: 'date', header: 'Date', hideBelow: 'md', render: (row) => formatDate(row.date) },
        {
          key: 'grading',
          header: 'Barème',
          hideBelow: 'lg',
          render: (row) => `${row.max_score} pts · coef. ${row.coefficient}`,
        },
        {
          key: 'status',
          header: 'Statut',
          render: (row) => (
            <Badge tone={statusTone(row.status)}>
              {optionLabel(EVALUATION_STATUS_OPTIONS, row.status)}
            </Badge>
          ),
        },
      ]}
      fields={[
        { name: 'title', label: 'Titre de l’évaluation', type: 'text', required: true, fullWidth: true },
        { name: 'formation_id', label: 'Formation', type: 'select', options: formationOptions },
        { name: 'module_id', label: 'Module', type: 'select', options: moduleOptions },
        { name: 'formateur_id', label: 'Formateur', type: 'select', options: formateurOptions },
        { name: 'type', label: 'Type', type: 'select', options: EVALUATION_TYPE_OPTIONS, required: true, defaultValue: 'devoir' },
        { name: 'date', label: 'Date', type: 'date', required: true },
        { name: 'duration_minutes', label: 'Durée (minutes)', type: 'number', min: 0 },
        { name: 'max_score', label: 'Note maximale', type: 'number', min: 0, required: true, defaultValue: '20' },
        { name: 'coefficient', label: 'Coefficient', type: 'number', min: 0, step: 0.5, required: true, defaultValue: '1' },
        { name: 'weight', label: 'Poids (%)', type: 'number', min: 0, max: 100, defaultValue: '100' },
        { name: 'period', label: 'Période', type: 'text', placeholder: 'Semestre 1' },
        { name: 'status', label: 'Statut', type: 'select', options: EVALUATION_STATUS_OPTIONS, required: true, defaultValue: 'brouillon' },
        { name: 'is_qcm', label: 'Cette évaluation est un QCM', type: 'checkbox' },
        { name: 'feeds_gradebook', label: 'Compte dans la moyenne', type: 'checkbox', defaultValue: true },
        { name: 'instructions', label: 'Consignes', type: 'textarea', fullWidth: true, rows: 5 },
      ]}
      transform={(values) => ({
        title: String(values.title ?? '').trim(),
        formation_id: values.formation_id || null,
        module_id: values.module_id || null,
        formateur_id: values.formateur_id || null,
        type: values.type || 'devoir',
        date: values.date || null,
        duration_minutes: values.duration_minutes ? Number(values.duration_minutes) : null,
        max_score: values.max_score ? Number(values.max_score) : 20,
        coefficient: values.coefficient ? Number(values.coefficient) : 1,
        weight: values.weight ? Number(values.weight) : 100,
        period: values.period ? String(values.period).trim() : null,
        status: values.status || 'brouillon',
        is_qcm: Boolean(values.is_qcm),
        feeds_gradebook: Boolean(values.feeds_gradebook),
        instructions: values.instructions ? String(values.instructions).trim() : null,
      })}
    />
  );
}
