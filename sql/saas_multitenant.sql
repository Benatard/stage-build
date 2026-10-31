-- =====================================================================
-- STAGE-BUILD — MIGRATION SAAS MULTI-INSTITUTIONS
-- =====================================================================
-- À exécuter APRÈS les scripts existants (forge_stagiaires.sql,
-- forge_import.sql, add_reservations.sql), dans Forge Console > SQL.
--
-- Ce script est idempotent : il peut être rejoué sans casser les données.
-- Il crée la couche SaaS (institutions, offres, abonnements, memberships)
-- puis rattache TOUTES les tables métier à une institution.
--
-- ⚠️ IMPORTANT
--   1. Sauvegardez la base avant exécution.
--   2. Le script crée une institution par défaut et y rattache les données
--      existantes. Renommez-la ensuite depuis la console plateforme.
--   3. L'isolation serveur réelle (RLS pilotée par le JWT) reste limitée
--      avec Forge Console : le frontend applique un scoping strict, et les
--      policies RLS sont fournies en fin de fichier (à activer uniquement
--      si votre backend/Forge injecte app.institution_id).
-- =====================================================================

create extension if not exists pgcrypto;

-- Catalogue de rôles (créé seulement s'il n'existe pas déjà).
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
-- 1. INSTITUTIONS (TENANTS)
-- ---------------------------------------------------------------------
create table if not exists institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  code text not null unique,
  type text not null default 'centre_formation'
    check (type in ('ecole', 'centre_formation', 'entreprise', 'universite',
                    'organisme_public', 'autre')),
  status text not null default 'active'
    check (status in ('active', 'essai', 'suspendue', 'archivee')),
  is_public boolean not null default true,
  email text,
  phone text,
  website text,
  address text,
  city text,
  country text,
  logo_url text,
  primary_color text default '#2563eb',
  secondary_color text,
  timezone text not null default 'Africa/Kinshasa',
  currency text not null default 'CDF',
  locale text not null default 'fr',
  owner_user_id uuid references users(id) on delete set null,
  settings jsonb not null default '{}'::jsonb,
  trial_ends_at timestamptz,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists institutions_status_idx on institutions(status);
create index if not exists institutions_type_idx on institutions(type);

-- Visibilite sur la page publique de reservation.
alter table institutions add column if not exists is_public boolean;
update institutions
set is_public = false
where is_public is null
  and (slug = 'institution-principale' or code = 'INST-DEFAULT');
update institutions set is_public = true where is_public is null;
alter table institutions alter column is_public set default true;
alter table institutions alter column is_public set not null;

-- Répare les institutions créées par une version antérieure du schéma.
update institutions
set name = coalesce(nullif(btrim(name), ''), 'Institution sans nom')
where name is null or btrim(name) = '';

update institutions
set code = 'INST-' || upper(substr(replace(id::text, '-', ''), 1, 8))
where code is null or btrim(code) = '';

update institutions
set slug = 'institution-' || substr(id::text, 1, 8)
where slug is null or btrim(slug) = '';

update institutions
set type = 'centre_formation'
where type is null;

update institutions
set status = 'active'
where status is null;

-- ---------------------------------------------------------------------
-- 2. OFFRES, ABONNEMENTS, MEMBERSHIPS
-- ---------------------------------------------------------------------
create table if not exists saas_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  price_monthly numeric(12,2) not null default 0,
  price_yearly numeric(12,2) not null default 0,
  currency text not null default 'USD',
  max_users integer,
  max_stagiaires integer,
  max_formations integer,
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists institution_subscriptions (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id) on delete cascade,
  plan_id uuid not null references saas_plans(id) on delete restrict,
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'canceled', 'expired')),
  billing_cycle text not null default 'monthly'
    check (billing_cycle in ('monthly', 'yearly')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  trial_ends_at timestamptz,
  seats integer,
  amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists institution_subscriptions_active_uidx
  on institution_subscriptions(institution_id)
  where status in ('trialing', 'active', 'past_due');

create table if not exists institution_memberships (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'invited', 'suspended', 'removed')),
  is_primary boolean not null default false,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, user_id)
);

create table if not exists membership_roles (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references institution_memberships(id) on delete cascade,
  role text not null
    check (role in ('supra_admin', 'directeur', 'admin_institution',
                    'responsable_pedagogique', 'responsable_formation',
                    'formateur', 'encadreur', 'service_administratif',
                    'stagiaire', 'rh', 'auditeur')),
  created_at timestamptz not null default now(),
  unique (membership_id, role)
);

