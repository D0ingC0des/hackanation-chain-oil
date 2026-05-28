import { Connection, Transaction, Keypair } from "npm:@solana/web3.js@1";
import postgres from "npm:postgres@3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOLANA_RPC = "https://api.devnet.solana.com";

interface ProcessInput {
  collectionId: string;
  partialSignedTxBase64: string;
  operatorKey: string;
  citizenPhone: string;
  liters: number;
  rewardBrl: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false });

  try {
    const {
      collectionId,
      partialSignedTxBase64,
      operatorKey,
      citizenPhone,
      liters,
      rewardBrl,
    }: ProcessInput = await req.json();

    if (!collectionId || !partialSignedTxBase64 || !operatorKey || !liters) {
      return json({ success: false, error: "Parâmetros obrigatórios ausentes" }, 400);
    }

    // 1. Carregar keypair da tesouraria
    const keypairEnv = Deno.env.get("TREASURY_KEYPAIR");
    if (!keypairEnv) throw new Error("TREASURY_KEYPAIR não configurada");
    const treasury = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keypairEnv)));

    // 2. Deserializar tx parcialmente assinada pelo operador
    const txBytes = Uint8Array.from(atob(partialSignedTxBase64), (c) => c.charCodeAt(0));
    const tx = Transaction.from(txBytes);

    // 3. Tesouraria co-assina (adiciona a assinatura do feePayer + mintTo authority)
    tx.partialSign(treasury);

    // 4. Submeter para Solana devnet
    const connection = new Connection(SOLANA_RPC, "confirmed");
    const rawTx = tx.serialize();
    const txHash = await connection.sendRawTransaction(rawTx, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    await connection.confirmTransaction(txHash, "confirmed");

    console.log("tx co-assinada confirmada:", txHash);

    // 5. Atualizar registro com txHash + operador (postgres direto — chainoil schema)
    await sql`
      UPDATE chainoil.collections
      SET tx_sig_coassigned = ${txHash}, operator_pubkey = ${operatorKey}, pix_status = 'pending'
      WHERE id = ${collectionId}
    `;

    // 6. PIX via Woovi
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
          Authorization: `Bearer ${wooviKey}`,
        },
        body: JSON.stringify({
          value: Math.round(rewardBrl * 100),
          destinationAlias: citizenPhone,
          destinationAliasType: "PHONE",
          correlationID: collectionId,
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
      pixId = `mock-${collectionId}`;
      pixStatus = "mock_pending";
    }

    // 7. Atualizar pix_id + pix_status
    await sql`
      UPDATE chainoil.collections
      SET pix_id = ${pixId}, pix_status = ${pixStatus}
      WHERE id = ${collectionId}
    `;

    return json({
      success: true,
      collectionId,
      txHash,
      pixId,
      pixStatus,
      rewardBrl,
      mode: wooviMode,
    });
  } catch (err) {
    console.error("process-collection error:", err);
    return json({ success: false, error: (err as Error).message }, 500);
  } finally {
    await sql.end();
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
