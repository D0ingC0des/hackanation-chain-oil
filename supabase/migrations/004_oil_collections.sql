-- oil_collections: coletas registradas pelos operadores (wallet-based, sem FK para auth.users)
create table if not exists public.oil_collections (
  id            uuid primary key default gen_random_uuid(),
  operator_key  text not null,        -- public key da carteira do operador
  citizen_phone text,                  -- telefone do cidadão para PIX
  liters        numeric(10,2) not null,
  reward_brl    numeric(10,2) not null, -- valor pago em R$ no momento da coleta
  rate_used     numeric(10,4) not null, -- taxa R$/litro usada no cálculo
  photo_url     text,
  tx_hash       text,                  -- hash da transação Solana (preenchido após mint)
  collected_at  timestamptz default now()
);

alter table public.oil_collections enable row level security;

create policy "oil_collections_select" on public.oil_collections
  for select using (true);

create policy "oil_collections_insert" on public.oil_collections
  for insert with check (true);

grant select, insert on public.oil_collections to anon, authenticated;

create index if not exists oil_collections_operator_key_idx
  on public.oil_collections (operator_key);