-- ---------------------------------------------------------------------
-- 3. STRUCTURE INSTITUTIONNELLE
-- ---------------------------------------------------------------------
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  manager_id uuid references users(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, code)
);

create table if not exists document_templates (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id) on delete cascade,
  name text not null,
  type text not null,
  content jsonb not null default '{}'::jsonb,
  file_url text,
  is_default boolean not null default false,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists institution_invitations (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id) on delete cascade,
  email text not null,
  role text not null
    check (role in ('directeur', 'admin_institution', 'responsable_pedagogique',
                    'responsable_formation', 'formateur', 'encadreur',
                    'service_administratif', 'stagiaire', 'rh', 'auditeur')),
  token text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'expired', 'revoked')),
  invited_by uuid references users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists institution_invitations_institution_idx
  on institution_invitations(institution_id, status);

create table if not exists platform_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. DONNÉES DE DÉMARRAGE
-- ---------------------------------------------------------------------
insert into institutions (
  name, slug, code, type, status, is_public, email, city, country, currency, locale
)
values (
  'Institution principale', 'institution-principale', 'INST-DEFAULT',
  'centre_formation', 'active', false, null, null, 'RDC', 'CDF', 'fr'
)
on conflict (slug) do nothing;

insert into saas_plans (code, name, description, price_monthly, price_yearly,
                        currency, max_users, max_stagiaires, max_formations,
                        features, sort_order)
values
  ('starter', 'Starter', 'Pour les petites structures qui démarrent.',
   29, 290, 'USD', 10, 100, 5,
   '["Gestion des stagiaires","Formations et promotions","Bulletins"]'::jsonb, 1),
  ('pro', 'Pro', 'Pour les centres de formation en croissance.',
   79, 790, 'USD', 50, 1000, 50,
   '["Tout Starter","QCM et travaux pratiques","Rapports avancés","Modèles de documents"]'::jsonb, 2),
  ('enterprise', 'Entreprise', 'Pour les groupes multi-sites.',
   199, 1990, 'USD', null, null, null,
   '["Utilisateurs illimités","Multi-services","Support prioritaire","Audit avancé"]'::jsonb, 3)
on conflict (code) do nothing;

insert into institution_subscriptions (
  institution_id, plan_id, status, billing_cycle, starts_at, amount, currency
)
select i.id, p.id, 'active', 'monthly', now(), p.price_monthly, p.currency
from institutions i
join saas_plans p on p.code = 'pro'
where i.slug = 'institution-principale'
  and not exists (
    select 1 from institution_subscriptions s where s.institution_id = i.id
  );

insert into platform_settings (key, value, description)
values
  ('platform_name', '{"value":"StageBuild"}'::jsonb, 'Nom commercial de la plateforme'),
  ('support_email', '{"value":"support@stagebuild.local"}'::jsonb, 'Email de support'),
  ('default_currency', '{"value":"USD"}'::jsonb, 'Devise par défaut des abonnements'),
  ('maintenance_mode', '{"value":false}'::jsonb, 'Active le mode maintenance global')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- 5. RATTACHEMENT DES TABLES EXISTANTES À UNE INSTITUTION
-- ---------------------------------------------------------------------
do $$
declare
  v_default uuid;
  t text;
  cascade_tables text[] := array[
    'stagiaires', 'formations', 'modules', 'promotions', 'inscriptions',
    'reservations', 'affectations', 'seances', 'presences', 'evaluations',
    'notes', 'qcm_questions', 'qcm_attempts', 'travaux_pratiques',
    'travaux_soumissions', 'competences', 'competence_levels', 'implications',
    'comportements', 'observations', 'improvement_plans', 'improvement_actions',
    'intermediate_evaluations', 'stage_objectives', 'stage_journal',
    'final_projects', 'final_evaluations', 'bulletins', 'documents',
    'settings', 'grading_rules'
  ];
  set_null_tables text[] := array['users', 'notifications', 'audit_logs'];
