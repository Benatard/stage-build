import { useState } from 'react';
import { Badge, statusTone } from '@/components/ui/Badge';
import { EntityManager } from '@/components/ui/EntityManager';
import { useReferenceData } from '@/hooks/useReferenceData';
import { useAuth } from '@/context/AuthContext';
import type { Competence, CompetenceEvaluation } from '@/types/domain';
import { COMPETENCE_LEVEL_OPTIONS, optionLabel } from '@/config/options';
import { formatDate, fullName } from '@/utils/format';
import { buildOptions } from '@/utils/options';

export default function CompetencesPage() {
  const { data } = useReferenceData();
  const { user } = useAuth();
  const [tab, setTab] = useState<'definitions' | 'evaluations'>('definitions');

  const stagiaireOptions = buildOptions(
    data.stagiaires,
    (stagiaire) => `${fullName(stagiaire)} (${stagiaire.matricule})`,
  );
  const competenceOptions = buildOptions(data.competences, (competence) => competence.name);
  const formationOptions = buildOptions(data.formations, (formation) => formation.name);
  const moduleOptions = buildOptions(data.modules, (module) => module.name);

  return (
    <div>
      <div className="mb-6 flex gap-1 border-b border-stroke dark:border-white/10">
        {[
          { key: 'definitions' as const, label: 'Référentiel de compétences' },
          { key: 'evaluations' as const, label: 'Évaluations des compétences' },
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

      {tab === 'definitions' ? (
        <EntityManager<Competence>
          table="competences"
          eyebrow="Évaluations"
          title="Référentiel de compétences"
          description="Définissez les compétences attendues par formation et module."
          createLabel="Nouvelle compétence"
          rowLabel={(row) => row.name}
          searchPlaceholder="Rechercher une compétence…"
          searchFields={(row) => [row.name, row.description].filter(Boolean).join(' ')}
          columns={[
            {
              key: 'name',
              header: 'Compétence',
              render: (row) => (
                <div>
                  <p className="font-semibold text-black dark:text-white">{row.name}</p>
                  <p className="text-xs text-body dark:text-body-dark">
                    {row.description ? row.description.slice(0, 90) : '—'}
                  </p>
                </div>
              ),
            },
            {
              key: 'formation',
              header: 'Formation',
              hideBelow: 'md',
              render: (row) =>
                data.formations.find((formation) => formation.id === row.formation_id)?.name ?? '—',
            },
            {
              key: 'module',
              header: 'Module',
              hideBelow: 'lg',
              render: (row) => data.modules.find((module) => module.id === row.module_id)?.name ?? '—',
            },
            { key: 'order', header: 'Ordre', render: (row) => row.sort_order },
          ]}
          fields={[
            { name: 'name', label: 'Nom de la compétence', type: 'text', required: true, fullWidth: true },
            { name: 'formation_id', label: 'Formation', type: 'select', options: formationOptions },
            { name: 'module_id', label: 'Module', type: 'select', options: moduleOptions },
            { name: 'sort_order', label: 'Ordre', type: 'number', min: 0, defaultValue: '0' },
            { name: 'description', label: 'Description', type: 'textarea', fullWidth: true },
          ]}
        />
      ) : (
        <EntityManager<CompetenceEvaluation>
          table="competence_levels"
          eyebrow="Évaluations"
          title="Niveaux de compétences"
          description="Évaluez le niveau acquis par chaque stagiaire sur les compétences du référentiel."
          createLabel="Nouvelle évaluation"
          order="evaluated_at.desc"
          rowLabel={(row) =>
            fullName(data.stagiaires.find((item) => item.id === row.stagiaire_id))
          }
          searchPlaceholder="Rechercher un stagiaire, une compétence…"
          searchFields={(row) => {
            const stagiaire = data.stagiaires.find((item) => item.id === row.stagiaire_id);
            const competence = data.competences.find((item) => item.id === row.competence_id);
            return [fullName(stagiaire), competence?.name, row.level].filter(Boolean).join(' ');
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
                    {data.stagiaires.find((item) => item.id === row.stagiaire_id)?.matricule ?? '—'}
                  </p>
                </div>
              ),
            },
            {
              key: 'competence',
              header: 'Compétence',
              render: (row) =>
                data.competences.find((item) => item.id === row.competence_id)?.name ?? '—',
            },
            {
              key: 'level',
              header: 'Niveau',
              render: (row) => (
                <Badge tone={statusTone(row.level)}>
                  {optionLabel(COMPETENCE_LEVEL_OPTIONS, row.level)}
                </Badge>
              ),
            },
            {
              key: 'date',
              header: 'Évaluée le',
              hideBelow: 'md',
              render: (row) => formatDate(row.evaluated_at),
            },
          ]}
          fields={[
            { name: 'stagiaire_id', label: 'Stagiaire', type: 'select', options: stagiaireOptions, required: true },
            { name: 'competence_id', label: 'Compétence', type: 'select', options: competenceOptions, required: true },
            { name: 'level', label: 'Niveau acquis', type: 'select', options: COMPETENCE_LEVEL_OPTIONS, required: true, defaultValue: 'en_cours' },
            { name: 'evaluated_at', label: 'Date d’évaluation', type: 'date', defaultValue: new Date().toISOString().slice(0, 10) },
            { name: 'comment', label: 'Commentaire', type: 'textarea', fullWidth: true },
          ]}
          transform={(values) => ({
            stagiaire_id: values.stagiaire_id || null,
            competence_id: values.competence_id || null,
            level: values.level || 'en_cours',
            comment: values.comment ? String(values.comment).trim() : null,
            evaluated_at: values.evaluated_at || new Date().toISOString(),
            evaluated_by: user?.id ?? null,
          })}
        />
      )}
    </div>
  );
}
