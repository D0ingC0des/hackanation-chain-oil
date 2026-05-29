// request-payout-chainoil — inicia PIX OUT para o cidadão após coleta confirmada on-chain.
// Adaptado de request-payout (Uber Money): remove Anchor release + tabela payouts + CPF;
// troca /charge (PIX IN) por /api/v1/payment (PIX OUT); usa chainoil.collections.
import postgres from "npm:postgres@3";
import { json, handleOptions } from "../_shared/cors.ts";

const WOOVI_API_KEY = Deno.env.get("WOOVI_API_KEY") ?? "";
const WOOVI_MODE = (Deno.env.get("WOOVI_MODE") ?? "mock").toLowerCase();
const WOOVI_BASE = Deno.env.get("WOOVI_API_URL") ?? "https://api.woovi-sandbox.com/api/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions(req);

  let body: { collectionId: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, req);
  }
  if (!body.collectionId) return json({ error: "collectionId required" }, 400, req);

  const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false });

  try {
    const [col] = await sql`
      SELECT id, citizen_phone, citizen_pix_type, reward_brl, pix_status, pix_id, tx_sig_coassigned
      FROM chainoil.collections
      WHERE id = ${body.collectionId}
    `;
    if (!col) return json({ error: "Collection not found" }, 404, req);
    if (!col.tx_sig_coassigned) {
      return json({ error: "On-chain transaction not confirmed yet" }, 400, req);
    }

    // Idempotência: já pago ou em processamento
    if (col.pix_status === "confirmed" || col.pix_status === "processing") {
      return json({
        collectionId: col.id,
        pixStatus: col.pix_status,
        pixId: col.pix_id,
        mode: WOOVI_MODE,
        resumed: true,
      }, 200, req);
    }

    const amountCents = Math.round(Number(col.reward_brl) * 100);
    // collectionId = correlationId → webhook consegue resolver sem tabela extra
    const correlationId = body.collectionId;

    if (WOOVI_MODE === "mock") {
      await sql`
        UPDATE chainoil.collections
        SET pix_status = 'mock_pending', pix_id = ${"mock-" + correlationId}
        WHERE id = ${body.collectionId}
      `;
      return json({
        collectionId: col.id,
        pixStatus: "mock_pending",
        pixId: "mock-" + correlationId,
        mode: "mock",
      }, 200, req);
    }

    if (!WOOVI_API_KEY) return json({ error: "WOOVI_API_KEY not configured" }, 500, req);
    if (!col.citizen_phone) return json({ error: "Collection has no citizen_phone" }, 400, req);

    const wooviRes = await fetch(`${WOOVI_BASE}/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: WOOVI_API_KEY },
      body: JSON.stringify({
        type: "PIX_KEY",
        value: amountCents,
        destinationAlias: col.citizen_phone,
        destinationAliasType: (col.citizen_pix_type ?? "PHONE").toUpperCase(),
        correlationID: correlationId,
        comment: `ChainOil - coleta ${body.collectionId.slice(0, 8)}`,
        autoApprove: false,
      }),
      signal: AbortSignal.timeout(25_000),
    });

    const wooviText = await wooviRes.text();
    let wooviData: unknown = null;
    try { wooviData = JSON.parse(wooviText); } catch { /* mantém raw */ }

    if (!wooviRes.ok) {
      await sql`UPDATE chainoil.collections SET pix_status = 'failed' WHERE id = ${body.collectionId}`;
      return json({ error: "Woovi error", status: wooviRes.status, details: wooviText }, 502, req);
    }

    const d = wooviData as Record<string, unknown> | null;
    const pixId = WOOVI_MODE === "sandbox"
      ? `SANDBOX-${correlationId.slice(0, 8)}`
      : ((d?.transaction as Record<string, unknown> | undefined)?.endToEndId as string ??
         (d?.payment as Record<string, unknown> | undefined)?.correlationID as string ??
         correlationId);

    const newStatus = WOOVI_MODE === "sandbox" ? "confirmed" : "processing";
    await sql`
      UPDATE chainoil.collections
      SET pix_status = ${newStatus}, pix_id = ${pixId}
      WHERE id = ${body.collectionId}
    `;

    return json({
      collectionId: col.id,
      pixStatus: newStatus,
      pixId,
      amountBrl: Number(col.reward_brl),
      mode: WOOVI_MODE,
    }, 200, req);
  } catch (err) {
    console.error("request-payout-chainoil error:", err);
    return json({ error: (err as Error).message }, 500, req);
  } finally {
    await sql.end();
  }
});
