-- Migration 009: ChainOil V2 — oracle_updates, oil_burns, workflow_logs
-- Aplicar no SQL Editor do Supabase após as migrations 001–008

-- ── oracle_updates ────────────────────────────────────────────────────────────
-- Histórico de todas as sincronizações CRE → on-chain
CREATE TABLE IF NOT EXISTS chainoil.oracle_updates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_centavos  BIGINT       NOT NULL,
  price_brl       NUMERIC(10,2) GENERATED ALWAYS AS (price_centavos / 100.0) STORED,
  tx_sig          TEXT,
  cre_run_id      TEXT,
  price_changed   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS oracle_updates_created_at_idx
  ON chainoil.oracle_updates (created_at DESC);

-- ── oil_burns ─────────────────────────────────────────────────────────────────
-- Registro de queimas de token COT (óleo saindo do sistema)
CREATE TABLE IF NOT EXISTS chainoil.oil_burns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_key    TEXT         NOT NULL,
  liters_burned   NUMERIC(10,3) NOT NULL CHECK (liters_burned > 0),
  tokens_burned   BIGINT       NOT NULL CHECK (tokens_burned > 0),
  tx_sig          TEXT,
  reason          TEXT         NOT NULL DEFAULT 'processed'
                               CHECK (reason IN ('processed', 'sold', 'withdrawn')),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS oil_burns_operator_idx
  ON chainoil.oil_burns (operator_key);
CREATE INDEX IF NOT EXISTS oil_burns_created_at_idx
  ON chainoil.oil_burns (created_at DESC);

-- ── workflow_logs ─────────────────────────────────────────────────────────────
-- Logs de execução do workflow Chainlink CRE
CREATE TABLE IF NOT EXISTS chainoil.workflow_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event       TEXT        NOT NULL
              CHECK (event IN ('price_updated', 'no_change', 'error', 'skipped')),
  detail      JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workflow_logs_created_at_idx
  ON chainoil.workflow_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS workflow_logs_event_idx
  ON chainoil.workflow_logs (event);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE chainoil.oracle_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE chainoil.oil_burns      ENABLE ROW LEVEL SECURITY;
ALTER TABLE chainoil.workflow_logs  ENABLE ROW LEVEL SECURITY;

-- oracle_updates: leitura pública (exibida no dashboard), escrita apenas via service_role
CREATE POLICY "oracle_updates_select" ON chainoil.oracle_updates
  FOR SELECT USING (true);

CREATE POLICY "oracle_updates_insert" ON chainoil.oracle_updates
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- oil_burns: leitura pública, escrita via service_role
CREATE POLICY "oil_burns_select" ON chainoil.oil_burns
  FOR SELECT USING (true);

CREATE POLICY "oil_burns_insert" ON chainoil.oil_burns
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- workflow_logs: apenas service_role lê e escreve
CREATE POLICY "workflow_logs_service_only" ON chainoil.workflow_logs
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── Tabela pública espelho para dashboard (REST anon) ─────────────────────────
-- oracle_updates e oil_burns têm RLS SELECT aberto acima — dashboard lê direto via service_role edge fn
-- Nenhuma tabela pública extra necessária
