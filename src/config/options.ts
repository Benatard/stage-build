export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
};

export const GENDER_OPTIONS: SelectOption<'M' | 'F' | 'Autre'>[] = [
  { value: 'M', label: 'Masculin' },
  { value: 'F', label: 'Féminin' },
  { value: 'Autre', label: 'Autre' },
];

export const STAGIAIRE_STATUS_OPTIONS: SelectOption[] = [
  { value: 'candidat', label: 'Candidat' },
  { value: 'admis', label: 'Admis' },
  { value: 'actif', label: 'Actif' },
  { value: 'termine', label: 'Terminé' },
  { value: 'archive', label: 'Archivé' },
];

export const USER_STATUS_OPTIONS: SelectOption[] = [
  { value: 'active', label: 'Actif' },
  { value: 'inactive', label: 'Inactif' },
  { value: 'blocked', label: 'Bloqué' },
];

export const PRESENCE_OPTIONS: SelectOption[] = [
  { value: 'present', label: 'Présent' },
  { value: 'absent', label: 'Absent' },
  { value: 'retard', label: 'En retard' },
  { value: 'absence_justifiee', label: 'Absence justifiée' },
  { value: 'absence_non_justifiee', label: 'Absence non justifiée' },
  { value: 'sortie_autorisee', label: 'Sortie autorisée' },
];

export const EVALUATION_TYPE_OPTIONS: SelectOption[] = [
  { value: 'interrogation', label: 'Interrogation' },
  { value: 'devoir', label: 'Devoir' },
  { value: 'qcm', label: 'QCM' },
  { value: 'examen', label: 'Examen' },
  { value: 'travail_pratique', label: 'Travail pratique' },
  { value: 'projet', label: 'Projet' },
  { value: 'presentation', label: 'Présentation' },
  { value: 'evaluation_orale', label: 'Évaluation orale' },
  { value: 'evaluation_competence', label: 'Évaluation de compétence' },
  { value: 'evaluation_comportementale', label: 'Évaluation comportementale' },
  { value: 'evaluation_finale', label: 'Évaluation finale' },
];

export const EVALUATION_STATUS_OPTIONS: SelectOption[] = [
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'programmee', label: 'Programmée' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'terminee', label: 'Terminée' },
  { value: 'corrigee', label: 'Corrigée' },
  { value: 'soumise', label: 'Soumise' },
  { value: 'validee', label: 'Validée' },
  { value: 'publiee', label: 'Publiée' },
  { value: 'archivee', label: 'Archivée' },
];

export const COMPETENCE_LEVEL_OPTIONS: SelectOption[] = [
  { value: 'non_acquis', label: 'Non acquis' },
  { value: 'a_renforcer', label: 'À renforcer' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'acquis', label: 'Acquis' },
  { value: 'maitrise', label: 'Maîtrisé' },
];

export const PLAN_STATUS_OPTIONS: SelectOption[] = [
  { value: 'cree', label: 'Créé' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'evalue', label: 'Évalué' },
  { value: 'atteint', label: 'Atteint' },
  { value: 'non_atteint', label: 'Non atteint' },
];

export const DECISION_OPTIONS: SelectOption[] = [
  { value: 'progression_normale', label: 'Progression normale' },
  { value: 'surveillance', label: 'Surveillance' },
  { value: 'plan_amelioration', label: 'Plan d’amélioration' },
  { value: 'entretien_obligatoire', label: 'Entretien obligatoire' },
];

export const OBJECTIVE_STATUS_OPTIONS: SelectOption[] = [
  { value: 'non_commence', label: 'Non commencé' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'atteint', label: 'Atteint' },
  { value: 'depasse', label: 'Dépassé' },
  { value: 'non_atteint', label: 'Non atteint' },
];

export const DOCUMENT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'fiche_inscription', label: 'Fiche d’inscription' },
  { value: 'fiche_stagiaire', label: 'Fiche stagiaire' },
  { value: 'carte_stagiaire', label: 'Carte stagiaire' },
  { value: 'attestation_stage', label: 'Attestation de stage' },
  { value: 'certificat_formation', label: 'Certificat de formation' },
  { value: 'certificat_reussite', label: 'Certificat de réussite' },
  { value: 'releve_notes', label: 'Relevé de notes' },
  { value: 'bulletin', label: 'Bulletin' },
  { value: 'rapport_evaluation', label: 'Rapport d’évaluation' },
  { value: 'rapport_stage', label: 'Rapport de stage' },
  { value: 'fiche_evaluation_finale', label: 'Fiche d’évaluation finale' },
];

export function optionLabel(
  options: SelectOption[],
  value?: string | null,
  fallback = '—',
): string {
  if (!value) return fallback;
  return options.find((option) => option.value === value)?.label ?? value;
}
