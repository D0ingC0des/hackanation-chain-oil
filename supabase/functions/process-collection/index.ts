import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessInput {
  operatorKey: string;
  citizenPhone: string;
  liters: number;
  txHash?: string;
  collectionId?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { operatorKey, citizenPhone, liters, txHash, collectionId }: ProcessInput =
      await req.json();

    if (!operatorKey || !liters || liters <= 0) {
      return json({ success: false, error: "operatorKey e liters são obrigatórios" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Taxa atual do banco
    const { data: rateRow } = await supabase
      .from("oil_config")
      .select("value")
      .eq("key", "rate_per_liter")
      .single();

    const rate = rateRow ? parseFloat(rateRow.value) : 1.2;
    const rewardBrl = parseFloat((liters * rate).toFixed(2));

    // 2. Salvar coleta no schema isolado chainoil
    const insertPayload: Record<string, unknown> = {
      operator_key: operatorKey,
      citizen_phone: citizenPhone,
      liters,
      reward_brl: rewardBrl,
      rate_used: rate,
      pix_status: "pending",
      tx_hash: txHash ?? null,
    };
    if (collectionId) insertPayload.id = collectionId;

    const { data: collection, error: insertErr } = await supabase
      .schema("chainoil")
      .from("collections")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertErr || !collection) {
      throw new Error(insertErr?.message ?? "Falha ao salvar coleta");
    }

    // 3. PIX via Woovi (cash-out para chave PIX do cidadão)
    const wooviKey = Deno.env.get("WOOVI_API_KEY");
    const wooviMode = Deno.env.get("WOOVI_MODE") ?? "mock";
    const wooviUrl = Deno.env.get("WOOVI_API_URL") ?? "https://api.openpix.com.br/api/v1";

    let pixId: string | null = null;
    let pixStatus = "pending";

    if (wooviKey && citizenPhone && wooviMode !== "mock") {
      const wooviRes = await fetch(`${wooviUrl}/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${wooviKey}`,
        },
        body: JSON.stringify({
          value: Math.round(rewardBrl * 100),
          destinationAlias: citizenPhone,
          destinationAliasType: "PHONE",
          correlationID: collection.id,
          comment: `ChainOil - coleta de ${liters}L de óleo usado`,
        }),
      });

      if (wooviRes.ok) {
        const body = await wooviRes.json();
        pixId = body?.transfer?.endToEndId ?? body?.endToEndId ?? body?.id ?? null;
        pixStatus = "processing";
      } else {
        const errBody = await wooviRes.text();
        console.error("Woovi error:", wooviRes.status, errBody);
        pixStatus = "failed";
      }
    } else if (wooviMode === "mock") {
      pixId = `mock-${collection.id}`;
      pixStatus = "mock_pending";
    }

    // 4. Atualizar status do PIX na coleta
    await supabase
      .schema("chainoil")
      .from("collections")
      .update({ pix_id: pixId, pix_status: pixStatus })
      .eq("id", collection.id);

    return json({
      success: true,
      collectionId: collection.id,
      pixId,
      pixStatus,
      rewardBrl,
      mode: wooviMode,
    });
  } catch (err) {
    console.error("process-collection error:", err);
    return json({ success: false, error: (err as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
