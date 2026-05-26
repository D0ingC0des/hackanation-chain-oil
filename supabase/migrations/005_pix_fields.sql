-- Rastreamento do pagamento PIX via Woovi
alter table public.oil_collections
  add column if not exists pix_id      text,
  add column if not exists pix_status  text not null default 'pending',
  add column if not exists pix_paid_at timestamptz;

-- pending | processing | paid | failed
create index if not exists oil_collections_pix_status_idx
  on public.oil_collections (pix_status);
