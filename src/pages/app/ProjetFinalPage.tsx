import { Badge, statusTone } from '@/components/ui/Badge';
import { EntityManager } from '@/components/ui/EntityManager';
import { useReferenceData } from '@/hooks/useReferenceData';
import type { FinalProject } from '@/types/domain';
import { formatDate, fullName } from '@/utils/format';
import { buildOptions } from '@/utils/options';

const statusOptions = [
  { value: 'en_cours', label: 'En cours' },
  { value: 'soutenu', label: 'Soutenu' },
  { value: 'valide', label: 'Validé' },
  { value: 'non_valide', label: 'Non validé' },
  { value: 'archive', label: 'Archivé' },
];

export default function ProjetFinalPage() {
  const { data } = useReferenceData();
  const stagiaireOptions = buildOptions(
    data.stagiaires,
    (stagiaire) => `${fullName(stagiaire)} (${stagiaire.matricule})`,
  );
  const supervisorOptions = buildOptions(
    data.users.filter((item) => ['formateur', 'maitre_stage', 'responsable_pedagogique'].includes(item.role)),
    (item) => fullName(item),
  );

  return (
    <EntityManager<FinalProject>
      table="final_projects"
      eyebrow="Suivi"
      title="Projets finaux"
      description="Pilotez les projets de fin de stage, les livrables, les soutenances et l’évaluation du jury."
      createLabel="Nouveau projet"
      rowLabel={(row) => row.title}
      searchPlaceholder="Rechercher un projet, un stagiaire…"
      searchFields={(row) => {
        const stagiaire = data.stagiaires.find((item) => item.id === row.stagiaire_id);
        return [row.title, row.description, fullName(stagiaire), row.appreciation]
          .filter(Boolean)
          .join(' ');
      }}
      columns={[
        {
          key: 'title',
          header: 'Projet',
          render: (row) => (
            <div className="max-w-sm">
              <p className="font-semibold text-black dark:text-white">{row.title}</p>
              <p className="line-clamp-1 text-xs text-body dark:text-body-dark">
                {row.description ?? '—'}
              </p>
            </div>
          ),
        },
        {
          key: 'stagiaire',
          header: 'Stagiaire',
          hideBelow: 'md',
          render: (row) => fullName(data.stagiaires.find((item) => item.id === row.stagiaire_id)),
        },
        { key: 'defense', header: 'Soutenance', hideBelow: 'lg', render: (row) => formatDate(row.defense_date) },
        { key: 'score', header: 'Note', hideBelow: 'md', render: (row) => (row.score !== null && row.score !== undefined ? `${row.score}/20` : '—') },
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
        { name: 'stagiaire_id', label: 'Stagiaire', type: 'select', options: stagiaireOptions, required: true },
        { name: 'supervisor_id', label: 'Superviseur', type: 'select', options: supervisorOptions },
        { name: 'title', label: 'Titre du projet', type: 'text', required: true, fullWidth: true },
        { name: 'start_date', label: 'Début', type: 'date' },
        { name: 'end_date', label: 'Fin', type: 'date' },
        { name: 'defense_date', label: 'Date de soutenance', type: 'date' },
        { name: 'score', label: 'Note (/20)', type: 'number', min: 0, max: 20, step: 0.25 },
        { name: 'description', label: 'Description', type: 'textarea', fullWidth: true },
        { name: 'objectives', label: 'Objectifs', type: 'textarea', fullWidth: true },
        { name: 'deliverables', label: 'Livrables', type: 'text', fullWidth: true, hint: 'Séparez les livrables par des virgules.' },
        { name: 'appreciation', label: 'Appréciation', type: 'text', fullWidth: true },
        { name: 'comments', label: 'Commentaires', type: 'textarea', fullWidth: true },
        { name: 'status', label: 'Statut', type: 'select', options: statusOptions, required: true, defaultValue: 'en_cours' },
      ]}
      transform={(values) => ({
        stagiaire_id: values.stagiaire_id || null,
        supervisor_id: values.supervisor_id || null,
        title: String(values.title ?? '').trim(),
        description: values.description ? String(values.description).trim() : null,
        objectives: values.objectives ? String(values.objectives).trim() : null,
        start_date: values.start_date || null,
        end_date: values.end_date || null,
        defense_date: values.defense_date || null,
        score: values.score ? Number(values.score) : null,
        appreciation: values.appreciation ? String(values.appreciation).trim() : null,
        comments: values.comments ? String(values.comments).trim() : null,
        deliverables: String(values.deliverables ?? '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        members: [],
        jury: [],
        status: values.status || 'en_cours',
      })}
    />
  );
}
