-- =============================================================
-- CHAINOIL — Migration 001: Schema inicial
-- Rodar no Supabase SQL Editor (projeto > SQL Editor > New query)
-- =============================================================

-- EXTENSIONS
create extension if not exists "uuid-ossp";

-- =============================================================
-- ENUMS
-- =============================================================

do $$ begin
  create type public.user_role as enum ('admin', 'partner', 'operator', 'citizen');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.collection_status as enum ('pending', 'validated', 'rejected', 'rewarded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reward_status as enum ('pending', 'processing', 'paid', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_type as enum ('pix', 'mint', 'burn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_status as enum ('pending', 'success', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.wallet_type as enum ('custodial', 'external');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.redemption_status as enum ('pending', 'approved', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

-- =============================================================
-- TABLES
-- =============================================================

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  phone        text unique,
  role         public.user_role not null default 'citizen',
  avatar_url   text,
  created_at   timestamptz default now()
);

create table if not exists public.collection_points (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  description  text,
  address      text,
  city         text,
  state        text,
  latitude     numeric,
  longitude    numeric,
  is_active    boolean default true,
  created_at   timestamptz default now()
);

create table if not exists public.operators (
  id                    uuid primary key default uuid_generate_v4(),
  profile_id            uuid references public.profiles(id) on delete cascade,
  collection_point_id   uuid references public.collection_points(id) on delete set null,
  is_active             boolean default true,
  created_at            timestamptz default now()
);

create table if not exists public.wallets (
  id                    uuid primary key default uuid_generate_v4(),
  profile_id            uuid references public.profiles(id) on delete cascade,
  wallet_address        text unique not null,
  encrypted_private_key text,
  wallet_type           public.wallet_type default 'custodial',
  created_at            timestamptz default now()
);

create table if not exists public.collections (
  id                  uuid primary key default uuid_generate_v4(),
  citizen_id          uuid references public.profiles(id),
  operator_id         uuid references public.operators(id),
  collection_point_id uuid references public.collection_points(id),
  liters              numeric(10,2) not null,
  oil_quality_score   integer default 100,
  estimated_reward    numeric(10,2),
  estimated_tokens    integer,
  status              public.collection_status default 'pending',
  proof_hash          text,
  tx_hash             text,
  photo_url           text,
  latitude            numeric,
  longitude           numeric,
  collected_at        timestamptz default now(),
  validated_at        timestamptz,
  created_at          timestamptz default now()
);

create table if not exists public.rewards (
  id            uuid primary key default uuid_generate_v4(),
  collection_id uuid references public.collections(id) on delete cascade,
  citizen_id    uuid references public.profiles(id),
  brl_amount    numeric(10,2) not null,
  token_amount  integer not null,
  pix_key       text,
  status        public.reward_status default 'pending',
  processed_at  timestamptz,
  created_at    timestamptz default now()
);

create table if not exists public.transactions (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  uuid references public.profiles(id),
  type        public.transaction_type not null,
  status      public.transaction_status default 'pending',
  amount      numeric(10,2),
  tx_hash     text,
  external_id text,
  metadata    jsonb,
  created_at  timestamptz default now()
);

create table if not exists public.rankings (
  id           uuid primary key default uuid_generate_v4(),
  citizen_id   uuid unique references public.profiles(id),
  total_points integer default 0,
  total_tokens integer default 0,
  total_liters numeric(10,2) default 0,
  level        integer default 1,
  streak_days  integer default 0,
  updated_at   timestamptz default now()
);

create table if not exists public.badges (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text,
  icon        text,
  created_at  timestamptz default now()
);

create table if not exists public.user_badges (
  id         uuid primary key default uuid_generate_v4(),
  citizen_id uuid references public.profiles(id),
  badge_id   uuid references public.badges(id),
  earned_at  timestamptz default now()
);

create table if not exists public.reward_redemptions (
  id          uuid primary key default uuid_generate_v4(),
  citizen_id  uuid references public.profiles(id),
  reward_name text not null,
  token_cost  integer not null,
  status      public.redemption_status default 'pending',
  redeemed_at timestamptz default now()
);

create table if not exists public.esg_metrics (
  id                      uuid primary key default uuid_generate_v4(),
  collection_id           uuid references public.collections(id),
  water_preserved_liters  numeric(20,2),
  co2_avoided_kg          numeric(20,2),
  impact_score            integer,
  created_at              timestamptz default now()
);

create table if not exists public.audit_logs (
  id         uuid primary key default uuid_generate_v4(),
  actor_id   uuid references public.profiles(id),
  action     text not null,
  entity     text,
  entity_id  uuid,
  metadata   jsonb,
  created_at timestamptz default now()
);

-- =============================================================
-- INDEXES
-- =============================================================

create index if not exists idx_profiles_role       on public.profiles(role);
create index if not exists idx_collections_citizen  on public.collections(citizen_id);
create index if not exists idx_collections_operator on public.collections(operator_id);
create index if not exists idx_rewards_citizen      on public.rewards(citizen_id);
create index if not exists idx_transactions_profile on public.transactions(profile_id);
create index if not exists idx_rankings_points      on public.rankings(total_points desc);

-- =============================================================
-- FUNCTIONS
-- =============================================================

create or replace function public.calculate_reward(liters_input numeric)
returns numeric
language plpgsql as $$
begin
  return liters_input * 1.20; -- R$ 1,20 por litro
end;
$$;

create or replace function public.update_ranking()
returns trigger
language plpgsql as $$
begin
  insert into public.rankings (citizen_id, total_points, total_tokens, total_liters)
  values (
    new.citizen_id,
    new.token_amount,
    new.token_amount,
    (select liters from public.collections where id = new.collection_id)
  )
  on conflict (citizen_id) do update set
    total_points = rankings.total_points + new.token_amount,
    total_tokens = rankings.total_tokens + new.token_amount,
    total_liters = rankings.total_liters + (
      select liters from public.collections where id = new.collection_id
    ),
    updated_at = now();
  return new;
end;
$$;

create or replace function public.generate_esg_metrics()
returns trigger
language plpgsql as $$
begin
  insert into public.esg_metrics (
    collection_id,
    water_preserved_liters,
    co2_avoided_kg,
    impact_score
  ) values (
    new.id,
    new.liters * 25000,
    new.liters * 1.5,
    floor(new.liters * 10)
  );
  return new;
end;
$$;

-- Trigger: atualizar ranking após inserção de reward
drop trigger if exists trg_update_ranking on public.rewards;
create trigger trg_update_ranking
after insert on public.rewards
for each row execute procedure public.update_ranking();

-- Trigger: gerar ESG após nova coleta
drop trigger if exists trg_generate_esg on public.collections;
create trigger trg_generate_esg
after insert on public.collections
for each row execute procedure public.generate_esg_metrics();

-- =============================================================
-- RLS
-- =============================================================

alter table public.profiles           enable row level security;
alter table public.collection_points  enable row level security;
alter table public.operators          enable row level security;
alter table public.wallets            enable row level security;
alter table public.collections        enable row level security;
alter table public.rewards            enable row level security;
alter table public.transactions       enable row level security;
alter table public.rankings           enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.esg_metrics        enable row level security;
alter table public.audit_logs         enable row level security;

-- Profiles
create policy "profiles_select_own"
  on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own"
  on public.profiles for update using (auth.uid() = id);

-- Collections
create policy "collections_select_authenticated"
  on public.collections for select to authenticated using (true);
create policy "collections_insert_authenticated"
  on public.collections for insert to authenticated with check (true);

-- Rewards
create policy "rewards_select_own"
  on public.rewards for select using (citizen_id = auth.uid());

-- Rankings
create policy "rankings_select_authenticated"
  on public.rankings for select to authenticated using (true);

-- ESG
create policy "esg_select_authenticated"
  on public.esg_metrics for select to authenticated using (true);

-- =============================================================
-- STORAGE
-- =============================================================

insert into storage.buckets (id, name, public)
values ('collection-photos', 'collection-photos', true)
on conflict (id) do nothing;

create policy "storage_upload_authenticated"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'collection-photos');

create policy "storage_select_public"
  on storage.objects for select
  using (bucket_id = 'collection-photos');

-- =============================================================
-- SEED: badges iniciais
-- =============================================================

insert into public.badges (name, description, icon) values
  ('Primeira Coleta', 'Primeira coleta realizada',  'leaf'),
  ('Eco Bronze',      '10 litros coletados',         'award'),
  ('Eco Prata',       '50 litros coletados',          'star'),
  ('Eco Ouro',        '100 litros coletados',         'trophy')
on conflict do nothing;

-- =============================================================
-- SEED: ponto de coleta demo
-- =============================================================

insert into public.collection_points (id, name, description, city, state, is_active)
values (
  '00000000-0000-0000-0000-000000000001',
  'Ponto Demo ChainOil',
  'Ponto de coleta para demonstração do hackathon',
  'Maringá',
  'PR',
  true
)
on conflict (id) do nothing;

-- =============================================================
-- DONE
-- =============================================================
