export type ID = string;

export type BaseRow = {
  id: ID;
  created_at?: string;
  updated_at?: string;
};

export type Role =
  | 'admin'
  | 'direction'
  | 'responsable_formation'
  | 'responsable_pedagogique'
  | 'formateur'
  | 'maitre_stage'
  | 'administration'
  | 'stagiaire'
  | 'rh'
  | 'auditeur';

export type UserStatus = 'active' | 'inactive' | 'blocked';

export type User = BaseRow & {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  role: Role;
  statut: UserStatus;
  last_login_at?: string | null;
  avatar_url?: string | null;
  stagiaire_id?: string | null;
};

export type AuthUser = User & {
  roles: Role[];
  permissions: string[];
};

export type RoleDefinition = BaseRow & {
  name: Role;
  label: string;
  permissions: string[];
};

export type UserRole = BaseRow & {
  user_id: string;
  role_id: string;
};

export type StagiaireStatus = 'candidat' | 'admis' | 'actif' | 'termine' | 'archive';

export type Stagiaire = BaseRow & {
  matricule: string;
  nom: string;
  postnom?: string | null;
  prenom: string;
  sexe?: 'M' | 'F' | 'Autre' | null;
  date_naissance?: string | null;
  lieu_naissance?: string | null;
  telephone?: string | null;
  email?: string | null;
  adresse?: string | null;
  photo_url?: string | null;
  contact_urgence_nom?: string | null;
  contact_urgence_telephone?: string | null;
  etablissement_origine?: string | null;
  niveau_etudes?: string | null;
  diplome?: string | null;
  domaine?: string | null;
  specialite?: string | null;
  statut: StagiaireStatus;
};

export type Formation = BaseRow & {
  name: string;
  description?: string | null;
  duration_months?: number | null;
  objectives?: string | null;
  level?: string | null;
  domain?: string | null;
  program?: string | null;
  status: 'active' | 'inactive' | 'archivee';
  created_by?: string | null;
};

export type Module = BaseRow & {
  formation_id: string;
  name: string;
  description?: string | null;
  coefficient: number;
  hours: number;
  formateur_id?: string | null;
  objectives?: string | null;
  competencies?: string[];
  evaluation_types?: string[];
  pass_mark: number;
  sort_order: number;
  status: 'active' | 'inactive';
};

export type Promotion = BaseRow & {
  formation_id: string;
  code: string;
  name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  capacity?: number | null;
  status: 'planifiee' | 'active' | 'cloturee' | 'archivee';
  created_by?: string | null;
};

export type InscriptionStatus = 'en_attente' | 'validee' | 'annulee' | 'terminee';

export type Inscription = BaseRow & {
  stagiaire_id: string;
  formation_id: string;
  promotion_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  responsible_id?: string | null;
  status: InscriptionStatus;
};

export type Affectation = BaseRow & {
  stagiaire_id: string;
  inscription_id?: string | null;
  formation_id?: string | null;
  promotion_id?: string | null;
  service?: string | null;
  formateur_id?: string | null;
  maitre_stage_id?: string | null;
  groupe?: string | null;
};

export type SeanceStatus = 'planifiee' | 'en_cours' | 'terminee' | 'annulee';

export type Seance = BaseRow & {
  module_id: string;
  promotion_id?: string | null;
  formateur_id?: string | null;
  title?: string | null;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  room?: string | null;
  status: SeanceStatus;
};

export type PresenceStatus =
  | 'present'
  | 'absent'
  | 'retard'
  | 'absence_justifiee'
  | 'absence_non_justifiee'
  | 'sortie_autorisee';

export type Presence = BaseRow & {
  seance_id: string;
  stagiaire_id: string;
  status: PresenceStatus;
  note?: string | null;
  recorded_by?: string | null;
  recorded_at?: string | null;
};

export type EvaluationType =
  | 'interrogation'
  | 'devoir'
  | 'qcm'
  | 'examen'
  | 'travail_pratique'
  | 'projet'
  | 'presentation'
  | 'evaluation_orale'
  | 'evaluation_competence'
  | 'evaluation_comportementale'
  | 'evaluation_finale';

export type EvaluationStatus =
  | 'brouillon'
  | 'programmee'
  | 'en_cours'
  | 'terminee'
  | 'corrigee'
  | 'soumise'
  | 'validee'
  | 'publiee'
  | 'archivee';

export type Evaluation = BaseRow & {
  title: string;
  formation_id?: string | null;
  module_id?: string | null;
  formateur_id?: string | null;
  type: EvaluationType;
  date?: string | null;
  duration_minutes?: number | null;
  max_score: number;
  coefficient: number;
  weight: number;
  period?: string | null;
  status: EvaluationStatus;
  is_qcm: boolean;
  feeds_gradebook: boolean;
  instructions?: string | null;
};

