import {
  Connection,
  Transaction,
} from "npm:@solana/web3.js@1";
import postgres from "npm:postgres@3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOLANA_RPC = "https://api.devnet.solana.com";

interface ProcessBurnInput {
  burnId: string;
  signedTxBase64: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false });

  try {
    const { burnId, signedTxBase64 }: ProcessBurnInput = await req.json();

    if (!burnId || !signedTxBase64) {
      return json({ success: false, error: "burnId e signedTxBase64 são obrigatórios" }, 400);
    }

    const txBytes = Uint8Array.from(atob(signedTxBase64), (c) => c.charCodeAt(0));
    const tx = Transaction.from(txBytes);

    const connection = new Connection(SOLANA_RPC, "confirmed");
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

    const sig = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: true,
      maxRetries: 3,
    });

    await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed",
    );

    await sql`
      UPDATE chainoil.oil_burns
      SET tx_sig = ${sig}
      WHERE id = ${burnId}
    `;

    console.log(`[process-burn] queimou burnId=${burnId} txSig=${sig}`);

    return json({ success: true, txHash: sig });
  } catch (err) {
    console.error("process-burn error:", err);
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