begin
  select id into v_default from institutions where slug = 'institution-principale';

  foreach t in array cascade_tables || set_null_tables loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format(
        'alter table public.%I add column if not exists institution_id uuid',
        t
      );
      execute format(
        'update public.%I set institution_id = %L where institution_id is null',
        t, v_default
      );
      execute format(
        'create index if not exists %I on public.%I (institution_id)',
        t || '_institution_idx', t
      );
    end if;
  end loop;

  -- Colonnes utilisées par la console plateforme.
  if to_regclass('public.users') is not null then
    execute 'alter table public.users add column if not exists is_supra_admin boolean not null default false';
    execute 'alter table public.users add column if not exists must_change_password boolean not null default false';
  end if;

  if to_regclass('public.roles') is not null then
    execute 'alter table public.roles add column if not exists institution_id uuid references public.institutions(id) on delete cascade';
  end if;

  -- Contraintes de clé étrangère.
  foreach t in array cascade_tables loop
    if to_regclass(format('public.%I', t)) is not null
       and not exists (
         select 1 from pg_constraint where conname = t || '_institution_id_fkey'
       ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (institution_id) references public.institutions(id) on delete cascade',
        t, t || '_institution_id_fkey'
      );
    end if;
  end loop;

  foreach t in array set_null_tables loop
    if to_regclass(format('public.%I', t)) is not null
       and not exists (
         select 1 from pg_constraint where conname = t || '_institution_id_fkey'
       ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (institution_id) references public.institutions(id) on delete set null',
        t, t || '_institution_id_fkey'
      );
    end if;
  end loop;

  -- Les tables métier sont désormais obligatoirement rattachées.
  foreach t in array cascade_tables loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format(
        'alter table public.%I alter column institution_id set not null',
        t
      );
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 6. ANCIENNES CONTRAINTES D'UNICITÉ GLOBALES → COMPOSITES PAR INSTITUTION
-- ---------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('stagiaires', 'stagiaires_matricule_key'),
      ('stagiaires', 'stagiaires_email_key'),
      ('promotions', 'promotions_code_key'),
      ('reservations', 'reservations_reference_key'),
      ('settings', 'settings_key_key'),
      ('roles', 'roles_name_key'),
      ('affectations', 'affectations_stagiaire_id_inscription_id_key'),
      ('presences', 'presences_seance_id_stagiaire_id_key'),
      ('notes', 'notes_evaluation_id_stagiaire_id_key'),
      ('qcm_attempts', 'qcm_attempts_evaluation_id_stagiaire_id_attempt_number_key'),
      ('travaux_soumissions', 'travaux_soumissions_tp_id_stagiaire_id_key')
    ) as x(tbl, cons)
  loop
    if to_regclass(format('public.%I', r.tbl)) is not null then
      execute format(
        'alter table public.%I drop constraint if exists %I',
        r.tbl, r.cons
      );
    end if;
  end loop;
end $$;

create unique index if not exists stagiaires_institution_matricule_uidx
  on stagiaires(institution_id, matricule);
create unique index if not exists stagiaires_institution_email_uidx
  on stagiaires(institution_id, email) where email is not null;
create unique index if not exists promotions_institution_code_uidx
  on promotions(institution_id, code);
create unique index if not exists reservations_institution_reference_uidx
  on reservations(institution_id, reference);
create unique index if not exists settings_institution_key_uidx
  on settings(institution_id, key);
create unique index if not exists services_institution_code_uidx
  on services(institution_id, code);

create unique index if not exists affectations_institution_unique_uidx
  on affectations(institution_id, stagiaire_id, inscription_id);
create unique index if not exists presences_institution_unique_uidx
  on presences(institution_id, seance_id, stagiaire_id);
create unique index if not exists notes_institution_unique_uidx
  on notes(institution_id, evaluation_id, stagiaire_id);
create unique index if not exists qcm_attempts_institution_unique_uidx
  on qcm_attempts(institution_id, evaluation_id, stagiaire_id, attempt_number);
create unique index if not exists travaux_soumissions_institution_unique_uidx
  on travaux_soumissions(institution_id, tp_id, stagiaire_id);

create unique index if not exists roles_name_global_uidx
  on roles(name) where institution_id is null;
create unique index if not exists roles_name_institution_uidx
  on roles(institution_id, name) where institution_id is not null;

-- ---------------------------------------------------------------------
-- 7. RÔLES SAAS
-- ---------------------------------------------------------------------
-- Retire l'ancienne contrainte avant la migration des valeurs.
do $$
begin
  if to_regclass('public.users') is not null then
    execute 'alter table public.users drop constraint if exists users_role_check';
  end if;