export type NoteStatus = 'saisie' | 'soumise' | 'validee' | 'publiee';

export type Note = BaseRow & {
  evaluation_id: string;
  stagiaire_id: string;
  score?: number | null;
  max_score: number;
  coefficient: number;
  status: NoteStatus;
  comment?: string | null;
  graded_by?: string | null;
  graded_at?: string | null;
  validated_by?: string | null;
  validated_at?: string | null;
};

export type QcmQuestionType =
  | 'single'
  | 'multiple'
  | 'true_false'
  | 'short_answer'
  | 'matching';

export type QcmQuestion = BaseRow & {
  evaluation_id: string;
  question_text: string;
  type: QcmQuestionType;
  options: Array<string | { label: string; value: string }>;
  correct_answer?: unknown;
  points: number;
  sort_order: number;
};

export type QcmAttemptStatus = 'en_cours' | 'soumis' | 'corrige';

export type QcmAttempt = BaseRow & {
  evaluation_id: string;
  stagiaire_id: string;
  attempt_number: number;
  started_at: string;
  submitted_at?: string | null;
  score?: number | null;
  max_score?: number | null;
  percentage?: number | null;
  passed?: boolean | null;
  time_spent_seconds?: number | null;
  answers: Record<string, unknown>;
  status: QcmAttemptStatus;
};

export type TravauxPratiqueStatus = 'brouillon' | 'publie' | 'cloture' | 'archive';

export type TravauxPratique = BaseRow & {
  title: string;
  module_id?: string | null;
  formateur_id?: string | null;
  description?: string | null;
  deadline?: string | null;
  deliverables: string[];
  max_score: number;
  coefficient: number;
  status: TravauxPratiqueStatus;
};

export type TravauxSoumissionStatus =
  | 'soumis'
  | 'en_correction'
  | 'corrige'
  | 'valide'
  | 'a_refaire';

export type TravauxSoumission = BaseRow & {
  tp_id: string;
  stagiaire_id: string;
  file_url?: string | null;
  file_name?: string | null;
  link_url?: string | null;
  submitted_at: string;
  status: TravauxSoumissionStatus;
  score?: number | null;
  feedback?: string | null;
  graded_by?: string | null;
  graded_at?: string | null;
};

export type Competence = BaseRow & {
  formation_id?: string | null;
  module_id?: string | null;
  name: string;
  description?: string | null;
  sort_order: number;
};

export type CompetenceLevel =
  | 'non_acquis'
  | 'a_renforcer'
  | 'en_cours'
  | 'acquis'
  | 'maitrise';

export type CompetenceEvaluation = BaseRow & {
  stagiaire_id: string;
  competence_id: string;
  level: CompetenceLevel;
  comment?: string | null;
  evaluated_by?: string | null;
  evaluated_at: string;
};

export type Implication = BaseRow & {
  stagiaire_id: string;
  module_id?: string | null;
  period?: string | null;
  participation?: number | null;
  assiduite?: number | null;
  curiosite?: number | null;
  questions?: number | null;
  travail_personnel?: number | null;
  collaboration?: number | null;
  respect_consignes?: number | null;
  autonomie?: number | null;
  average?: number | null;
  comment?: string | null;
  evaluated_by?: string | null;
};

export type Comportement = BaseRow & {
  stagiaire_id: string;
  period?: string | null;
  ponctualite?: number | null;
  discipline?: number | null;
  respect?: number | null;
  communication?: number | null;
  esprit_equipe?: number | null;
  autonomie?: number | null;
  responsabilite?: number | null;
  attitude_professionnelle?: number | null;
  respect_materiel?: number | null;
  capacite_adaptation?: number | null;
  average?: number | null;
  appreciation?: string | null;
  evaluated_by?: string | null;
};

export type ObservationVisibility = 'interne' | 'publiee' | 'stagiaire';

export type Observation = BaseRow & {
  stagiaire_id: string;
  module_id?: string | null;
  seance_id?: string | null;
  evaluation_id?: string | null;
  competence_id?: string | null;
  author_id?: string | null;
  content: string;
  visibility: ObservationVisibility;
};

export type ImprovementPlanStatus = 'cree' | 'en_cours' | 'evalue' | 'atteint' | 'non_atteint';

export type ImprovementPlan = BaseRow & {
  stagiaire_id: string;
  difficulty: string;
  objective: string;
  start_date?: string | null;
  end_date?: string | null;
  responsible_id?: string | null;
  status: ImprovementPlanStatus;
  evaluation_comment?: string | null;
};

