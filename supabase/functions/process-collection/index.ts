import { Connection, Transaction, Keypair, PublicKey } from "npm:@solana/web3.js@1";
import { TOKEN_2022_PROGRAM_ID } from "npm:@solana/spl-token@0.4";
import postgres from "npm:postgres@3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOLANA_RPC = "https://api.devnet.solana.com";

type PixType = "PHONE" | "CPF" | "EMAIL";

interface ProcessInput {
  collectionId: string;
  partialSignedTxBase64: string;
  operatorKey: string;
  citizenPhone: string;
  citizenPixType?: PixType;
  liters: number;
  rewardBrl: number;
  photoBase64?: string;
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
      citizenPixType,
      liters,
      rewardBrl,
      photoBase64,
    }: ProcessInput = await req.json();

    if (!collectionId || !partialSignedTxBase64 || !operatorKey || !liters) {
      return json({ success: false, error: "Parâmetros obrigatórios ausentes" }, 400);
    }
    console.log("[1] params ok, collectionId:", collectionId);

    // 1. Carregar keypair da tesouraria
    const keypairEnv = Deno.env.get("TREASURY_KEYPAIR");
    if (!keypairEnv) throw new Error("TREASURY_KEYPAIR não configurada");
    const treasury = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keypairEnv)));
    console.log("[2] treasury loaded:", treasury.publicKey.toBase58().slice(0, 8));

    // 2. Deserializar tx parcialmente assinada pelo operador
    const txBytes = Uint8Array.from(atob(partialSignedTxBase64), (c) => c.charCodeAt(0));
    const tx = Transaction.from(txBytes);
    console.log("[3] tx deserialized, recentBlockhash:", tx.recentBlockhash);

    // 3. Tesouraria co-assina
    tx.partialSign(treasury);
    console.log("[4] treasury co-signed");

    // 4. Submeter para Solana devnet
    const connection = new Connection(SOLANA_RPC, "confirmed");
    const rawTx = tx.serialize();
    console.log("[5] sending raw tx...");
    const txHash = await connection.sendRawTransaction(rawTx, {
      skipPreflight: true,
      maxRetries: 3,
    });
    console.log("[6] tx sent, hash:", txHash);

    // Usa o blockhash da própria tx para confirmar (evita discrepância de altura)
    const txBlockhash = tx.recentBlockhash!;
    const { lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    console.log("[7] confirming tx...");
    await connection.confirmTransaction(
      { signature: txHash, blockhash: txBlockhash, lastValidBlockHeight },
      "confirmed",
    );
    console.log("[8] tx confirmed:", txHash);

    // 5. Atualizar registro com txHash + operador
    try {
      await sql`
        UPDATE chainoil.collections
        SET tx_sig_coassigned = ${txHash}, operator_pubkey = ${operatorKey}, pix_status = 'pending'
        WHERE id = ${collectionId}
      `;
      console.log("[9] chainoil.collections updated");
    } catch (dbErr) {
      console.error("[9] chainoil update error (non-fatal):", (dbErr as Error).message);
    }

    // 6. PIX via Woovi — mesmo padrão do request-payout (Uber Money)
    // WOOVI_APP_ID = base64(clientId:clientSecret) — AppID gerado em Autorização (AppID) no painel
    const wooviKey = Deno.env.get("WOOVI_APP_ID") ?? Deno.env.get("WOOVI_API_KEY") ?? "";
    const wooviMode = "mock"; //(Deno.env.get("WOOVI_MODE") ?? "sandbox").toLowerCase();
    const wooviBase = Deno.env.get("WOOVI_API_URL") ?? "https://api.woovi-sandbox.com/api/v1";
    console.log("[10] wooviMode:", wooviMode, "wooviKey set:", !!wooviKey, "base:", wooviBase);

    // Normaliza a chave PIX para o formato esperado pela Woovi
    const pixType = citizenPixType ?? "PHONE";
    let normalizedPixKey = citizenPhone;
    if (pixType === "PHONE") {
      const digits = citizenPhone.replace(/\D/g, "");
      normalizedPixKey = digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
    } else if (pixType === "CPF") {
      normalizedPixKey = citizenPhone.replace(/\D/g, "");
    }
    console.log("[10b] pixType:", pixType, "normalizedKey:", normalizedPixKey);

    let pixId: string | null = null;
    let pixStatus = "pending";

    if (wooviMode === "mock" || !wooviKey) {
      pixId = `mock-${collectionId}`;
      pixStatus = "mock_pending";
      console.log("[11] mock PIX, pixId:", pixId);
    } else {
      const wooviRes = await fetch(`${wooviBase}/payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: wooviKey,
        },
        body: JSON.stringify({
          type: "PIX_KEY",
          value: Math.round(rewardBrl * 100),
          destinationAlias: normalizedPixKey,
          destinationAliasType: pixType,
          correlationID: collectionId,
          comment: `ChainOil - coleta de ${liters}L de óleo usado`,
          autoApprove: false,
        }),
        signal: AbortSignal.timeout(25_000),
      });

      const wooviText = await wooviRes.text();
      if (wooviRes.ok) {
        let wooviData: Record<string, unknown> | null = null;
        try { wooviData = JSON.parse(wooviText); } catch { /* keep null */ }
        pixId = (wooviData?.transaction as Record<string, unknown> | undefined)?.endToEndId as string ??
          (wooviData?.payment as Record<string, unknown> | undefined)?.correlationID as string ?? null;
        if (wooviMode === "sandbox") {
          pixId = `SANDBOX-${collectionId.slice(0, 8)}`;
          pixStatus = "confirmed";
        } else {
          pixStatus = "processing";
        }
      } else {
        console.error("Woovi error:", wooviRes.status, wooviText);
        pixStatus = "failed";
      }
    }

    // 7. Atualizar pix_id + pix_status em ambos os schemas
    try {
      await sql`
        UPDATE chainoil.collections
        SET pix_id = ${pixId}, pix_status = ${pixStatus}
        WHERE id = ${collectionId}
      `;
    } catch (dbErr) {
      console.error("[12] chainoil pix update error (non-fatal):", (dbErr as Error).message);
    }
    try {
      await sql`
        UPDATE public.oil_collections
        SET pix_status = ${pixStatus}, pix_id = ${pixId},
            citizen_pix_type = ${citizenPixType ?? "PHONE"}
        WHERE id = ${collectionId}
      `;
      console.log("[13] public.oil_collections updated, pix_status:", pixStatus);
    } catch (dbErr) {
      console.error("[13] public update error (non-fatal):", (dbErr as Error).message);
    }

    // 8. Upload da foto via service role (evita RLS no client)
    if (photoBase64) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const base64Data = photoBase64.includes(",") ? photoBase64.split(",")[1] : photoBase64;
        const photoBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        const photoPath = `${operatorKey}/${collectionId}.jpg`;

        const uploadRes = await fetch(
          `${supabaseUrl}/storage/v1/object/collection-photos/${photoPath}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              "Content-Type": "image/jpeg",
              "x-upsert": "true",
            },
            body: photoBytes,
          },
        );

        if (uploadRes.ok) {
          const photoUrl = `${supabaseUrl}/storage/v1/object/public/collection-photos/${photoPath}`;
          await sql`UPDATE chainoil.collections SET photo_url = ${photoUrl} WHERE id = ${collectionId}`;
          console.log("[14] photo uploaded:", photoUrl);
        } else {
          console.error("[14] photo upload failed:", uploadRes.status, await uploadRes.text());
        }
      } catch (photoErr) {
        console.error("[14] photo upload error (non-fatal):", (photoErr as Error).message);
      }
    }

    // ── Resumo da transação ChainOil ──────────────────────────────────────────
    const operatorTokenSeed = operatorKey.slice(0, 32);
    const operatorTokenAcc = await PublicKey.createWithSeed(
      treasury.publicKey,
      operatorTokenSeed,
      TOKEN_2022_PROGRAM_ID,
    );
    console.log("━━━ ChainOil TX SUMMARY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Data/hora  :", new Date().toISOString());
    console.log("Coleta ID  :", collectionId);
    console.log("─── On-chain (Solana devnet) ───────────────────────────");
    console.log("Origem (mintAuthority) :", treasury.publicKey.toBase58());
    console.log("Destino (token account):", operatorTokenAcc.toBase58());
    console.log("Operador (wallet)      :", operatorKey);
    console.log("COTs mintadas          :", Math.round(liters), "COT");
    console.log("TX Status              : confirmed");
    console.log("TX Hash                :", txHash);
    console.log("Explorer               :", `https://explorer.solana.com/tx/${txHash}?cluster=devnet`);
    console.log("─── PIX ────────────────────────────────────────────────");
    console.log("Chave PIX cidadão      :", citizenPhone, `(${citizenPixType ?? "PHONE"})`);
    console.log("Valor                  : R$", rewardBrl.toFixed(2));
    console.log("PIX Status             :", pixStatus);
    console.log("PIX ID                 :", pixId);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return json({
      success: true,
      collectionId,
      txHash,
      pixId,
      pixStatus,
      rewardBrl,
      mode: wooviMode,
      summary: {
        timestamp: new Date().toISOString(),
        onChain: {
          origin: treasury.publicKey.toBase58(),
          destination: operatorTokenAcc.toBase58(),
          operator: operatorKey,
          cotsTransferred: Math.round(liters),
          txHash,
          txStatus: "confirmed",
          explorer: `https://explorer.solana.com/tx/${txHash}?cluster=devnet`,
        },
        pix: {
          citizenKey: citizenPhone,
          pixType: citizenPixType ?? "PHONE",
          amountBrl: rewardBrl,
          pixId,
          pixStatus,
        },
      },
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