end $$;

update users set role = 'supra_admin' where role = 'admin';
update users set role = 'directeur' where role = 'direction';
update users set role = 'service_administratif' where role = 'administration';
update users set role = 'encadreur' where role = 'maitre_stage';
update users set is_supra_admin = true where role = 'supra_admin';

do $$
begin
  if to_regclass('public.users') is not null
     and not exists (
       select 1 from pg_constraint where conname = 'users_role_check'
     ) then
    execute $sql$
      alter table public.users
        add constraint users_role_check check (role in (
          'supra_admin', 'directeur', 'admin_institution',
          'responsable_pedagogique', 'responsable_formation',
          'formateur', 'encadreur', 'service_administratif',
          'stagiaire', 'rh', 'auditeur',
          'admin', 'direction', 'administration', 'maitre_stage'
        ))
    $sql$;
  end if;
end $$;

insert into roles (name, label, permissions, institution_id)
select v.name, v.label, '[]'::jsonb, null
from (values
  ('supra_admin', 'Super administrateur plateforme'),
  ('directeur', 'Directeur d’institution'),
  ('admin_institution', 'Administrateur institutionnel'),
  ('responsable_formation', 'Responsable de formation'),
  ('responsable_pedagogique', 'Responsable pédagogique'),
  ('formateur', 'Formateur'),
  ('encadreur', 'Encadreur / Maître de stage'),
  ('service_administratif', 'Service administratif'),
  ('stagiaire', 'Stagiaire'),
  ('rh', 'Ressources humaines'),
  ('auditeur', 'Auditeur / Superviseur')
) as v(name, label)
where not exists (
  select 1 from roles r where r.name = v.name and r.institution_id is null
);

-- ---------------------------------------------------------------------
-- 8. COHÉRENCE INSTITUTIONNELLE ENTRE TABLES LIÉES
-- ---------------------------------------------------------------------
create or replace function public.enforce_institution_consistency()
returns trigger
language plpgsql
as $$
declare
  i integer := 0;
  parent_column text;
  parent_table text;
  parent_institution uuid;
  child_value uuid;
begin
  if new.institution_id is null then
    return new;
  end if;

  while i < tg_nargs loop
    parent_column := tg_argv[i];
    parent_table := tg_argv[i + 1];
    child_value := (to_jsonb(new) ->> parent_column)::uuid;

    if child_value is not null then
      execute format(
        'select institution_id from public.%I where id = $1',
        parent_table
      ) into parent_institution using child_value;

      if parent_institution is distinct from new.institution_id then
        raise exception
          'Incohérence institutionnelle : %.% ne correspond pas à l’institution de %',
          tg_table_name, parent_column, parent_table
          using errcode = '23514';
      end if;
    end if;

    i := i + 2;
  end loop;

  return new;
end;
$$;

drop trigger if exists enforce_institution_modules on modules;
create trigger enforce_institution_modules
  before insert or update on modules
  for each row execute function public.enforce_institution_consistency(
    'formation_id', 'formations'
  );

drop trigger if exists enforce_institution_promotions on promotions;
create trigger enforce_institution_promotions
  before insert or update on promotions
  for each row execute function public.enforce_institution_consistency(
    'formation_id', 'formations'
  );

drop trigger if exists enforce_institution_inscriptions on inscriptions;
create trigger enforce_institution_inscriptions
  before insert or update on inscriptions
  for each row execute function public.enforce_institution_consistency(
    'stagiaire_id', 'stagiaires',
    'formation_id', 'formations',
    'promotion_id', 'promotions'
  );

drop trigger if exists enforce_institution_reservations on reservations;
create trigger enforce_institution_reservations
  before insert or update on reservations
  for each row execute function public.enforce_institution_consistency(
    'formation_id', 'formations',
    'promotion_id', 'promotions',
    'stagiaire_id', 'stagiaires',
    'inscription_id', 'inscriptions'
  );

drop trigger if exists enforce_institution_affectations on affectations;
create trigger enforce_institution_affectations
  before insert or update on affectations
  for each row execute function public.enforce_institution_consistency(
    'stagiaire_id', 'stagiaires',
    'inscription_id', 'inscriptions',
    'formation_id', 'formations',
    'promotion_id', 'promotions'
  );

