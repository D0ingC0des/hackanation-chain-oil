import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { assert } from "chai";
import type { ChainOil } from "../target/types/chain_oil";

// Feed SOL/USD Devnet — verificar em https://docs.chain.link/data-feeds/price-feeds/addresses?network=solana
const SOL_USD_DEVNET = new PublicKey("HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKegfthMvWdo");

describe("chain-oil", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ChainOil as Program<ChainOil>;
  const operator = provider.wallet;

  it("registra uma coleta com preço Chainlink SOL/USD", async () => {
    const [operatorState] = PublicKey.findProgramAddressSync(
      [Buffer.from("operator_state"), operator.publicKey.toBuffer()],
      program.programId,
    );

    // Ler seq atual para derivar PDA da coleta
    let seq = BigInt(0);
    try {
      const state = await program.account.operatorState.fetch(operatorState);
      seq = BigInt(state.totalCollections.toString());
    } catch {
      // conta ainda não existe — seq = 0
    }

    const seqBuf = Buffer.alloc(8);
    seqBuf.writeBigUInt64LE(seq);

    const [collectionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("collection"), operator.publicKey.toBuffer(), seqBuf],
      program.programId,
    );

    const supabaseId = Array.from(crypto.getRandomValues(new Uint8Array(16)));

    const tx = await program.methods
      .registerCollection({
        litersMl: new anchor.BN(2500),      // 2.5 L
        rewardCentavos: new anchor.BN(300),  // R$ 3,00
        supabaseId,
      })
      .accounts({
        operator: operator.publicKey,
        operatorState,
        collection: collectionPda,
        chainlinkFeed: SOL_USD_DEVNET,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("tx:", tx);

    const col = await program.account.collection.fetch(collectionPda);
    assert.equal(col.litersMl.toNumber(), 2500);
    assert.equal(col.rewardCentavos.toNumber(), 300);
    assert.isAbove(col.solUsdPrice.toNumber(), 0, "SOL/USD deve ser > 0");
    console.log("SOL/USD atestado:", col.solUsdPrice.toString(), "decimais:", col.solUsdDecimals);
  });
});
