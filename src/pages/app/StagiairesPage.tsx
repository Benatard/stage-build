import { Link } from 'react-router-dom';
import { FiEye } from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { type TableColumn } from '@/components/ui/DataTable';
import { EntityManager, type EntityField } from '@/components/ui/EntityManager';
import { InstitutionLogo } from '@/components/ui/InstitutionLogo';
import { GENDER_OPTIONS, STAGIAIRE_STATUS_OPTIONS, optionLabel } from '@/config/options';
import { useAuth } from '@/context/AuthContext';
import { useReferenceData } from '@/hooks/useReferenceData';
import { dataService } from '@/services/data.service';
import type { Stagiaire } from '@/types/domain';
import { formatDate, fullName } from '@/utils/format';

export default function StagiairesPage() {
  const { user, activeInstitutionId, activeInstitution, isSupraAdmin } = useAuth();
  const { data } = useReferenceData();
  const institutionId = activeInstitutionId ?? user?.institution_id ?? null;

  const fields: EntityField[] = [
    { name: 'matricule', label: 'Matricule', type: 'text', required: true, placeholder: 'SB-2026-001' },
    { name: 'prenom', label: 'Prénom', type: 'text', required: true },
    { name: 'nom', label: 'Nom', type: 'text', required: true },
    { name: 'postnom', label: 'Postnom', type: 'text' },
    { name: 'sexe', label: 'Sexe', type: 'select', options: GENDER_OPTIONS },
    { name: 'date_naissance', label: 'Date de naissance', type: 'date' },
    { name: 'lieu_naissance', label: 'Lieu de naissance', type: 'text' },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'stagiaire@exemple.com' },
    { name: 'telephone', label: 'Téléphone', type: 'tel' },
    { name: 'adresse', label: 'Adresse', type: 'text', fullWidth: true },
    { name: 'etablissement_origine', label: 'Établissement d’origine', type: 'text' },
    { name: 'niveau_etudes', label: 'Niveau d’études', type: 'text' },
    { name: 'diplome', label: 'Diplôme', type: 'text' },
    { name: 'domaine', label: 'Domaine', type: 'text' },
    { name: 'specialite', label: 'Spécialité', type: 'text' },
    { name: 'contact_urgence_nom', label: 'Contact d’urgence', type: 'text' },
    { name: 'contact_urgence_telephone', label: 'Téléphone d’urgence', type: 'tel' },
    {
      name: 'statut',
      label: 'Statut',
      type: 'select',
      options: STAGIAIRE_STATUS_OPTIONS,
      required: true,
      defaultValue: 'candidat',
    },
  ];

  function buildPayload(values: Record<string, string | boolean>): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    const textFields = [
      'matricule', 'nom', 'postnom', 'prenom', 'sexe', 'date_naissance',
      'lieu_naissance', 'telephone', 'email', 'adresse', 'etablissement_origine',
      'niveau_etudes', 'diplome', 'domaine', 'specialite', 'contact_urgence_nom',
      'contact_urgence_telephone',
    ];
    textFields.forEach((field) => {
      const value = values[field];
      payload[field] = typeof value === 'string' && value.trim() ? value.trim() : null;
    });
    payload.statut = values.statut || 'candidat';
    if (institutionId) payload.institution_id = institutionId;
    return payload;
  }

  async function createStagiaire(
    values: Record<string, string | boolean>,
  ): Promise<Stagiaire | null> {
    if (!institutionId) {
      throw new Error(
        'Sélectionnez une institution active dans l’en-tête avant de créer un stagiaire.',
      );
    }

    const payload = buildPayload(values);
    payload.institution_id = institutionId;
    return dataService.createRowUnscoped<Stagiaire>('stagiaires', payload);
  }

  const columns: TableColumn<Stagiaire>[] = [
    ...(isSupraAdmin
      ? [
          {
            key: 'institution',
            header: 'Institution',
            hideBelow: 'md' as const,
            render: (row: Stagiaire) => {
              const institution = data.institutions.find(
                (item) => item.id === row.institution_id,
              );
              return (
                <div className="flex items-center gap-2">
                  <InstitutionLogo
                    name={institution?.name}
                    code={institution?.code}
                    logoUrl={institution?.logo_url}
                    color={institution?.primary_color}
                    className="h-8 w-8"
                  />
                  <span className="text-xs text-body dark:text-body-dark">
                    {institution?.name ??
                      (row.institution_id ? 'Institution inconnue' : 'Non rattaché')}
                  </span>
                </div>
              );
            },
          },
        ]
      : []),
    {
      key: 'identity',
      header: 'Stagiaire',
      render: (row) => (
        <div>
          <p className="font-semibold text-black dark:text-white">{fullName(row)}</p>
          <p className="text-xs text-body dark:text-body-dark">{row.matricule}</p>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      hideBelow: 'md',
      render: (row) => (
        <div>
          <p>{row.email ?? '—'}</p>
          <p className="text-xs text-body dark:text-body-dark">{row.telephone ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'domaine',
      header: 'Domaine',
      hideBelow: 'lg',
      render: (row) => row.domaine ?? row.specialite ?? '—',
    },
    {
      key: 'naissance',
      header: 'Naissance',
      hideBelow: 'lg',
      render: (row) => formatDate(row.date_naissance),
    },
    {
      key: 'statut',
      header: 'Statut',
      render: (row) => (
        <Badge tone={statusTone(row.statut)}>
          {optionLabel(STAGIAIRE_STATUS_OPTIONS, row.statut)}
        </Badge>
      ),
    },
  ];

  return (
    <EntityManager<Stagiaire>
      table="stagiaires"
      eyebrow="Dossiers"
      title="Stagiaires"
      description={
        isSupraAdmin
          ? `Tous les stagiaires enregistrés dans le système${
              activeInstitution ? ` · ${activeInstitution.name}` : ' · toutes institutions'
            }.`
          : 'Gérez les dossiers administratifs, les coordonnées et le statut de chaque stagiaire.'
      }
      createLabel="Nouveau stagiaire"
      rowLabel={(row) => fullName(row)}
      searchPlaceholder="Rechercher un nom, un matricule, un email…"
      searchFields={(row) =>
        [row.matricule, fullName(row), row.email, row.telephone, row.domaine, row.specialite]
          .filter(Boolean)
          .join(' ')
      }
      emptyTitle="Aucun stagiaire"
      emptyDescription="Créez le premier dossier stagiaire pour démarrer le suivi."
      columns={columns}
      extraActions={(row) => (
        <Link
          to={`/app/stagiaires/${row.id}`}
          className="flex h-8 w-8 items-center justify-center text-body transition-colors hover:bg-primary/10 hover:text-primary dark:text-body-dark"
          title="Voir le dossier complet"
        >
          <FiEye className="h-4 w-4" />
        </Link>
      )}
      fields={fields}
      transform={buildPayload}
      onCreateOverride={createStagiaire}
    />
  );
}
