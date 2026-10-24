import { Badge, statusTone } from '@/components/ui/Badge';
import { EntityManager } from '@/components/ui/EntityManager';
import { useAuth } from '@/context/AuthContext';
import { useReferenceData } from '@/hooks/useReferenceData';
import type { StageJournal } from '@/types/domain';
import { formatDate, fullName, truncate } from '@/utils/format';
import { buildOptions } from '@/utils/options';

const statusOptions = [
  { value: 'soumis', label: 'Soumis' },
  { value: 'valide', label: 'Validé' },
  { value: 'commente', label: 'Commenté' },
];

export default function JournalPage() {
  const { data } = useReferenceData();
  const { user } = useAuth();
  const stagiaireOptions = buildOptions(
    data.stagiaires,
    (stagiaire) => `${fullName(stagiaire)} (${stagiaire.matricule})`,
  );

  return (
    <EntityManager<StageJournal>
      table="stage_journal"
      eyebrow="Suivi"
      title="Journal de stage"
      description="Consultez et validez les activités quotidiennes consignées par les stagiaires."
      createLabel="Nouvelle entrée"
      order="date.desc"
      rowLabel={(row) => `${formatDate(row.date)} — ${row.activity}`}
      searchPlaceholder="Rechercher une activité, une compétence…"
      searchFields={(row) => {
        const stagiaire = data.stagiaires.find((item) => item.id === row.stagiaire_id);
        return [row.activity, row.competence, row.observation, fullName(stagiaire)]
          .filter(Boolean)
          .join(' ');
      }}
      columns={[
        { key: 'date', header: 'Date', render: (row) => formatDate(row.date) },
        {
          key: 'activity',
          header: 'Activité',
          render: (row) => (
            <div className="max-w-sm">
              <p className="font-medium text-black dark:text-white">{truncate(row.activity, 100)}</p>
              <p className="text-xs text-body dark:text-body-dark">{row.competence ?? '—'}</p>
            </div>
          ),
        },
        {
          key: 'stagiaire',
          header: 'Stagiaire',
          hideBelow: 'md',
          render: (row) => fullName(data.stagiaires.find((item) => item.id === row.stagiaire_id)),
        },
        { key: 'duration', header: 'Durée', hideBelow: 'lg', render: (row) => (row.duration_hours ? `${row.duration_hours} h` : '—') },
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
        { name: 'date', label: 'Date', type: 'date', required: true, defaultValue: new Date().toISOString().slice(0, 10) },
        { name: 'activity', label: 'Activité réalisée', type: 'textarea', required: true, fullWidth: true },
        { name: 'competence', label: 'Compétence mobilisée', type: 'text' },
        { name: 'duration_hours', label: 'Durée (heures)', type: 'number', min: 0, step: 0.5 },
        { name: 'observation', label: 'Observation', type: 'textarea', fullWidth: true },
        { name: 'status', label: 'Statut', type: 'select', options: statusOptions, required: true, defaultValue: 'soumis' },
        { name: 'comment', label: 'Commentaire du validateur', type: 'textarea', fullWidth: true },
      ]}
      transform={(values) => ({
        stagiaire_id: values.stagiaire_id || null,
        date: values.date || new Date().toISOString().slice(0, 10),
        activity: String(values.activity ?? '').trim(),
        competence: values.competence ? String(values.competence).trim() : null,
        duration_hours: values.duration_hours ? Number(values.duration_hours) : null,
        observation: values.observation ? String(values.observation).trim() : null,
        status: values.status || 'soumis',
        comment: values.comment ? String(values.comment).trim() : null,
        validated_by: values.status === 'valide' ? user?.id ?? null : null,
      })}
    />
  );
}
