-- 007_chainoil_operator_sig.sql
-- Opção B: co-assinatura atômica operador + tesouraria.
-- Adiciona colunas para guardar a pubkey do operador e a assinatura da tx co-assinada.

ALTER TABLE chainoil.collections
  ADD COLUMN IF NOT EXISTS operator_pubkey   TEXT,
  ADD COLUMN IF NOT EXISTS tx_sig_coassigned TEXT;
