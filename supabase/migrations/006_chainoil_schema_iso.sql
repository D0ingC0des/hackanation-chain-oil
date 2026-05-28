-- 006_chainoil_schema_iso.sql
-- Schema isolado para o Chain Oil conforme arquitetura compartilhada Hackanation 2026.
-- Acesso exclusivo via Edge Function com service-role (RLS deny-all-client).

CREATE SCHEMA IF NOT EXISTS chainoil;

-- Tabela principal de coletas
CREATE TABLE IF NOT EXISTS chainoil.collections (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_key   TEXT        NOT NULL,               -- wallet pubkey do operador
  citizen_phone  TEXT        NOT NULL,
  liters         NUMERIC(6,2) NOT NULL CHECK (liters > 0),
  reward_brl     NUMERIC(10,2),
  rate_used      NUMERIC(10,4),
  photo_url      TEXT,
  impact_score   INTEGER,
  mint_tx        TEXT,                               -- spl-token mint tx
  burn_tx        TEXT,                               -- spl-token burn tx
  tx_hash        TEXT,                               -- Anchor register_collection tx
  pix_intent_id  UUID,
  pix_id         TEXT,
  pix_status     TEXT        NOT NULL DEFAULT 'pending',
  pix_paid_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chainoil_collections_operator
  ON chainoil.collections (operator_key);

CREATE INDEX IF NOT EXISTS idx_chainoil_collections_phone
  ON chainoil.collections (citizen_phone);

CREATE INDEX IF NOT EXISTS idx_chainoil_collections_pix_status
  ON chainoil.collections (pix_status);

ALTER TABLE chainoil.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY chainoil_collections_deny_client
  ON chainoil.collections
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Permissão de acesso via service-role (edge functions)
GRANT USAGE ON SCHEMA chainoil TO service_role;
GRANT ALL ON chainoil.collections TO service_role;
