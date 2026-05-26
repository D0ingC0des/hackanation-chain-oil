import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Woovi endpoint para transferência PIX (cash-out).
// Verificar em: https://developers.woovi.com/en/api/
// Endpoint alternativo se /transfer não funcionar: /pix/cashout
const WOOVI_API = "https://api.woovi.com/api/v1";

interface ProcessInput {
  operatorKey: string;
  citizenPhone: string; // chave PIX (telefone) do cidadão
  liters: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { operatorKey, citizenPhone, liters }: ProcessInput = await req.json();

    if (!operatorKey || !liters || liters <= 0) {
      return json({ success: false, error: "operatorKey e liters são obrigatórios" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Obter taxa atual do banco
    const { data: rateRow } = await supabase
      .from("oil_config")
      .select("value")
      .eq("key", "rate_per_liter")
      .single();

    const rate = rateRow ? parseFloat(rateRow.value) : 1.2;
    const rewardBrl = parseFloat((liters * rate).toFixed(2));

    // 2. Salvar coleta com status pendente
    const { data: collection, error: insertErr } = await supabase
      .from("oil_collections")
      .insert({
        operator_key: operatorKey,
        citizen_phone: citizenPhone,
        liters,
        reward_brl: rewardBrl,
        rate_used: rate,
        pix_status: "pending",
      })
      .select("id")
      .single();

    if (insertErr || !collection) {
      throw new Error(insertErr?.message ?? "Falha ao salvar coleta");
    }

    // 3. Enviar PIX via Woovi (cash-out para chave PIX do cidadão)
    const wooviToken = Deno.env.get("WOOVI_APP_ID");
    let pixId: string | null = null;
    let pixStatus = "pending";

    if (wooviToken && citizenPhone) {
      const wooviRes = await fetch(`${WOOVI_API}/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": wooviToken,
        },
        body: JSON.stringify({
          value: Math.round(rewardBrl * 100), // valor em centavos
          destinationAlias: citizenPhone,
          destinationAliasType: "PHONE",
          correlationID: collection.id,
          comment: `ChainOil - coleta de ${liters}L de óleo usado`,
        }),
      });

      if (wooviRes.ok) {
        const body = await wooviRes.json();
        // O campo exato depende da versão da API Woovi — verificar com a documentação
        pixId = body?.transfer?.endToEndId ?? body?.endToEndId ?? body?.id ?? null;
        pixStatus = "processing";
      } else {
        const errBody = await wooviRes.text();
        console.error("Woovi error:", wooviRes.status, errBody);
        pixStatus = "failed";
      }
    }

    // 4. Atualizar coleta com resultado do PIX
    await supabase
      .from("oil_collections")
      .update({ pix_id: pixId, pix_status: pixStatus })
      .eq("id", collection.id);

    return json({
      success: true,
      collectionId: collection.id,
      pixId,
      pixStatus,
      rewardBrl,
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