drop trigger if exists enforce_institution_seances on seances;
create trigger enforce_institution_seances
  before insert or update on seances
  for each row execute function public.enforce_institution_consistency(
    'module_id', 'modules',
    'promotion_id', 'promotions'
  );

drop trigger if exists enforce_institution_presences on presences;
create trigger enforce_institution_presences
  before insert or update on presences
  for each row execute function public.enforce_institution_consistency(
    'seance_id', 'seances',
    'stagiaire_id', 'stagiaires'
  );

drop trigger if exists enforce_institution_evaluations on evaluations;
create trigger enforce_institution_evaluations
  before insert or update on evaluations
  for each row execute function public.enforce_institution_consistency(
    'formation_id', 'formations',
    'module_id', 'modules'
  );

drop trigger if exists enforce_institution_notes on notes;
create trigger enforce_institution_notes
  before insert or update on notes
  for each row execute function public.enforce_institution_consistency(
    'evaluation_id', 'evaluations',
    'stagiaire_id', 'stagiaires'
  );

drop trigger if exists enforce_institution_qcm_questions on qcm_questions;
create trigger enforce_institution_qcm_questions
  before insert or update on qcm_questions
  for each row execute function public.enforce_institution_consistency(
    'evaluation_id', 'evaluations'
  );

drop trigger if exists enforce_institution_qcm_attempts on qcm_attempts;
create trigger enforce_institution_qcm_attempts
  before insert or update on qcm_attempts
  for each row execute function public.enforce_institution_consistency(
    'evaluation_id', 'evaluations',
    'stagiaire_id', 'stagiaires'
  );

drop trigger if exists enforce_institution_travaux on travaux_pratiques;
create trigger enforce_institution_travaux
  before insert or update on travaux_pratiques
  for each row execute function public.enforce_institution_consistency(
    'module_id', 'modules'
  );

drop trigger if exists enforce_institution_travaux_soumissions on travaux_soumissions;
create trigger enforce_institution_travaux_soumissions
  before insert or update on travaux_soumissions
  for each row execute function public.enforce_institution_consistency(
    'tp_id', 'travaux_pratiques',
    'stagiaire_id', 'stagiaires'
  );

drop trigger if exists enforce_institution_competences on competences;
create trigger enforce_institution_competences
  before insert or update on competences
  for each row execute function public.enforce_institution_consistency(
    'formation_id', 'formations',
    'module_id', 'modules'
  );

drop trigger if exists enforce_institution_competence_levels on competence_levels;
create trigger enforce_institution_competence_levels
  before insert or update on competence_levels
  for each row execute function public.enforce_institution_consistency(
    'stagiaire_id', 'stagiaires',
    'competence_id', 'competences'
  );

drop trigger if exists enforce_institution_implications on implications;
create trigger enforce_institution_implications
  before insert or update on implications
  for each row execute function public.enforce_institution_consistency(
    'stagiaire_id', 'stagiaires',
    'module_id', 'modules'
  );

drop trigger if exists enforce_institution_comportements on comportements;
create trigger enforce_institution_comportements
  before insert or update on comportements
  for each row execute function public.enforce_institution_consistency(
    'stagiaire_id', 'stagiaires'
  );

drop trigger if exists enforce_institution_observations on observations;
create trigger enforce_institution_observations
  before insert or update on observations
  for each row execute function public.enforce_institution_consistency(
    'stagiaire_id', 'stagiaires',
    'module_id', 'modules',
    'seance_id', 'seances',
    'evaluation_id', 'evaluations',
    'competence_id', 'competences'
  );

drop trigger if exists enforce_institution_plans on improvement_plans;
create trigger enforce_institution_plans
  before insert or update on improvement_plans
  for each row execute function public.enforce_institution_consistency(
    'stagiaire_id', 'stagiaires'
  );

drop trigger if exists enforce_institution_actions on improvement_actions;
create trigger enforce_institution_actions
  before insert or update on improvement_actions
  for each row execute function public.enforce_institution_consistency(
    'plan_id', 'improvement_plans'
  );

drop trigger if exists enforce_institution_intermediate on intermediate_evaluations;
create trigger enforce_institution_intermediate
  before insert or update on intermediate_evaluations
  for each row execute function public.enforce_institution_consistency(
    'stagiaire_id', 'stagiaires'
  );

