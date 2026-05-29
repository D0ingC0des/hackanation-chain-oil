-- Tipo da chave PIX do cidadão: PHONE | CPF | EMAIL
alter table public.oil_collections
  add column if not exists citizen_pix_type text not null default 'PHONE';
