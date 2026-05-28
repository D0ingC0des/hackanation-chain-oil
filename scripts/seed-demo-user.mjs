/**
 * Seed: usuário demo ChainOil
 * Rodar: node --env-file=.env.local scripts/seed-demo-user.mjs
 *
 * Credenciais de acesso geradas:
 *   Telefone : (44) 98888-7777
 *   PIN      : 1234
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !svc) {
  console.error("❌  VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes");
  process.exit(1);
}

const admin = createClient(url, svc, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PHONE_RAW = "44988887777";
const PHONE_FORMATTED = "(44) 98888-7777";
const PIN = "1234";
const EMAIL = `${PHONE_RAW}@chainoil.local`;
const PASSWORD = `co_${PIN}_oil`;
const FULL_NAME = "teste_user";
const DEMO_POINT = "00000000-0000-0000-0000-000000000001";

async function run() {
  console.log("\n🌱  Seed: usuário demo ChainOil\n");

  // 1. Criar (ou atualizar) usuário no Supabase Auth
  console.log("── 1. Auth user ────────────────────────────");
  let userId;

  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing?.users?.find((u) => u.email === EMAIL);

  if (found) {
    console.log(`   ℹ️   Usuário já existe (${found.id}) — atualizando senha`);
    const { error } = await admin.auth.admin.updateUserById(found.id, { password: PASSWORD });
    if (error) {
      console.error("   ❌  updateUser:", error.message);
      process.exit(1);
    }
    userId = found.id;
    console.log("   ✅  Senha atualizada");
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) {
      console.error("   ❌  createUser:", error.message);
      process.exit(1);
    }
    userId = data.user.id;
    console.log(`   ✅  Criado: ${userId}`);
  }

  // 2. Profile
  console.log("\n── 2. Profile ──────────────────────────────");
  const { error: profErr } = await admin.from("profiles").upsert(
    {
      id: userId,
      full_name: FULL_NAME,
      phone: PHONE_RAW,
      role: "operator",
    },
    { onConflict: "id" },
  );
  if (profErr) {
    console.error("   ❌  profile:", profErr.message);
    process.exit(1);
  }
  console.log("   ✅  Profile upserted");

  // 3. Operator
  console.log("\n── 3. Operator ─────────────────────────────");
  const { data: opExisting } = await admin
    .from("operators")
    .select("id")
    .eq("profile_id", userId)
    .single();

  if (!opExisting) {
    const { error: opErr } = await admin.from("operators").insert({
      profile_id: userId,
      collection_point_id: DEMO_POINT,
      is_active: true,
    });
    if (opErr) {
      console.error("   ❌  operator:", opErr.message);
      process.exit(1);
    }
    console.log("   ✅  Operator criado");
  } else {
    console.log(`   ℹ️   Operator já existe (${opExisting.id})`);
  }

  // 4. Ranking inicial (simula histórico Prata)
  console.log("\n── 4. Ranking ──────────────────────────────");
  const { error: rankErr } = await admin.from("rankings").upsert(
    {
      citizen_id: userId,
      total_points: 4960,
      total_tokens: 248,
      total_liters: 248,
      level: 2,
      streak_days: 7,
    },
    { onConflict: "citizen_id" },
  );
  if (rankErr) {
    console.error("   ❌  ranking:", rankErr.message);
    process.exit(1);
  }
  console.log("   ✅  Ranking seedado (248L, Prata)");

  // ── resultado ────────────────────────────────────────────
  console.log("\n────────────────────────────────────────────");
  console.log("   🎉  Seed concluído!\n");
  console.log(`   Telefone : ${PHONE_FORMATTED}`);
  console.log(`   PIN      : ${PIN}`);
  console.log(`   Nome     : ${FULL_NAME}`);
  console.log(`   Auth ID  : ${userId}\n`);
}

run().catch((e) => {
  console.error("Erro inesperado:", e);
  process.exit(1);
});
