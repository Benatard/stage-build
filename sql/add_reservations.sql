-- Migration : reservations d'inscription en ligne
-- A executer dans Forge Console (Schema / Import SQL), pas via /sql.

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
