import { createClient } from "npm:@supabase/supabase-js@2";
import {
  Connection,
  Transaction,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  Keypair,
} from "npm:@solana/web3.js@1";
import {
  createMintToInstruction,
  createInitializeAccount3Instruction,
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

// Basic Token-2022 account without extensions
const TOKEN_ACCOUNT_SIZE = 165;

// Deterministic token account per operator using treasury as seed base.
// Avoids the ATA Program entirely — createAccountWithSeed only needs treasury to sign.
// ATA Program (ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bwd) is absent from
// devnet/testnet on Solana v4.0.0-rc.0.
function operatorTokenAccountAddress(
  treasuryPubkey: PublicKey,
  operatorKey: string,
): Promise<PublicKey> {
  const seed = operatorKey.slice(0, 32); // seed max = 32 bytes
  return PublicKey.createWithSeed(treasuryPubkey, seed, TOKEN_2022_PROGRAM_ID);
}

interface PrepareInput {
  operatorKey: string;
  liters: number;
  citizenPhone: string;
  collectionId?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false });

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

    // Taxa atual (public schema — supabase-js funciona normalmente)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: rateRow } = await supabase
      .from("oil_config")
      .select("value")
      .eq("key", "rate_per_liter")
      .single();
    const rate = rateRow ? parseFloat(rateRow.value) : 1.2;
    const rewardBrl = parseFloat((liters * rate).toFixed(2));

    const collectionId = inputId ?? crypto.randomUUID();
    const keypairEnv = Deno.env.get("TREASURY_KEYPAIR");
    if (!keypairEnv) throw new Error("TREASURY_KEYPAIR não configurada");
    const treasury = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keypairEnv)));
    const treasuryPubkey = treasury.publicKey;
    const operatorPubkey = new PublicKey(operatorKey);

    // Pré-inserir registro via postgres direto (chainoil schema não exposto no PostgREST)
    await sql`
      INSERT INTO chainoil.collections
        (id, operator_key, operator_pubkey, citizen_phone, liters, reward_brl, rate_used, pix_status)
      VALUES
        (${collectionId}, ${operatorKey}, ${operatorKey}, ${citizenPhone ?? ""},
         ${liters}, ${rewardBrl}, ${rate}, 'preparing')
    `;

    // Replica para public.oil_collections (lido pelo app via REST anon)
    const { error: pubErr } = await supabase
      .from("oil_collections")
      .insert({
        id: collectionId,
        operator_key: operatorKey,
        citizen_phone: citizenPhone ?? "",
        liters,
        reward_brl: rewardBrl,
        rate_used: rate,
      });
    if (pubErr) console.error("oil_collections insert error:", pubErr.message);

    // Montar transação Solana
    const connection = new Connection(SOLANA_RPC, "confirmed");
    const { blockhash } = await connection.getLatestBlockhash("confirmed");

    // Endereço determinístico por operador — não depende do ATA Program
    const operatorTokenAcc = await operatorTokenAccountAddress(treasuryPubkey, operatorKey);

    const litersML = Math.round(liters * 1000);
    const timestamp = Date.now();
    const memoText = `chainoil|${collectionId}|${operatorKey}|${litersML}ml|${timestamp}`;

    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = treasuryPubkey;

    // 1. Criar conta de token do operador se ainda não existir
    //    Usa createAccountWithSeed (treasury como base) — evita o ATA Program
    const tokenAccInfo = await connection.getAccountInfo(operatorTokenAcc);
    if (!tokenAccInfo) {
      const rentExempt = await connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE);

      tx.add(
        SystemProgram.createAccountWithSeed({
          fromPubkey: treasuryPubkey,
          newAccountPubkey: operatorTokenAcc,
          basePubkey: treasuryPubkey,
          seed: operatorKey.slice(0, 32),
          lamports: rentExempt,
          space: TOKEN_ACCOUNT_SIZE,
          programId: TOKEN_2022_PROGRAM_ID,
        }),
      );

      tx.add(
        createInitializeAccount3Instruction(
          operatorTokenAcc,
          COT_MINT,
          operatorPubkey,
          TOKEN_2022_PROGRAM_ID,
        ),
      );
    }

    // 2. Memo de atestação — operador precisa assinar
    tx.add(
      new TransactionInstruction({
        programId: MEMO_PROGRAM_ID,
        keys: [{ pubkey: operatorPubkey, isSigner: true, isWritable: false }],
        data: new TextEncoder().encode(memoText),
      }),
    );

    // 3. MintTo COT → conta do operador (1 COT por litro inteiro, 0 decimais)
    tx.add(
      createMintToInstruction(
        COT_MINT,
        operatorTokenAcc,
        treasuryPubkey,
        BigInt(Math.round(liters)),
        [],
        TOKEN_2022_PROGRAM_ID,
      ),
    );

    // Serializar sem assinaturas
    const txBytes = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
    const txBase64 = btoa(String.fromCharCode(...txBytes));

    return json({ success: true, collectionId, txBase64, rewardBrl });
  } catch (err) {
    console.error("prepare-collection error:", err);
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
