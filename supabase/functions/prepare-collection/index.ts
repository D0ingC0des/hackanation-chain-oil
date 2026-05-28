import { createClient } from "npm:@supabase/supabase-js@2";
import {
  Connection,
  Transaction,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from "npm:@solana/web3.js@1";
import {
  getAssociatedTokenAddressSync,
  createMintToInstruction,
  TOKEN_PROGRAM_ID,
} from "npm:@solana/spl-token@0.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COT_MINT = new PublicKey("4fPShVRxVyF2T7CY7hwzpDeMhKFP3M5GrPpXSRiAi8KJ");
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bwd");
const SOLANA_RPC = "https://api.devnet.solana.com";

/** Cria instrução ATA idempotente sem depender de função específica do spl-token */
function makeCreateAtaIdempotentInstruction(
  payer: PublicKey,
  ata: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
): TransactionInstruction {
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ata, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: new Uint8Array([1]), // 1 = CREATE_IDEMPOTENT
  });
}

interface PrepareInput {
  operatorKey: string;
  liters: number;
  citizenPhone: string;
  collectionId?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const {
      operatorKey,
      liters,
      citizenPhone,
      collectionId: inputId,
    }: PrepareInput = await req.json();

    if (!operatorKey || !liters || liters <= 0) {
      return json({ success: false, error: "operatorKey e liters são obrigatórios" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Taxa atual
    const { data: rateRow } = await supabase
      .from("oil_config")
      .select("value")
      .eq("key", "rate_per_liter")
      .single();
    const rate = rateRow ? parseFloat(rateRow.value) : 1.2;
    const rewardBrl = parseFloat((liters * rate).toFixed(2));

    const collectionId = inputId ?? crypto.randomUUID();
    const treasuryPubkeyStr = Deno.env.get("TREASURY_PUBKEY");
    if (!treasuryPubkeyStr) throw new Error("TREASURY_PUBKEY não configurada");

    const treasuryPubkey = new PublicKey(treasuryPubkeyStr);
    const operatorPubkey = new PublicKey(operatorKey);

    // Pré-inserir registro (pix_status: "preparing")
    const { error: insertErr } = await supabase
      .schema("chainoil")
      .from("collections")
      .insert({
        id: collectionId,
        operator_key: operatorKey,
        operator_pubkey: operatorKey,
        citizen_phone: citizenPhone ?? "",
        liters,
        reward_brl: rewardBrl,
        rate_used: rate,
        pix_status: "preparing",
      });

    if (insertErr) throw new Error(insertErr.message);

    // Montar transação Solana
    const connection = new Connection(SOLANA_RPC, "confirmed");
    const { blockhash } = await connection.getLatestBlockhash("confirmed");

    const operatorAta = getAssociatedTokenAddressSync(COT_MINT, operatorPubkey);

    const litersML = Math.round(liters * 1000);
    const timestamp = Date.now();
    const memoText = `chainoil|${collectionId}|${operatorKey}|${litersML}ml|${timestamp}`;

    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = treasuryPubkey;

    // 1. Criar ATA do operador para COT (idempotente)
    tx.add(
      makeCreateAtaIdempotentInstruction(treasuryPubkey, operatorAta, operatorPubkey, COT_MINT),
    );

    // 2. Memo de atestação — operador precisa assinar
    tx.add(
      new TransactionInstruction({
        programId: MEMO_PROGRAM_ID,
        keys: [{ pubkey: operatorPubkey, isSigner: true, isWritable: false }],
        data: new TextEncoder().encode(memoText),
      }),
    );

    // 3. MintTo COT → ATA do operador (mint authority = tesouraria)
    //    1 COT por litro, 6 decimais → liters * 1_000_000
    tx.add(
      createMintToInstruction(
        COT_MINT,
        operatorAta,
        treasuryPubkey,
        BigInt(litersML) * BigInt(1000), // litersML * 1000 = liters * 1_000_000
      ),
    );

    // Serializar sem assinaturas
    const txBytes = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
    const txBase64 = btoa(String.fromCharCode(...txBytes));

    return json({ success: true, collectionId, txBase64, rewardBrl });
  } catch (err) {
    console.error("prepare-collection error:", err);
    return json({ success: false, error: (err as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
