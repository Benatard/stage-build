-- =====================================================================
-- STAGE-BUILD — GESTION ET SUIVI DES STAGIAIRES
-- Schéma PostgreSQL pour Forge Console
-- =====================================================================
-- À exécuter dans le endpoint SQL de votre projet Forge Console.
--
-- Configuration Forge Console > Auth :
--   Table utilisateurs      : users
--   Colonne identifiant     : email
--   Colonne mot de passe    : password_hash
--   Durée du JWT            : 24 heures
--
-- IMPORTANT : marquer password_hash en colonne cachée (hidden) dans Forge
-- Console, puis ajouter le middleware require_auth sur les endpoints privés.
--
-- Compte initial :
--   email    : admin@stagebuild.local
--   password : Admin@123
--   À modifier immédiatement après la première connexion.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. STAGIAIRES
-- ---------------------------------------------------------------------
create table if not exists stagiaires (
  id uuid primary key default gen_random_uuid(),
  matricule text not null unique,
  nom text not null,
  postnom text,
  prenom text not null,
  sexe text check (sexe in ('M', 'F', 'Autre')),
  date_naissance date,
  lieu_naissance text,
  telephone text,
  email text unique,
  adresse text,
  photo_url text,
  contact_urgence_nom text,
  contact_urgence_telephone text,
  etablissement_origine text,
  niveau_etudes text,
  diplome text,
  domaine text,
  specialite text,
  statut text not null default 'candidat'
    check (statut in ('candidat', 'admis', 'actif', 'termine', 'archive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. COMPTES UTILISATEURS ET RÔLES
-- ---------------------------------------------------------------------
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  first_name text not null,
  last_name text not null,
  phone text,
  role text not null default 'stagiaire'
    check (role in ('admin', 'direction', 'responsable_formation',
                    'responsable_pedagogique', 'formateur', 'maitre_stage',
                    'administration', 'stagiaire', 'rh', 'auditeur')),
  statut text not null default 'active'
    check (statut in ('active', 'inactive', 'blocked')),
  last_login_at timestamptz,
  avatar_url text,
  stagiaire_id uuid references stagiaires(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  label text not null,
  permissions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists user_roles (
  user_id uuid not null references users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

-- ---------------------------------------------------------------------
-- 3. FORMATIONS, MODULES, PROMOTIONS
-- ---------------------------------------------------------------------
create table if not exists formations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  duration_months integer default 0,
  objectives text,
  level text,
  domain text,
  program text,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'archivee')),
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists modules (
  id uuid primary key default gen_random_uuid(),
  formation_id uuid not null references formations(id) on delete cascade,
  name text not null,
  description text,
  coefficient numeric(6,2) not null default 1,
  hours numeric(8,2) not null default 0,
  formateur_id uuid references users(id) on delete set null,
  objectives text,
  competencies jsonb not null default '[]'::jsonb,
  evaluation_types jsonb not null default '[]'::jsonb,
  pass_mark numeric(5,2) not null default 10,
  sort_order integer not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  formation_id uuid not null references formations(id) on delete cascade,
  code text not null unique,
  name text,
  start_date date,
  end_date date,
  capacity integer,
  status text not null default 'planifiee'
    check (status in ('planifiee', 'active', 'cloturee', 'archivee')),
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. INSCRIPTIONS ET AFFECTATIONS
-- ---------------------------------------------------------------------
create table if not exists inscriptions (
  id uuid primary key default gen_random_uuid(),
  stagiaire_id uuid not null references stagiaires(id) on delete cascade,
  formation_id uuid not null references formations(id) on delete cascade,
  promotion_id uuid references promotions(id) on delete set null,
  start_date date,
  end_date date,
  responsible_id uuid references users(id) on delete set null,
  status text not null default 'en_attente'
    check (status in ('en_attente', 'validee', 'annulee', 'terminee')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists affectations (
  id uuid primary key default gen_random_uuid(),
  stagiaire_id uuid not null references stagiaires(id) on delete cascade,
  inscription_id uuid references inscriptions(id) on delete cascade,
  formation_id uuid references formations(id) on delete set null,
  promotion_id uuid references promotions(id) on delete set null,
  service text,
  formateur_id uuid references users(id) on delete set null,
  maitre_stage_id uuid references users(id) on delete set null,
  groupe text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (stagiaire_id, inscription_id)
);

-- ---------------------------------------------------------------------
-- 5. SÉANCES ET PRÉSENCES
-- ---------------------------------------------------------------------
create table if not exists seances (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  promotion_id uuid references promotions(id) on delete set null,
  formateur_id uuid references users(id) on delete set null,
  title text,
  date date not null,
  start_time time,
  end_time time,
  room text,
  status text not null default 'planifiee'
    check (status in ('planifiee', 'en_cours', 'terminee', 'annulee')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists presences (
  id uuid primary key default gen_random_uuid(),
  seance_id uuid not null references seances(id) on delete cascade,
  stagiaire_id uuid not null references stagiaires(id) on delete cascade,
  status text not null default 'present'
    check (status in ('present', 'absent', 'retard', 'absence_justifiee',
                      'absence_non_justifiee', 'sortie_autorisee')),
  note text,
  recorded_by uuid references users(id) on delete set null,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seance_id, stagiaire_id)
);

-- ---------------------------------------------------------------------
-- 6. ÉVALUATIONS ET NOTES
-- ---------------------------------------------------------------------
create table if not exists evaluations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  formation_id uuid references formations(id) on delete set null,
  module_id uuid references modules(id) on delete set null,
  formateur_id uuid references users(id) on delete set null,
  type text not null default 'devoir'
    check (type in ('interrogation', 'devoir', 'qcm', 'examen', 'travail_pratique',
                    'projet', 'presentation', 'evaluation_orale',
                    'evaluation_competence', 'evaluation_comportementale',
                    'evaluation_finale')),
  date date,
  duration_minutes integer,
  max_score numeric(6,2) not null default 20,
  coefficient numeric(6,2) not null default 1,
  weight numeric(6,2) not null default 1,
  period text,
  status text not null default 'brouillon'
    check (status in ('brouillon', 'programmee', 'en_cours', 'terminee',
                      'corrigee', 'soumise', 'validee', 'publiee', 'archivee')),
  is_qcm boolean not null default false,
  feeds_gradebook boolean not null default true,
  instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references evaluations(id) on delete cascade,
  stagiaire_id uuid not null references stagiaires(id) on delete cascade,
  score numeric(6,2),
  max_score numeric(6,2) not null default 20,
  coefficient numeric(6,2) not null default 1,
  status text not null default 'saisie'
    check (status in ('saisie', 'soumise', 'validee', 'publiee')),
  comment text,
  graded_by uuid references users(id) on delete set null,
  graded_at timestamptz,
  validated_by uuid references users(id) on delete set null,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (evaluation_id, stagiaire_id),
  check (score is null or (score >= 0 and score <= max_score))
);

-- ---------------------------------------------------------------------
-- 7. QCM
-- ---------------------------------------------------------------------
create table if not exists qcm_questions (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references evaluations(id) on delete cascade,
  question_text text not null,
  type text not null default 'single'
    check (type in ('single', 'multiple', 'true_false', 'short_answer', 'matching')),
  options jsonb not null default '[]'::jsonb,
  correct_answer jsonb,
  points numeric(6,2) not null default 1,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists qcm_attempts (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references evaluations(id) on delete cascade,
  stagiaire_id uuid not null references stagiaires(id) on delete cascade,
  attempt_number integer not null default 1,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric(6,2),
  max_score numeric(6,2),
  percentage numeric(6,2),
  passed boolean,
  time_spent_seconds integer,
  answers jsonb not null default '{}'::jsonb,
  status text not null default 'en_cours'
    check (status in ('en_cours', 'soumis', 'corrige')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (evaluation_id, stagiaire_id, attempt_number)
);

-- ---------------------------------------------------------------------
-- 8. TRAVAUX PRATIQUES
-- ---------------------------------------------------------------------
create table if not exists travaux_pratiques (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  module_id uuid references modules(id) on delete set null,
  formateur_id uuid references users(id) on delete set null,
  description text,
  deadline timestamptz,
  deliverables jsonb not null default '[]'::jsonb,
  max_score numeric(6,2) not null default 20,
  coefficient numeric(6,2) not null default 1,
  status text not null default 'brouillon'
    check (status in ('brouillon', 'publie', 'cloture', 'archive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists travaux_soumissions (
  id uuid primary key default gen_random_uuid(),
  tp_id uuid not null references travaux_pratiques(id) on delete cascade,
  stagiaire_id uuid not null references stagiaires(id) on delete cascade,
  file_url text,
  file_name text,
  link_url text,
  submitted_at timestamptz not null default now(),
  status text not null default 'soumis'
    check (status in ('soumis', 'en_correction', 'corrige', 'valide', 'a_refaire')),
  score numeric(6,2),
  feedback text,
  graded_by uuid references users(id) on delete set null,
  graded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tp_id, stagiaire_id)
);

-- ---------------------------------------------------------------------
-- 9. COMPÉTENCES, IMPLICATION, COMPORTEMENT
-- ---------------------------------------------------------------------
create table if not exists competences (
  id uuid primary key default gen_random_uuid(),
  formation_id uuid references formations(id) on delete cascade,
  module_id uuid references modules(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists competence_levels (
  id uuid primary key default gen_random_uuid(),
  stagiaire_id uuid not null references stagiaires(id) on delete cascade,
  competence_id uuid not null references competences(id) on delete cascade,
  level text not null default 'non_acquis'
    check (level in ('non_acquis', 'a_renforcer', 'en_cours', 'acquis', 'maitrise')),
  comment text,
  evaluated_by uuid references users(id) on delete set null,
  evaluated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists implications (
  id uuid primary key default gen_random_uuid(),
  stagiaire_id uuid not null references stagiaires(id) on delete cascade,
  module_id uuid references modules(id) on delete set null,
  period text,
  participation numeric(5,2),
  assiduite numeric(5,2),
  curiosite numeric(5,2),
  questions numeric(5,2),
  travail_personnel numeric(5,2),
  collaboration numeric(5,2),
  respect_consignes numeric(5,2),
  autonomie numeric(5,2),
  average numeric(5,2),
  comment text,
  evaluated_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists comportements (
  id uuid primary key default gen_random_uuid(),
  stagiaire_id uuid not null references stagiaires(id) on delete cascade,
  period text,
  ponctualite numeric(5,2),
  discipline numeric(5,2),
  respect numeric(5,2),
  communication numeric(5,2),
  esprit_equipe numeric(5,2),
  autonomie numeric(5,2),
  responsabilite numeric(5,2),
  attitude_professionnelle numeric(5,2),
  respect_materiel numeric(5,2),
  capacite_adaptation numeric(5,2),
  average numeric(5,2),
  appreciation text,
  evaluated_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 10. OBSERVATIONS
-- ---------------------------------------------------------------------
create table if not exists observations (
  id uuid primary key default gen_random_uuid(),
  stagiaire_id uuid not null references stagiaires(id) on delete cascade,
  module_id uuid references modules(id) on delete set null,
  seance_id uuid references seances(id) on delete set null,
  evaluation_id uuid references evaluations(id) on delete set null,
  competence_id uuid references competences(id) on delete set null,
  author_id uuid references users(id) on delete set null,
  content text not null,
  visibility text not null default 'interne'
    check (visibility in ('interne', 'publiee', 'stagiaire')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 11. PLANS D'AMÉLIORATION
-- ---------------------------------------------------------------------
create table if not exists improvement_plans (
  id uuid primary key default gen_random_uuid(),
  stagiaire_id uuid not null references stagiaires(id) on delete cascade,
  difficulty text not null,
  objective text not null,
  start_date date,
  end_date date,
  responsible_id uuid references users(id) on delete set null,
  status text not null default 'cree'
    check (status in ('cree', 'en_cours', 'evalue', 'atteint', 'non_atteint')),
  evaluation_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists improvement_actions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references improvement_plans(id) on delete cascade,
  title text not null,
  type text,
  due_date date,
  status text not null default 'a_faire'
    check (status in ('a_faire', 'en_cours', 'termine', 'annule')),
  result text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 12. ÉVALUATIONS INTERMÉDIAIRES
-- ---------------------------------------------------------------------
create table if not exists intermediate_evaluations (
  id uuid primary key default gen_random_uuid(),
  stagiaire_id uuid not null references stagiaires(id) on delete cascade,
  date date not null default current_date,
  average numeric(5,2),
  attendance_rate numeric(5,2),
  qcm_average numeric(5,2),
  tp_average numeric(5,2),
  competencies_acquired integer default 0,
  implication_average numeric(5,2),
  behavior_average numeric(5,2),
  strengths text,
  improvements text,
  recommendations text,
  decision text not null default 'progression_normale'
    check (decision in ('progression_normale', 'surveillance',
                        'plan_amelioration', 'entretien_obligatoire')),
  observations text,
  evaluator_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 13. STAGE : OBJECTIFS, JOURNAL, PROJET FINAL
-- ---------------------------------------------------------------------
create table if not exists stage_objectives (
  id uuid primary key default gen_random_uuid(),
  stagiaire_id uuid not null references stagiaires(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'non_commence'
    check (status in ('non_commence', 'en_cours', 'atteint', 'depasse', 'non_atteint')),
  validation_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists stage_journal (
  id uuid primary key default gen_random_uuid(),
  stagiaire_id uuid not null references stagiaires(id) on delete cascade,
  date date not null default current_date,
  activity text not null,
  competence text,
  duration_hours numeric(5,2),
  observation text,
  status text not null default 'soumis'
    check (status in ('soumis', 'valide', 'commente')),
  validated_by uuid references users(id) on delete set null,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists final_projects (
  id uuid primary key default gen_random_uuid(),
  stagiaire_id uuid not null references stagiaires(id) on delete cascade,
  title text not null,
  description text,
  supervisor_id uuid references users(id) on delete set null,
  objectives text,
  start_date date,
  end_date date,
  deliverables jsonb not null default '[]'::jsonb,
  members jsonb not null default '[]'::jsonb,
  defense_date date,
  jury jsonb not null default '[]'::jsonb,
  score numeric(5,2),
  appreciation text,
  comments text,
  status text not null default 'en_cours'
    check (status in ('en_cours', 'soutenu', 'valide', 'non_valide', 'archive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 14. ÉVALUATION FINALE, BULLETINS, DOCUMENTS
-- ---------------------------------------------------------------------
create table if not exists final_evaluations (
  id uuid primary key default gen_random_uuid(),
  stagiaire_id uuid not null references stagiaires(id) on delete cascade,
  modules_average numeric(5,2),
  qcm_average numeric(5,2),
  tp_average numeric(5,2),
  project_average numeric(5,2),
  implication_average numeric(5,2),
  professionalism_average numeric(5,2),
  attendance_rate numeric(5,2),
  coefficients jsonb not null default '{}'::jsonb,
  final_average numeric(5,2),
  decision text not null default 'en_attente'
    check (decision in ('en_attente', 'valide', 'non_valide')),
  appreciation text,
  validated_by uuid references users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bulletins (
  id uuid primary key default gen_random_uuid(),
  stagiaire_id uuid not null references stagiaires(id) on delete cascade,
  final_evaluation_id uuid references final_evaluations(id) on delete set null,
  period text,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'brouillon'
    check (status in ('brouillon', 'valide', 'publie', 'archive')),
  generated_by uuid references users(id) on delete set null,
  generated_at timestamptz not null default now(),
  published_by uuid references users(id) on delete set null,
  published_at timestamptz,
  file_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  stagiaire_id uuid not null references stagiaires(id) on delete cascade,
  type text not null
    check (type in ('fiche_inscription', 'fiche_stagiaire', 'carte_stagiaire',
                    'attestation_stage', 'certificat_formation',
                    'certificat_reussite', 'releve_notes', 'bulletin',
                    'rapport_evaluation', 'rapport_stage',
                    'fiche_evaluation_finale')),
  title text not null,
  file_url text,
  content jsonb not null default '{}'::jsonb,
  generated_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 15. NOTIFICATIONS, AUDIT, PARAMÈTRES
-- ---------------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  stagiaire_id uuid references stagiaires(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info'
    check (type in ('info', 'evaluation', 'affectation', 'presence', 'echeance',
                    'resultat', 'plan', 'bulletin')),
  channel text not null default 'internal'
    check (channel in ('internal', 'email', 'sms', 'push')),
  status text not null default 'unread' check (status in ('unread', 'read')),
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  old_values jsonb,
  new_values jsonb,
  reason text,
  validated_by uuid references users(id) on delete set null,
  ip_address text,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_at timestamptz not null default now()
);

create table if not exists grading_rules (
  id uuid primary key default gen_random_uuid(),
  formation_id uuid references formations(id) on delete cascade,
  module_id uuid references modules(id) on delete cascade,
  category text not null,
  weight numeric(6,2) not null default 0,
  pass_mark numeric(5,2) not null default 10,
  rounding numeric(3,2) not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 16. INDEX
-- ---------------------------------------------------------------------
create index if not exists idx_stagiaires_matricule on stagiaires (matricule);
create index if not exists idx_stagiaires_statut on stagiaires (statut);
create index if not exists idx_users_role on users (role);
create index if not exists idx_modules_formation on modules (formation_id);
create index if not exists idx_modules_formateur on modules (formateur_id);
create index if not exists idx_promotions_formation on promotions (formation_id);
create index if not exists idx_inscriptions_stagiaire on inscriptions (stagiaire_id);
create index if not exists idx_inscriptions_promotion on inscriptions (promotion_id);
create index if not exists idx_affectations_stagiaire on affectations (stagiaire_id);
create index if not exists idx_seances_module on seances (module_id);
create index if not exists idx_seances_promotion on seances (promotion_id);
create index if not exists idx_presences_seance on presences (seance_id);
create index if not exists idx_presences_stagiaire on presences (stagiaire_id);
create index if not exists idx_evaluations_module on evaluations (module_id);
create index if not exists idx_evaluations_formateur on evaluations (formateur_id);
create index if not exists idx_notes_evaluation on notes (evaluation_id);
create index if not exists idx_notes_stagiaire on notes (stagiaire_id);
create index if not exists idx_qcm_questions_evaluation on qcm_questions (evaluation_id);
create index if not exists idx_qcm_attempts_stagiaire on qcm_attempts (stagiaire_id);
create index if not exists idx_tp_module on travaux_pratiques (module_id);
create index if not exists idx_tp_soumissions_stagiaire on travaux_soumissions (stagiaire_id);
create index if not exists idx_competences_module on competences (module_id);
create index if not exists idx_competence_levels_stagiaire on competence_levels (stagiaire_id);
create index if not exists idx_implications_stagiaire on implications (stagiaire_id);
create index if not exists idx_comportements_stagiaire on comportements (stagiaire_id);
create index if not exists idx_observations_stagiaire on observations (stagiaire_id);
create index if not exists idx_plans_stagiaire on improvement_plans (stagiaire_id);
create index if not exists idx_actions_plan on improvement_actions (plan_id);
create index if not exists idx_intermediate_stagiaire on intermediate_evaluations (stagiaire_id);
create index if not exists idx_objectives_stagiaire on stage_objectives (stagiaire_id);
create index if not exists idx_journal_stagiaire on stage_journal (stagiaire_id);
create index if not exists idx_projects_stagiaire on final_projects (stagiaire_id);
create index if not exists idx_final_eval_stagiaire on final_evaluations (stagiaire_id);
create index if not exists idx_bulletins_stagiaire on bulletins (stagiaire_id);
create index if not exists idx_documents_stagiaire on documents (stagiaire_id);
create index if not exists idx_notifications_user on notifications (user_id, status);
create index if not exists idx_audit_entity on audit_logs (entity, entity_id);
create index if not exists idx_audit_user on audit_logs (user_id);

-- ---------------------------------------------------------------------
-- 17. TRIGGERS updated_at
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'stagiaires', 'users', 'formations', 'modules', 'promotions',
    'inscriptions', 'affectations', 'seances', 'presences', 'evaluations',
    'notes', 'qcm_questions', 'qcm_attempts', 'travaux_pratiques',
    'travaux_soumissions', 'competences', 'implications', 'comportements',
    'observations', 'improvement_plans', 'improvement_actions',
    'intermediate_evaluations', 'stage_objectives', 'stage_journal',
    'final_projects', 'final_evaluations', 'bulletins', 'grading_rules'
  ]
  loop
    execute format('drop trigger if exists trg_%I_updated_at on %I', t, t);
    execute format(
      'create trigger trg_%I_updated_at before update on %I for each row execute function set_updated_at()',
      t, t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- 18. VUES UTILES POUR LES RAPPORTS
-- ---------------------------------------------------------------------
create or replace view v_stagiaire_presences as
select
  p.stagiaire_id,
  count(*) as total_seances,
  count(*) filter (where p.status = 'present') as presences,
  count(*) filter (where p.status = 'retard') as retards,
  count(*) filter (where p.status in ('absent', 'absence_justifiee', 'absence_non_justifiee')) as absences,
  round(
    (count(*) filter (where p.status in ('present', 'retard'))::numeric / nullif(count(*), 0)) * 100,
    2
  ) as taux_presence
from presences p
group by p.stagiaire_id;

create or replace view v_stagiaire_competences_latest as
select distinct on (cl.stagiaire_id, cl.competence_id)
  cl.stagiaire_id,
  cl.competence_id,
  c.name as competence_name,
  cl.level,
  cl.evaluated_at
from competence_levels cl
join competences c on c.id = cl.competence_id
order by cl.stagiaire_id, cl.competence_id, cl.evaluated_at desc;

-- ---------------------------------------------------------------------
-- 19. SEED — RÔLES ET PARAMÈTRES
-- ---------------------------------------------------------------------
insert into roles (name, label, permissions) values
  ('admin', 'Administrateur système', '["*"]'::jsonb),
  ('direction', 'Direction', '["dashboard","stagiaires","formations","promotions","inscriptions","affectations","seances","presences","evaluations","notes","qcm","travaux","competences","implication","comportement","observations","progression","plans","intermediate","journal","objectives","project","final","bulletins","documents","reports","archive","notifications","search","grade_validate","bulletin_publish"]'::jsonb),
  ('responsable_formation', 'Responsable de formation', '["dashboard","stagiaires","formations","promotions","inscriptions","affectations","seances","presences","evaluations","notes","qcm","travaux","competences","implication","comportement","observations","progression","plans","intermediate","journal","objectives","project","final","bulletins","documents","reports","notifications","search","grade_validate","bulletin_publish"]'::jsonb),
  ('responsable_pedagogique', 'Responsable pédagogique', '["dashboard","stagiaires","formations","promotions","inscriptions","affectations","seances","presences","evaluations","notes","qcm","travaux","competences","implication","comportement","observations","progression","plans","intermediate","journal","objectives","project","final","bulletins","documents","reports","notifications","search","grade_validate"]'::jsonb),
  ('formateur', 'Formateur', '["dashboard","stagiaires","formations","promotions","seances","presences","evaluations","notes","qcm","travaux","competences","implication","comportement","observations","progression","plans","journal","objectives","project","notifications","search"]'::jsonb),
  ('maitre_stage', 'Maître de stage', '["dashboard","stagiaires","objectives","journal","competences","implication","comportement","observations","project","notifications","search"]'::jsonb),
  ('administration', 'Service administratif', '["dashboard","stagiaires","inscriptions","affectations","documents","notifications","search","archive"]'::jsonb),
  ('stagiaire', 'Stagiaire', '["dashboard","stagiaires","evaluations","notes","qcm","travaux","competences","progression","observations","journal","objectives","project","documents","bulletins","notifications","search"]'::jsonb),
  ('rh', 'Ressources humaines', '["dashboard","stagiaires","reports","documents","notifications","search"]'::jsonb),
  ('auditeur', 'Auditeur / Superviseur', '["dashboard","stagiaires","reports","audit","notifications","search"]'::jsonb)
on conflict (name) do update
set label = excluded.label,
    permissions = excluded.permissions;

insert into settings (key, value, description) values
  ('organization', '{"name":"FLASH EMPIRE","address":"Kolwezi, Province du Lualaba, RDC","phone":"+243 000 000 000","email":"contact@flashempire.cd","logo_url":"/images/logo-mark.svg"}'::jsonb, 'Informations de l’organisation'),
  ('attendance_thresholds', '{"normal":90,"attention":80}'::jsonb, 'Seuils d’alerte de présence'),
  ('grading_weights', '{"qcm":10,"tp":30,"examen":40,"project":20}'::jsonb, 'Pondération par défaut des catégories'),
  ('rounding', '2'::jsonb, 'Nombre de décimales des moyennes'),
  ('pass_mark', '10'::jsonb, 'Seuil de réussite sur 20'),
  ('max_score', '20'::jsonb, 'Barème par défaut')
on conflict (key) do nothing;

insert into grading_rules (category, weight, pass_mark, rounding)
select seed.category, seed.weight, seed.pass_mark, seed.rounding
from (
  values
    ('qcm', 10, 10, 2),
    ('tp', 30, 10, 2),
    ('examen', 40, 10, 2),
    ('projet', 20, 10, 2)
) as seed(category, weight, pass_mark, rounding)
where not exists (
  select 1 from grading_rules existing where existing.category = seed.category
);

-- ---------------------------------------------------------------------
-- 20. SEED — ADMINISTRATEUR INITIAL
-- ---------------------------------------------------------------------
insert into users (
  email, password_hash, first_name, last_name, role, statut
) values (
  'admin@stagebuild.local',
  crypt('Admin@123', gen_salt('bf')),
  'Administrateur',
  'Stage Build',
  'admin',
  'active'
)
on conflict (email) do nothing;

insert into user_roles (user_id, role_id)
select u.id, r.id
from users u
join roles r on r.name = 'admin'
where u.email = 'admin@stagebuild.local'
on conflict do nothing;
