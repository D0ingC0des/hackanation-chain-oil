/**
 * Teste de conexão e schema Supabase — ChainOil
 * Rodar: node --env-file=.env.local scripts/test-supabase.mjs
 */

import { createClient } from "@supabase/supabase-js";

const url  = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;
const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon || !svc) {
  console.error("❌  Env vars ausentes. Verifique .env.local");
  process.exit(1);
}

// Client anon (respeita RLS)
const db = createClient(url, anon);
// Client service (bypassa RLS — só para seed/admin)
const admin = createClient(url, svc);

// ── helpers ────────────────────────────────────────────────────

const ok  = (label) => console.log(`  ✅  ${label}`);
const err = (label, e) => { console.error(`  ❌  ${label}: ${e.message}`); return false; };

async function countRows(client, table) {
  const { count, error } = await client
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

// ── testes ─────────────────────────────────────────────────────

async function run() {
  let passed = 0;
  let failed = 0;

  console.log("\n🔌  Supabase Connection Test — ChainOil\n");
  console.log(`   URL: ${url}`);
  console.log(`   Project: ${url.split("//")[1].split(".")[0]}\n`);

  // 1. Conexão básica
  console.log("── 1. Conexão ──────────────────────────────");
  try {
    const { error } = await admin.from("profiles").select("id").limit(1);
    if (error) throw error;
    ok("Conexão com Supabase estabelecida"); passed++;
  } catch (e) { err("Conexão", e); failed++; }

  // 2. Tabelas existem
  console.log("\n── 2. Tabelas ──────────────────────────────");
  const tables = [
    "profiles", "collection_points", "operators", "wallets",
    "collections", "rewards", "transactions", "rankings",
    "badges", "user_badges", "esg_metrics", "audit_logs",
  ];
  for (const t of tables) {
    try {
      await countRows(admin, t);
      ok(t); passed++;
    } catch (e) { err(t, e); failed++; }
  }

  // 3. Seed: badges
  console.log("\n── 3. Seed ─────────────────────────────────");
  try {
    const n = await countRows(admin, "badges");
    if (n >= 4) { ok(`badges: ${n} registros`); passed++; }
    else { err("badges", { message: `esperado ≥4, encontrado ${n}` }); failed++; }
  } catch (e) { err("badges seed", e); failed++; }

  try {
    const n = await countRows(admin, "collection_points");
    if (n >= 1) { ok(`collection_points: ${n} registro(s)`); passed++; }
    else { err("collection_points seed", { message: "nenhum ponto de coleta" }); failed++; }
  } catch (e) { err("collection_points seed", e); failed++; }

  // 4. RLS — anon não pode ler profiles sem estar logado
  console.log("\n── 4. RLS (anon) ───────────────────────────");
  try {
    const { data, error } = await db.from("profiles").select("id");
    if (error || !data || data.length === 0) {
      ok("profiles bloqueado para anon (RLS ativo)"); passed++;
    } else {
      err("RLS", { message: `deveria retornar 0 rows, retornou ${data.length}` }); failed++;
    }
  } catch (_) { ok("profiles bloqueado para anon (RLS ativo)"); passed++; }

  // 5. RLS — rankings visível para authenticated (público)
  try {
    const { data, error } = await admin.from("rankings").select("id");
    if (!error) { ok("rankings acessível com service role"); passed++; }
    else { err("rankings", error); failed++; }
  } catch (e) { err("rankings service", e); failed++; }

  // ── resultado ────────────────────────────────────────────────
  console.log("\n────────────────────────────────────────────");
  console.log(`   Resultado: ${passed} passaram · ${failed} falharam`);
  if (failed === 0) {
    console.log("   🎉  Schema OK — pronto para integrar!\n");
  } else {
    console.log("   ⚠️   Verifique os itens acima antes de continuar.\n");
    process.exit(1);
  }
}

run().catch((e) => { console.error("Erro inesperado:", e); process.exit(1); });
