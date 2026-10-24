import { useMemo } from 'react';
import { EntityManager } from '@/components/ui/EntityManager';
import { useReferenceData } from '@/hooks/useReferenceData';
import { useAuth } from '@/context/AuthContext';
import type { Affectation } from '@/types/domain';
import { fullName } from '@/utils/format';
import { buildOptions } from '@/utils/options';

export default function AffectationsPage() {
  const { data } = useReferenceData();
  const { user } = useAuth();

  const stagiaireOptions = useMemo(
    () => buildOptions(data.stagiaires, (stagiaire) => `${fullName(stagiaire)} (${stagiaire.matricule})`),
    [data.stagiaires],
  );
  const formationOptions = useMemo(
    () => buildOptions(data.formations, (formation) => formation.name),
    [data.formations],
  );
  const promotionOptions = useMemo(
    () => buildOptions(data.promotions, (promotion) => promotion.code),
    [data.promotions],
  );
  const formateurOptions = useMemo(
    () =>
      buildOptions(
        data.users.filter((item) => ['formateur', 'responsable_pedagogique'].includes(item.role)),
        (item) => fullName(item),
      ),
    [data.users],
  );
  const maitreOptions = useMemo(
    () => buildOptions(data.users.filter((item) => item.role === 'maitre_stage'), (item) => fullName(item)),
    [data.users],
  );

  return (
    <EntityManager<Affectation>
      table="affectations"
      eyebrow="Dossiers"
      title="Affectations"
      description="Affectez les stagiaires à un service, un formateur référent et un maître de stage."
      createLabel="Nouvelle affectation"
      rowLabel={(row) => fullName(data.stagiaires.find((item) => item.id === row.stagiaire_id))}
      searchPlaceholder="Rechercher un stagiaire, un service, un encadrant…"
      searchFields={(row) => {
        const stagiaire = data.stagiaires.find((item) => item.id === row.stagiaire_id);
        return [
          fullName(stagiaire),
          row.service,
          fullName(data.users.find((item) => item.id === row.formateur_id)),
          fullName(data.users.find((item) => item.id === row.maitre_stage_id)),
          row.groupe,
        ]
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
                {data.formations.find((item) => item.id === row.formation_id)?.name ?? '—'}
              </p>
            </div>
          ),
        },
        { key: 'service', header: 'Service', hideBelow: 'md', render: (row) => row.service ?? '—' },
        {
          key: 'formateur',
          header: 'Formateur réf.',
          hideBelow: 'lg',
          render: (row) => fullName(data.users.find((item) => item.id === row.formateur_id)),
        },
        {
          key: 'maitre',
          header: 'Maître de stage',
          hideBelow: 'lg',
          render: (row) => fullName(data.users.find((item) => item.id === row.maitre_stage_id)),
        },
        { key: 'groupe', header: 'Groupe', render: (row) => row.groupe ?? '—' },
      ]}
      fields={[
        { name: 'stagiaire_id', label: 'Stagiaire', type: 'select', options: stagiaireOptions, required: true },
        { name: 'formation_id', label: 'Formation', type: 'select', options: formationOptions },
        { name: 'promotion_id', label: 'Promotion', type: 'select', options: promotionOptions },
        { name: 'service', label: 'Service / département', type: 'text' },
        { name: 'formateur_id', label: 'Formateur référent', type: 'select', options: formateurOptions },
        { name: 'maitre_stage_id', label: 'Maître de stage', type: 'select', options: maitreOptions },
        { name: 'groupe', label: 'Groupe', type: 'text' },
      ]}
      transform={(values) => ({
        stagiaire_id: values.stagiaire_id || null,
        formation_id: values.formation_id || null,
        promotion_id: values.promotion_id || null,
        service: values.service ? String(values.service).trim() : null,
        formateur_id: values.formateur_id || null,
        maitre_stage_id: values.maitre_stage_id || null,
        groupe: values.groupe ? String(values.groupe).trim() : null,
        created_by: user?.id ?? null,
      })}
    />
  );
}
