import { useState } from 'react';
import { Badge, statusTone } from '@/components/ui/Badge';
import { EntityManager } from '@/components/ui/EntityManager';
import { useAuth } from '@/context/AuthContext';
import { useForgeTable } from '@/hooks/useForgeTable';
import { useReferenceData } from '@/hooks/useReferenceData';
import type { TravauxPratique, TravauxSoumission } from '@/types/domain';
import { formatDateTime, fullName } from '@/utils/format';
import { buildOptions } from '@/utils/options';

const tpStatusOptions = [
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'publie', label: 'Publié' },
  { value: 'cloture', label: 'Clôturé' },
  { value: 'archive', label: 'Archivé' },
];

const submissionStatusOptions = [
  { value: 'soumis', label: 'Soumis' },
  { value: 'en_correction', label: 'En correction' },
  { value: 'corrige', label: 'Corrigé' },
  { value: 'valide', label: 'Validé' },
  { value: 'a_refaire', label: 'À refaire' },
];

export default function TravauxPage() {
  const { data } = useReferenceData();
  const { user } = useAuth();
  const [tab, setTab] = useState<'travaux' | 'soumissions'>('travaux');
  const { rows: travaux } = useForgeTable<TravauxPratique>('travaux_pratiques', {
    order: 'created_at.desc',
  });

  const travauxOptions = buildOptions(travaux, (row) => row.title);
  const moduleOptions = buildOptions(data.modules, (module) => module.name);
  const formateurOptions = buildOptions(
    data.users.filter((item) => ['formateur', 'responsable_pedagogique'].includes(item.role)),
    (item) => fullName(item),
  );
  const stagiaireOptions = buildOptions(
    data.stagiaires,
    (stagiaire) => `${fullName(stagiaire)} (${stagiaire.matricule})`,
  );

  return (
    <div>
      <div className="mb-6 flex gap-1 border-b border-stroke dark:border-white/10">
        {[
          { key: 'travaux' as const, label: 'Travaux pratiques' },
          { key: 'soumissions' as const, label: 'Soumissions & corrections' },
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

      {tab === 'travaux' ? (
        <EntityManager<TravauxPratique>
          table="travaux_pratiques"
          eyebrow="Évaluations"
          title="Travaux pratiques"
          description="Publiez les consignes, les livrables attendus et les critères d’évaluation des TP."
          createLabel="Nouveau travail pratique"
          rowLabel={(row) => row.title}
          searchPlaceholder="Rechercher un TP, un module…"
          searchFields={(row) => {
            const module = data.modules.find((item) => item.id === row.module_id);
            return [row.title, row.description, module?.name].filter(Boolean).join(' ');
          }}
          columns={[
            {
              key: 'title',
              header: 'Travail pratique',
              render: (row) => (
                <div className="max-w-sm">
                  <p className="font-semibold text-black dark:text-white">{row.title}</p>
                  <p className="text-xs text-body dark:text-body-dark">
                    {data.modules.find((module) => module.id === row.module_id)?.name ?? '—'}
                  </p>
                </div>
              ),
            },
            { key: 'deadline', header: 'Échéance', hideBelow: 'md', render: (row) => formatDateTime(row.deadline) },
            { key: 'score', header: 'Barème', hideBelow: 'lg', render: (row) => `${row.max_score} pts · coef. ${row.coefficient}` },
            { key: 'deliverables', header: 'Livrables', hideBelow: 'lg', render: (row) => row.deliverables.length },
            {
              key: 'status',
              header: 'Statut',
              render: (row) => (
                <Badge tone={statusTone(row.status)}>
                  {tpStatusOptions.find((option) => option.value === row.status)?.label ?? row.status}
                </Badge>
              ),
            },
          ]}
          fields={[
            { name: 'title', label: 'Titre du TP', type: 'text', required: true, fullWidth: true },
            { name: 'module_id', label: 'Module', type: 'select', options: moduleOptions },
            { name: 'formateur_id', label: 'Formateur', type: 'select', options: formateurOptions },
            { name: 'deadline', label: 'Échéance', type: 'datetime-local' },
            { name: 'max_score', label: 'Note maximale', type: 'number', min: 0, required: true, defaultValue: '20' },
            { name: 'coefficient', label: 'Coefficient', type: 'number', min: 0, step: 0.5, required: true, defaultValue: '1' },
            { name: 'status', label: 'Statut', type: 'select', options: tpStatusOptions, required: true, defaultValue: 'brouillon' },
            { name: 'description', label: 'Consignes', type: 'textarea', fullWidth: true, rows: 6 },
            { name: 'deliverables', label: 'Livrables attendus', type: 'text', fullWidth: true, hint: 'Séparez par des virgules.' },
          ]}
          transform={(values) => ({
            title: String(values.title ?? '').trim(),
            module_id: values.module_id || null,
            formateur_id: values.formateur_id || null,
            description: values.description ? String(values.description).trim() : null,
            deadline: values.deadline || null,
            deliverables: String(values.deliverables ?? '')
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
            max_score: values.max_score ? Number(values.max_score) : 20,
            coefficient: values.coefficient ? Number(values.coefficient) : 1,
            status: values.status || 'brouillon',
          })}
        />
      ) : (
        <EntityManager<TravauxSoumission>
          table="travaux_soumissions"
          eyebrow="Évaluations"
          title="Soumissions des travaux"
          description="Consultez les dépôts, corrigez les travaux et communiquez un feedback aux stagiaires."
          createLabel="Nouvelle soumission"
          order="submitted_at.desc"
          rowLabel={(row) => {
            const tp = data.modules.find((module) => module.id === row.tp_id);
            const stagiaire = data.stagiaires.find((item) => item.id === row.stagiaire_id);
            return `${tp?.name ?? 'TP'} — ${fullName(stagiaire)}`;
          }}
          searchPlaceholder="Rechercher un stagiaire, un TP…"
          searchFields={(row) => {
            const stagiaire = data.stagiaires.find((item) => item.id === row.stagiaire_id);
            return [fullName(stagiaire), row.file_name, row.link_url, row.feedback]
              .filter(Boolean)
              .join(' ');
          }}
          columns={[
            {
              key: 'stagiaire',
              header: 'Stagiaire',
              render: (row) => (
                <div>
                  <p className="font-semibold text-black dark:text-white">
                    {fullName(data.stagiaires.find((item) => item.id === row.stagiaire_id))}
                  </p>
                  <p className="text-xs text-body dark:text-body-dark">
                    {formatDateTime(row.submitted_at)}
                  </p>
                </div>
              ),
            },
            {
              key: 'file',
              header: 'Dépôt',
              hideBelow: 'md',
              render: (row) =>
                row.link_url ? (
                  <a href={row.link_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    Ouvrir le lien
                  </a>
                ) : row.file_url ? (
                  <a href={row.file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {row.file_name ?? 'Fichier'}
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
                <Badge tone={statusTone(row.status)}>
                  {submissionStatusOptions.find((option) => option.value === row.status)?.label ?? row.status}
                </Badge>
              ),
            },
          ]}
          fields={[
            { name: 'tp_id', label: 'Travail pratique', type: 'select', options: travauxOptions, required: true },
            { name: 'stagiaire_id', label: 'Stagiaire', type: 'select', options: stagiaireOptions, required: true },
            { name: 'file_url', label: 'URL du fichier', type: 'text', placeholder: 'https://…' },
            { name: 'file_name', label: 'Nom du fichier', type: 'text' },
            { name: 'link_url', label: 'Lien externe', type: 'text', placeholder: 'https://…' },
            { name: 'submitted_at', label: 'Date de soumission', type: 'datetime-local' },
            { name: 'score', label: 'Note (/20)', type: 'number', min: 0, max: 20, step: 0.25 },
            { name: 'status', label: 'Statut', type: 'select', options: submissionStatusOptions, required: true, defaultValue: 'soumis' },
            { name: 'feedback', label: 'Feedback', type: 'textarea', fullWidth: true },
          ]}
          transform={(values) => ({
            tp_id: values.tp_id || null,
            stagiaire_id: values.stagiaire_id || null,
            file_url: values.file_url ? String(values.file_url).trim() : null,
            file_name: values.file_name ? String(values.file_name).trim() : null,
            link_url: values.link_url ? String(values.link_url).trim() : null,
            submitted_at: values.submitted_at || new Date().toISOString(),
            score: values.score ? Number(values.score) : null,
            status: values.status || 'soumis',
            feedback: values.feedback ? String(values.feedback).trim() : null,
            graded_by: user?.id ?? null,
            graded_at: values.score ? new Date().toISOString() : null,
          })}
        />
      )}
    </div>
  );
}
