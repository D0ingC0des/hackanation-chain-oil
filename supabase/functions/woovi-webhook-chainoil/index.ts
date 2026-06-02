// woovi-webhook-chainoil — recebe callbacks Woovi e atualiza pix_status na coleta.
// Adaptado de woovi-webhook (Uber Money): mesma lógica HMAC + idempotência;
// troca payouts por chainoil.collections; remove fechamento de loan.
import postgres from "npm:postgres@3";
import { jsonOpen as json, handleOptionsOpen as handleOptions } from "../_shared/cors.ts";
import { verifyHmac } from "../_shared/hmac.ts";

const WEBHOOK_SECRET = Deno.env.get("WOOVI_WEBHOOK_SECRET");
// ⚠️ Skip HMAC só para sandbox enquanto não temos o secret no painel.
// NUNCA ativar em prod — qualquer chamada externa fica aceita.
const INSECURE_MODE = Deno.env.get("WOOVI_WEBHOOK_INSECURE_MODE") === "true";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();
  // Woovi faz GET para validar o endpoint durante o cadastro do webhook.
  if (req.method === "GET" || req.method === "HEAD") return json({ ok: true });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const raw = await req.text();

  // Detectar ping de validação ANTES do HMAC — Woovi envia POST sem signature
  // durante o cadastro do webhook no painel.
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400); }

  if (payload.evento === "teste_webhook" || payload.event === "teste_webhook") {
    console.log("[woovi-webhook-chainoil] ping recebido", payload);
    return json({ received: true, ping: true });
  }

  // Para eventos reais, verificar HMAC (ou skip em INSECURE_MODE para sandbox)
  if (INSECURE_MODE) {
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => { headers[k] = v; });
    console.warn("[woovi-webhook-chainoil] INSECURE_MODE=true (sandbox)", {
      headers,
      bodyPreview: raw.slice(0, 300),
    });
  } else {
    if (!WEBHOOK_SECRET) return json({ error: "Webhook misconfigured (missing WOOVI_WEBHOOK_SECRET)" }, 500);
    const sig = req.headers.get("x-webhook-signature") ?? req.headers.get("x-openpix-signature") ?? "";
    if (!sig) return json({ error: "Missing signature" }, 401);
    const ok = await verifyHmac(raw, sig, WEBHOOK_SECRET);
    if (!ok) return json({ error: "Invalid signature" }, 403);
  }

  const transfer = (payload.transfer ?? payload.charge ?? payload) as Record<string, unknown>;
  const correlationId = (transfer.correlationID ?? transfer.correlationId) as string | undefined;
  const wooviStatus = (transfer.status ?? payload.status) as string | undefined;
  const endToEndId = (transfer.endToEndId ?? transfer.endtoendId) as string | undefined;

  if (!correlationId) return json({ error: "Missing correlationID" }, 400);

  const completed = wooviStatus && /COMPLETED|CONFIRMED|PAID|SUCCESS/i.test(wooviStatus);
  const failed = wooviStatus && /FAILED|ERROR|DENIED|REJECTED/i.test(wooviStatus);
  const localStatus = completed ? "confirmed" : failed ? "failed" : "processing";

  // confirmed aceita vir de processing/pending/failed (sandbox pode ser flakey)
  const allowedFrom = localStatus === "confirmed"
    ? ["processing", "pending", "failed"]
    : ["processing", "pending"];

  const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false });

  try {
    // correlationId = collectionId (definido em request-payout-chainoil)
    await sql`
      UPDATE chainoil.collections
      SET
        pix_status = ${localStatus},
        pix_id     = COALESCE(${endToEndId ?? null}, pix_id)
      WHERE id         = ${correlationId}
        AND pix_status = ANY(${allowedFrom})
    `;

    return json({ received: true, correlationId, status: localStatus });
  } catch (err) {
    console.error("woovi-webhook-chainoil error:", err);
    return json({ error: (err as Error).message }, 500);
  } finally {
    await sql.end();
  }
});
