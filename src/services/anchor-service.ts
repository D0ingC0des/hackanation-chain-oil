import { AnchorProvider, Program, BN, web3 } from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import type { AnchorWallet } from "@solana/wallet-adapter-react";

// Feed SOL/USD Devnet — https://docs.chain.link/data-feeds/price-feeds/addresses?network=solana
export const SOL_USD_DEVNET = new PublicKey(
  "HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKegfthMvWdo",
);

// Substituir pelo Program ID real após `anchor build && anchor deploy`
const PROGRAM_ID = new PublicKey(
  "CHAiNoiLXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
);

const RPC = "https://api.devnet.solana.com";

export interface RegisterCollectionOnChainParams {
  wallet: AnchorWallet;
  /** UUID do Supabase como string (ex: "550e8400-e29b-41d4-a716-446655440000") */
  supabaseId: string;
  litersML: number;       // litros × 1000 (2.5L → 2500)
  rewardCentavos: number; // BRL × 100 (R$3,00 → 300)
}

/** Converte UUID string em [u8; 16] */
function uuidToBytes(uuid: string): number[] {
  const hex = uuid.replace(/-/g, "");
  const bytes: number[] = [];
  for (let i = 0; i < 32; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return bytes;
}

export async function registerCollectionOnChain(
  params: RegisterCollectionOnChainParams,
): Promise<string> {
  const { wallet, supabaseId, litersML, rewardCentavos } = params;

  const connection = new Connection(RPC, "confirmed");
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });

  // IDL gerado por `anchor build` — o stub em /anchor/target/idl/ é substituído pelo build real
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let idl: any;
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — arquivo gerado por `anchor build`; stub existente até o primeiro build
    idl = (await import("../../anchor/target/idl/chain_oil.json")) as any;
  } catch {
    throw new Error("Anchor IDL not built yet — run `anchor build` inside /anchor");
  }
  const program = new Program(idl, provider);

  const [operatorState] = PublicKey.findProgramAddressSync(
    [Buffer.from("operator_state"), wallet.publicKey.toBuffer()],
    PROGRAM_ID,
  );

  let seq = BigInt(0);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = await (program.account as any).operatorState.fetch(operatorState);
    seq = BigInt(state.totalCollections.toString());
  } catch {
    // primeira coleta do operador
  }

  const seqBuf = Buffer.alloc(8);
  seqBuf.writeBigUInt64LE(seq);

  const [collectionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("collection"), wallet.publicKey.toBuffer(), seqBuf],
    PROGRAM_ID,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tx = await (program.methods as any)
    .registerCollection({
      litersMl: new BN(litersML),
      rewardCentavos: new BN(rewardCentavos),
      supabaseId: uuidToBytes(supabaseId),
    })
    .accounts({
      operator: wallet.publicKey,
      operatorState,
      collection: collectionPda,
      chainlinkFeed: SOL_USD_DEVNET,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();

  return tx as string;
}
