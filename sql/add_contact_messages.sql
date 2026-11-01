-- =====================================================================
-- STAGE-BUILD — MESSAGES DE CONTACT
-- =====================================================================
-- Crée la table utilisée par le formulaire de contact de la page d'accueil
-- et par la page « Messages de contact » de la console plateforme.
--
-- Script idempotent : il peut être rejoué sans casser les données.
-- À exécuter dans Forge Console > SQL.
-- =====================================================================

create extension if not exists pgcrypto;

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  email text not null,
  message text not null,
  status text not null default 'nouveau'
    check (status in ('nouveau', 'lu', 'traite', 'archive')),
  handled_at timestamptz,
  handled_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table contact_messages add column if not exists status text not null default 'nouveau';
alter table contact_messages add column if not exists handled_at timestamptz;
alter table contact_messages add column if not exists handled_by uuid references users(id) on delete set null;
alter table contact_messages add column if not exists created_at timestamptz not null default now();
alter table contact_messages add column if not exists updated_at timestamptz not null default now();

create index if not exists contact_messages_created_at_idx
  on contact_messages (created_at desc);

create index if not exists contact_messages_status_idx
  on contact_messages (status);

create index if not exists contact_messages_email_idx
  on contact_messages (email);

create or replace function public.touch_contact_messages_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_contact_messages_updated_at on contact_messages;
create trigger touch_contact_messages_updated_at
  before update on contact_messages
  for each row execute function public.touch_contact_messages_updated_at();

-- L'isolation des accès est appliquée côté application (permission
-- platform_messages). Les politiques RLS peuvent être ajoutées ensuite
-- selon le mode d'authentification configuré dans Forge Console.