drop trigger if exists enforce_institution_objectives on stage_objectives;
create trigger enforce_institution_objectives
  before insert or update on stage_objectives
  for each row execute function public.enforce_institution_consistency(
    'stagiaire_id', 'stagiaires'
  );

drop trigger if exists enforce_institution_journal on stage_journal;
create trigger enforce_institution_journal
  before insert or update on stage_journal
  for each row execute function public.enforce_institution_consistency(
    'stagiaire_id', 'stagiaires'
  );

drop trigger if exists enforce_institution_projects on final_projects;
create trigger enforce_institution_projects
  before insert or update on final_projects
  for each row execute function public.enforce_institution_consistency(
    'stagiaire_id', 'stagiaires'
  );

drop trigger if exists enforce_institution_finals on final_evaluations;
create trigger enforce_institution_finals
  before insert or update on final_evaluations
  for each row execute function public.enforce_institution_consistency(
    'stagiaire_id', 'stagiaires'
  );

drop trigger if exists enforce_institution_bulletins on bulletins;
create trigger enforce_institution_bulletins
  before insert or update on bulletins
  for each row execute function public.enforce_institution_consistency(
    'stagiaire_id', 'stagiaires',
    'final_evaluation_id', 'final_evaluations'
  );

drop trigger if exists enforce_institution_documents on documents;
create trigger enforce_institution_documents
  before insert or update on documents
  for each row execute function public.enforce_institution_consistency(
    'stagiaire_id', 'stagiaires'
  );

drop trigger if exists enforce_institution_grading_rules on grading_rules;
create trigger enforce_institution_grading_rules
  before insert or update on grading_rules
  for each row execute function public.enforce_institution_consistency(
    'formation_id', 'formations',
    'module_id', 'modules'
  );

-- ---------------------------------------------------------------------
-- 9. VUE DE PILOTAGE PLATEFORME
-- ---------------------------------------------------------------------
create or replace view public.institution_stats as
select
  i.id as institution_id,
  i.name,
  i.code,
  i.status,
  i.created_at,
  (select count(*) from users u where u.institution_id = i.id) as users_count,
  (select count(*) from stagiaires s where s.institution_id = i.id) as stagiaires_count,
  (select count(*) from stagiaires s where s.institution_id = i.id and s.statut = 'actif') as active_stagiaires_count,
  (select count(*) from formations f where f.institution_id = i.id) as formations_count,
  (select count(*) from promotions p where p.institution_id = i.id) as promotions_count,
  (select count(*) from inscriptions n where n.institution_id = i.id) as inscriptions_count,
  (select count(*) from reservations r where r.institution_id = i.id) as reservations_count,
  (select count(*) from institution_subscriptions s
     where s.institution_id = i.id and s.status = 'active') as active_subscriptions_count
from institutions i;

-- ---------------------------------------------------------------------
-- 10. RLS OPTIONNELLE (À ACTIVER SEULEMENT AVEC UN BACKEND QUI INJECTE
--     app.institution_id DANS CHAQUE REQUÊTE)
-- ---------------------------------------------------------------------
-- Forge Console ne positionne pas automatiquement ce paramètre. Activer
-- ces policies sans mécanisme serveur bloquerait toutes les lectures.
--
-- create or replace function public.app_current_institution_id()
-- returns uuid language sql stable as $$
--   select nullif(current_setting('app.institution_id', true), '')::uuid
-- $$;
--
-- alter table stagiaires enable row level security;
-- create policy stagiaires_tenant_isolation on stagiaires
--   using (institution_id = public.app_current_institution_id())
--   with check (institution_id = public.app_current_institution_id());
--
-- -- Répéter pour chaque table métier :
-- -- formations, modules, promotions, inscriptions, reservations, affectations,
-- -- seances, presences, evaluations, notes, qcm_questions, qcm_attempts,
-- -- travaux_pratiques, travaux_soumissions, competences, competence_levels,
-- -- implications, comportements, observations, improvement_plans,
-- -- improvement_actions, intermediate_evaluations, stage_objectives,
-- -- stage_journal, final_projects, final_evaluations, bulletins, documents,
-- -- notifications, audit_logs, settings, grading_rules, services,
-- -- document_templates, institution_invitations, institution_memberships.
--
-- Les tables globales (institutions, saas_plans, platform_settings) restent
-- accessibles uniquement aux rôles plateforme via les policies du backend.
