-- oil_config: chave-valor para configurações do app acessíveis pelos contratos
create table if not exists public.oil_config (
  key        text primary key,
  value      text not null,
  updated_by text,   -- public key da carteira que fez a última alteração
  updated_at timestamptz default now()
);

alter table public.oil_config enable row level security;

create policy "oil_config_select" on public.oil_config
  for select using (true);

create policy "oil_config_update" on public.oil_config
  for update using (true);

grant select, update on public.oil_config to anon, authenticated;

-- Valor padrão: R$ 1,20 por litro
insert into public.oil_config (key, value)
  values ('rate_per_liter', '1.20')
  on conflict (key) do nothing;
