-- =============================================================
-- CHAINOIL — Migration 002: Wallet Profiles
-- Auth via Solana wallet — sem Supabase Auth JWT
-- Rodar no Supabase SQL Editor
-- =============================================================

create table if not exists public.wallet_profiles (
  id            uuid primary key default gen_random_uuid(),
  public_key    text unique not null,
  name          text not null,
  email         text not null,
  phone         text not null,
  business_name text not null,
  cnpj          text,
  cep           text not null,
  street        text,
  neighborhood  text,
  city          text not null,
  state         text not null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists idx_wallet_profiles_public_key
  on public.wallet_profiles(public_key);

alter table public.wallet_profiles enable row level security;

-- Políticas permissivas para o hackathon (sem JWT Supabase Auth)
-- Sem restrição de role para cobrir anon e authenticated
create policy "wallet_profiles_select"
  on public.wallet_profiles for select using (true);

create policy "wallet_profiles_insert"
  on public.wallet_profiles for insert with check (true);

create policy "wallet_profiles_update"
  on public.wallet_profiles for update using (true);

-- Grants explícitos necessários (SQL migrations não aplicam auto-grant)
grant select, insert, update on public.wallet_profiles to anon, authenticated;
