-- =====================================================================
-- STAGE-BUILD - IMPORT FORGE CONSOLE
-- Tables applicatives (la table users existe deja pour l auth Forge)
-- A importer via Forge Console > Schema > Import SQL
-- =====================================================================
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

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  nom text not null,
  postnom text,
  prenom text not null,
  sexe text check (sexe in ('M', 'F', 'Autre')),
  date_naissance date,
  telephone text not null,
  email text not null,
  formation_id uuid not null references formations(id) on delete cascade,
  promotion_id uuid not null references promotions(id) on delete cascade,
  status text not null default 'en_attente'
    check (status in ('en_attente', 'confirmee', 'annulee')),
  notes text,
  confirmed_at timestamptz,
  confirmed_by uuid references users(id) on delete set null,
  stagiaire_id uuid references stagiaires(id) on delete set null,
  inscription_id uuid references inscriptions(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reservations_status_idx on reservations(status);
create index if not exists reservations_promotion_idx on reservations(promotion_id, status);
create index if not exists reservations_email_idx on reservations(email);

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