export type ImprovementAction = BaseRow & {
  plan_id: string;
  title: string;
  type?: string | null;
  due_date?: string | null;
  status: 'a_faire' | 'en_cours' | 'termine' | 'annule';
  result?: string | null;
};

export type IntermediateDecision =
  | 'progression_normale'
  | 'surveillance'
  | 'plan_amelioration'
  | 'entretien_obligatoire';

export type IntermediateEvaluation = BaseRow & {
  stagiaire_id: string;
  date: string;
  average?: number | null;
  attendance_rate?: number | null;
  qcm_average?: number | null;
  tp_average?: number | null;
  competencies_acquired?: number | null;
  implication_average?: number | null;
  behavior_average?: number | null;
  strengths?: string | null;
  improvements?: string | null;
  recommendations?: string | null;
  decision: IntermediateDecision;
  observations?: string | null;
  evaluator_id?: string | null;
};

export type StageObjectiveStatus =
  | 'non_commence'
  | 'en_cours'
  | 'atteint'
  | 'depasse'
  | 'non_atteint';

export type StageObjective = BaseRow & {
  stagiaire_id: string;
  title: string;
  description?: string | null;
  status: StageObjectiveStatus;
  validation_comment?: string | null;
};

export type StageJournal = BaseRow & {
  stagiaire_id: string;
  date: string;
  activity: string;
  competence?: string | null;
  duration_hours?: number | null;
  observation?: string | null;
  status: 'soumis' | 'valide' | 'commente';
  validated_by?: string | null;
  comment?: string | null;
};

export type FinalProject = BaseRow & {
  stagiaire_id: string;
  title: string;
  description?: string | null;
  supervisor_id?: string | null;
  objectives?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  deliverables: string[];
  members: unknown[];
  defense_date?: string | null;
  jury: unknown[];
  score?: number | null;
  appreciation?: string | null;
  comments?: string | null;
  status: 'en_cours' | 'soutenu' | 'valide' | 'non_valide' | 'archive';
};

export type FinalDecision = 'en_attente' | 'valide' | 'non_valide';

export type FinalEvaluation = BaseRow & {
  stagiaire_id: string;
  modules_average?: number | null;
  qcm_average?: number | null;
  tp_average?: number | null;
  project_average?: number | null;
  implication_average?: number | null;
  professionalism_average?: number | null;
  attendance_rate?: number | null;
  coefficients: Record<string, number>;
  final_average?: number | null;
  decision: FinalDecision;
  appreciation?: string | null;
  validated_by?: string | null;
  published_at?: string | null;
};

export type BulletinStatus = 'brouillon' | 'valide' | 'publie' | 'archive';

export type Bulletin = BaseRow & {
  stagiaire_id: string;
  final_evaluation_id?: string | null;
  period?: string | null;
  content: Record<string, unknown>;
  status: BulletinStatus;
  generated_by?: string | null;
  generated_at: string;
  published_by?: string | null;
  published_at?: string | null;
  file_url?: string | null;
};

export type DocumentType =
  | 'fiche_inscription'
  | 'fiche_stagiaire'
  | 'carte_stagiaire'
  | 'attestation_stage'
  | 'certificat_formation'
  | 'certificat_reussite'
  | 'releve_notes'
  | 'bulletin'
  | 'rapport_evaluation'
  | 'rapport_stage'
  | 'fiche_evaluation_finale';

export type DocumentRecord = BaseRow & {
  stagiaire_id: string;
  type: DocumentType;
  title: string;
  file_url?: string | null;
  content: Record<string, unknown>;
  generated_by?: string | null;
};

export type NotificationType =
  | 'info'
  | 'evaluation'
  | 'affectation'
  | 'presence'
  | 'echeance'
  | 'resultat'
  | 'plan'
  | 'bulletin';

export type AppNotification = BaseRow & {
  user_id?: string | null;
  stagiaire_id?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  channel: 'internal' | 'email' | 'sms' | 'push';
  status: 'unread' | 'read';
  link?: string | null;
  read_at?: string | null;
};

export type AuditLog = BaseRow & {
  user_id?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  reason?: string | null;
  validated_by?: string | null;
  ip_address?: string | null;
  created_at: string;
};

export type Setting = BaseRow & {
  key: string;
  value: Record<string, unknown>;
  description?: string | null;
};

export type GradingRule = BaseRow & {
  formation_id?: string | null;
  module_id?: string | null;
  category: string;
  weight: number;
  pass_mark: number;
  rounding: number;
};
