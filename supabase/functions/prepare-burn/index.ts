import {
  Connection,
  Transaction,
  PublicKey,
  TransactionInstruction,
  Keypair,
} from "npm:@solana/web3.js@1";
import {
  createBurnInstruction,
  TOKEN_2022_PROGRAM_ID,
} from "npm:@solana/spl-token@0.4";
import postgres from "npm:postgres@3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COT_MINT = new PublicKey("4fPShVRxVyF2T7CY7hwzpDeMhKFP3M5GrPpXSRiAi8KJ");
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const SOLANA_RPC = "https://api.devnet.solana.com";

function operatorTokenAccountAddress(
  treasuryPubkey: PublicKey,
  operatorKey: string,
): Promise<PublicKey> {
  return PublicKey.createWithSeed(
    treasuryPubkey,
    operatorKey.slice(0, 32),
    TOKEN_2022_PROGRAM_ID,
  );
}

interface BurnInput {
  operatorKey: string;
  amount: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false });

  try {
    const { operatorKey, amount }: BurnInput = await req.json();

    if (!operatorKey || !amount || amount <= 0) {
      return json({ success: false, error: "operatorKey e amount são obrigatórios" }, 400);
    }

    const amountInt = Math.floor(amount);
    if (amountInt <= 0) {
      return json({ success: false, error: "amount deve ser um inteiro positivo" }, 400);
    }

    const keypairEnv = Deno.env.get("TREASURY_KEYPAIR");
    if (!keypairEnv) throw new Error("TREASURY_KEYPAIR não configurada");
    const treasury = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keypairEnv)));
    const operatorPubkey = new PublicKey(operatorKey);
    const operatorTokenAcc = await operatorTokenAccountAddress(treasury.publicKey, operatorKey);

    const burnId = crypto.randomUUID();

    await sql`
      INSERT INTO chainoil.oil_burns
        (id, operator_key, liters_burned, tokens_burned, reason)
      VALUES
        (${burnId}, ${operatorKey}, ${amountInt}, ${amountInt}, 'processed')
    `;

    const connection = new Connection(SOLANA_RPC, "confirmed");
    const { blockhash } = await connection.getLatestBlockhash("confirmed");

    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = operatorPubkey;

    const memoText = `chainoil-burn|${burnId}|${operatorKey}|${amountInt}cot`;
    tx.add(
      new TransactionInstruction({
        programId: MEMO_PROGRAM_ID,
        keys: [{ pubkey: operatorPubkey, isSigner: true, isWritable: false }],
        data: new TextEncoder().encode(memoText),
      }),
    );

    tx.add(
      createBurnInstruction(
        operatorTokenAcc,
        COT_MINT,
        operatorPubkey,
        BigInt(amountInt),
        [],
        TOKEN_2022_PROGRAM_ID,
      ),
    );

    const txBytes = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
    const txBase64 = btoa(String.fromCharCode(...txBytes));

    return json({ success: true, burnId, txBase64 });
  } catch (err) {
    console.error("prepare-burn error:", err);
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
