import { useMemo } from 'react';
import { Badge, statusTone } from '@/components/ui/Badge';
import { EntityManager, buildEntityPayload } from '@/components/ui/EntityManager';
import { useReferenceData } from '@/hooks/useReferenceData';
import type { Module } from '@/types/domain';
import { fullName } from '@/utils/format';
import { buildOptions } from '@/utils/options';

const statusOptions = [
  { value: 'active', label: 'Actif' },
  { value: 'inactive', label: 'Inactif' },
];

export default function ModulesPage() {
  const { data } = useReferenceData();

  const formationOptions = useMemo(
    () => buildOptions(data.formations, (formation) => formation.name),
    [data.formations],
  );
  const formateurOptions = useMemo(
    () =>
      buildOptions(
        data.users.filter((user) => ['formateur', 'responsable_pedagogique'].includes(user.role)),
        (user) => fullName(user),
      ),
    [data.users],
  );

  return (
    <EntityManager<Module>
      table="modules"
      eyebrow="Pédagogie"
      title="Modules"
      description="Structurez chaque formation en modules pondérés avec objectifs et volumes horaires."
      createLabel="Nouveau module"
      rowLabel={(row) => row.name}
      searchPlaceholder="Rechercher un module, une formation…"
      searchFields={(row) => {
        const formation = data.formations.find((item) => item.id === row.formation_id);
        return [row.name, row.description, formation?.name].filter(Boolean).join(' ');
      }}
      emptyTitle="Aucun module"
      emptyDescription="Ajoutez des modules pour organiser les séances, notes et compétences."
      columns={[
        {
          key: 'name',
          header: 'Module',
          render: (row) => (
            <div>
              <p className="font-semibold text-black dark:text-white">{row.name}</p>
              <p className="text-xs text-body dark:text-body-dark">
                {data.formations.find((formation) => formation.id === row.formation_id)?.name ??
                  '—'}
              </p>
            </div>
          ),
        },
        { key: 'hours', header: 'Heures', hideBelow: 'md', render: (row) => `${row.hours} h` },
        { key: 'coef', header: 'Coefficient', render: (row) => row.coefficient },
        { key: 'pass', header: 'Seuil', hideBelow: 'lg', render: (row) => `${row.pass_mark}/20` },
        {
          key: 'formateur',
          header: 'Formateur',
          hideBelow: 'lg',
          render: (row) => fullName(data.users.find((user) => user.id === row.formateur_id)),
        },
        {
          key: 'status',
          header: 'Statut',
          render: (row) => (
            <Badge tone={statusTone(row.status)}>
              {statusOptions.find((option) => option.value === row.status)?.label ?? row.status}
            </Badge>
          ),
        },
      ]}
      fields={[
        { name: 'formation_id', label: 'Formation', type: 'select', options: formationOptions, required: true },
        { name: 'formateur_id', label: 'Formateur', type: 'select', options: formateurOptions },
        { name: 'name', label: 'Nom du module', type: 'text', required: true, fullWidth: true },
        { name: 'coefficient', label: 'Coefficient', type: 'number', step: 0.5, min: 0, required: true, defaultValue: '1' },
        { name: 'hours', label: 'Volume horaire', type: 'number', min: 0, required: true, defaultValue: '0' },
        { name: 'pass_mark', label: 'Seuil de réussite (/20)', type: 'number', step: 0.5, min: 0, max: 20, defaultValue: '10' },
        { name: 'sort_order', label: 'Ordre', type: 'number', min: 0, defaultValue: '0' },
        { name: 'status', label: 'Statut', type: 'select', options: statusOptions, required: true, defaultValue: 'active' },
        { name: 'description', label: 'Description', type: 'textarea', fullWidth: true },
        { name: 'objectives', label: 'Objectifs', type: 'textarea', fullWidth: true },
        {
          name: 'competencies',
          label: 'Compétences visées',
          type: 'text',
          fullWidth: true,
          hint: 'Séparez les compétences par des virgules.',
        },
        {
          name: 'evaluation_types',
          label: 'Types d’évaluation',
          type: 'text',
          fullWidth: true,
          hint: 'Exemple : qcm, travaux_pratiques, examen',
        },
      ]}
      transform={(values) => {
        const payload = buildEntityPayload(
          [
            { name: 'formation_id', label: '', type: 'select' },
            { name: 'formateur_id', label: '', type: 'select' },
            { name: 'name', label: '', type: 'text' },
            { name: 'coefficient', label: '', type: 'number' },
            { name: 'hours', label: '', type: 'number' },
            { name: 'pass_mark', label: '', type: 'number' },
            { name: 'sort_order', label: '', type: 'number' },
            { name: 'status', label: '', type: 'select' },
            { name: 'description', label: '', type: 'textarea' },
            { name: 'objectives', label: '', type: 'textarea' },
          ],
          values,
        );
        const split = (value: string | boolean) =>
          String(value ?? '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        payload.competencies = split(values.competencies);
        payload.evaluation_types = split(values.evaluation_types);
        return payload;
      }}
    />
  );
}
