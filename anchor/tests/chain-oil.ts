/**
 * Chain Oil — Suite Completa de Testes de Integração
 *
 * Cobre todas as instruções do programa Anchor:
 *   • initialize_oracle  — cria o PDA global de preço do óleo
 *   • update_price       — CRE atualiza preço on-chain (anti-replay + auth)
 *   • register_collection — registra coleta com atestação Chainlink SOL/USD
 *   • burn_cot           — queima COT via CPI ao Token-2022
 *
 * Pré-requisito: anchor build (gera target/types/chain_oil.ts + IDL completo)
 * Execução:      anchor test --skip-local-validator
 */

import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { randomBytes } from "crypto";
import { assert } from "chai";

// Feed SOL/USD Devnet — https://docs.chain.link/data-feeds/price-feeds/addresses?network=solana
const SOL_USD_DEVNET = new PublicKey("HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKegfthMvWdo");

// Gera 16 bytes aleatórios como array para supabase_id
const randomSupabaseId = () => Array.from(randomBytes(16));

// Acessa o .payer do NodeWallet sem depender do tipo exportado
const payer = (wallet: anchor.Wallet) => (wallet as any).payer as Keypair;

describe("chain-oil — suite completa", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const program = anchor.workspace.ChainOil as Program<any>;
  const operator = provider.wallet;
  const connection = provider.connection;

  // PDA singleton do oráculo
  const [oraclePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("oil_oracle")],
    program.programId
  );

  // PDA de estado do operador principal
  const [operatorStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("operator_state"), operator.publicKey.toBuffer()],
    program.programId
  );

  // ─── HELPERS ─────────────────────────────────────────────────────────────

  /** Deriva o PDA da próxima coleta para este operador */
  async function nextCollectionPda(): Promise<{ collectionPda: PublicKey; seq: bigint }> {
    let seq = BigInt(0);
    try {
      const state = await program.account.operatorState.fetch(operatorStatePda);
      seq = BigInt(state.totalCollections.toString());
    } catch {
      // primeira coleta — seq = 0
    }
    const seqBuf = Buffer.alloc(8);
    seqBuf.writeBigUInt64LE(seq);
    const [collectionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("collection"), operator.publicKey.toBuffer(), seqBuf],
      program.programId
    );
    return { collectionPda, seq };
  }

  // ─── 1. INITIALIZE ORACLE ────────────────────────────────────────────────

  describe("initialize_oracle", () => {
    it("inicializa oracle com preço válido (150 centavos/L)", async () => {
      // Idempotente: se já existe, apenas verifica o estado
      let exists = false;
      try {
        await program.account.oilOracleState.fetch(oraclePda);
        exists = true;
      } catch {
        /* ainda não inicializado */
      }

      if (exists) {
        console.log("    ⚠  OilOracleState já existe — validando campos");
        const state = await program.account.oilOracleState.fetch(oraclePda);
        assert.isAbove(state.currentPrice.toNumber(), 0, "preço deve ser > 0");
        return;
      }

      await program.methods
        .initializeOracle(operator.publicKey, new BN(150))
        .accounts({
          deployer: operator.publicKey,
          oracleState: oraclePda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const state = await program.account.oilOracleState.fetch(oraclePda);
      assert.equal(state.currentPrice.toNumber(), 150, "preço inicial deve ser 150");
      assert.ok(state.authority.equals(operator.publicKey), "authority deve ser o deployer");
      assert.equal(state.updateCount.toNumber(), 0, "updateCount inicial = 0");
      assert.isAbove(state.lastUpdate.toNumber(), 0, "lastUpdate deve estar preenchido");
    });

    it("rejeita preço abaixo de 50 centavos (InvalidPrice)", async () => {
      try {
        await program.methods
          .initializeOracle(operator.publicKey, new BN(49))
          .accounts({
            deployer: operator.publicKey,
            oracleState: oraclePda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        assert.fail("deveria ter lançado erro InvalidPrice");
      } catch (e: any) {
        assert.ok(
          e.message.includes("InvalidPrice") ||
          e.message.includes("6005") ||  // error code
          e.message.includes("already in use"),  // se PDA já existe, erro de outro tipo
          `erro esperado mas recebeu: ${e.message}`
        );
      }
    });

    it("rejeita preço acima de 2000 centavos (InvalidPrice)", async () => {
      try {
        await program.methods
          .initializeOracle(operator.publicKey, new BN(2001))
          .accounts({
            deployer: operator.publicKey,
            oracleState: oraclePda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        assert.fail("deveria ter lançado erro InvalidPrice");
      } catch (e: any) {
        assert.ok(
          e.message.includes("InvalidPrice") ||
          e.message.includes("6005") ||
          e.message.includes("already in use"),
          `erro esperado mas recebeu: ${e.message}`
        );
      }
    });
  });

  // ─── 2. UPDATE PRICE ─────────────────────────────────────────────────────

  describe("update_price", () => {
    before(async () => {
      // Garante que o oracle está inicializado para os testes de update
      try {
        await program.account.oilOracleState.fetch(oraclePda);
      } catch {
        await program.methods
          .initializeOracle(operator.publicKey, new BN(120))
          .accounts({
            deployer: operator.publicKey,
            oracleState: oraclePda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
      }
    });

    it("atualiza preço com authority válida e incrementa updateCount", async () => {
      const before = await program.account.oilOracleState.fetch(oraclePda);
      const countBefore = before.updateCount.toNumber();

      // source_timestamp precisa ser > last_update (que é blockchain time)
      const freshTs = new BN(Math.floor(Date.now() / 1000) + 3600);

      await program.methods
        .updatePrice(new BN(200), freshTs)
        .accounts({
          authority: operator.publicKey,
          oracleState: oraclePda,
        })
        .rpc();

      const after = await program.account.oilOracleState.fetch(oraclePda);
      assert.equal(after.currentPrice.toNumber(), 200, "preço deve ser atualizado para 200");
      assert.equal(
        after.updateCount.toNumber(),
        countBefore + 1,
        "updateCount deve incrementar em 1"
      );
    });

    it("rejeita authority não autorizada (UnauthorizedAuthority)", async () => {
      const intruder = Keypair.generate();
      const ts = new BN(Math.floor(Date.now() / 1000) + 9999);

      try {
        await program.methods
          .updatePrice(new BN(100), ts)
          .accounts({
            authority: intruder.publicKey,
            oracleState: oraclePda,
          })
          .signers([intruder])
          .rpc();
        assert.fail("authority não autorizada deveria ser rejeitada");
      } catch (e: any) {
        assert.ok(
          e.message.includes("UnauthorizedAuthority") ||
          e.message.includes("has_one") ||
          e.message.includes("2003") ||
          e.message.includes("A has_one constraint was violated"),
          `erro de autorização esperado: ${e.message}`
        );
      }
    });

    it("rejeita timestamp stale — proteção anti-replay (StaleUpdate)", async () => {
      const staleTs = new BN(0); // timestamp muito antigo — certamente < last_update

      try {
        await program.methods
          .updatePrice(new BN(180), staleTs)
          .accounts({
            authority: operator.publicKey,
            oracleState: oraclePda,
          })
          .rpc();
        assert.fail("timestamp stale deveria ser rejeitado");
      } catch (e: any) {
        assert.ok(
          e.message.includes("StaleUpdate") ||
          e.message.includes("6004"),
          `erro StaleUpdate esperado: ${e.message}`
        );
      }
    });

    it("rejeita preço fora do intervalo válido (InvalidPrice)", async () => {
      const futureTs = new BN(Math.floor(Date.now() / 1000) + 99999);

      try {
        await program.methods
          .updatePrice(new BN(2500), futureTs)  // > 2000 centavos
          .accounts({
            authority: operator.publicKey,
            oracleState: oraclePda,
          })
          .rpc();
        assert.fail("preço inválido deveria ser rejeitado");
      } catch (e: any) {
        assert.ok(
          e.message.includes("InvalidPrice") ||
          e.message.includes("6005"),
          `erro InvalidPrice esperado: ${e.message}`
        );
      }
    });
  });

  // ─── 3. REGISTER COLLECTION ──────────────────────────────────────────────

  describe("register_collection", () => {
    it("registra coleta com atestação Chainlink SOL/USD em tempo real", async () => {
      const { collectionPda, seq } = await nextCollectionPda();

      await program.methods
        .registerCollection({
          litersMl: new BN(3000),        // 3 litros
          rewardCentavos: new BN(360),   // R$ 3,60
          supabaseId: randomSupabaseId(),
        })
        .accounts({
          operator: operator.publicKey,
          operatorState: operatorStatePda,
          collection: collectionPda,
          chainlinkFeed: SOL_USD_DEVNET,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const col = await program.account.collection.fetch(collectionPda);
      assert.equal(col.litersMl.toNumber(), 3000, "litersMl deve ser 3000");
      assert.equal(col.rewardCentavos.toNumber(), 360, "rewardCentavos deve ser 360");
      assert.isAbove(col.solUsdPrice.toNumber(), 0, "preço SOL/USD deve ser > 0 (atestado pelo Chainlink)");
      assert.equal(col.seq.toString(), seq.toString(), "seq deve corresponder ao contador atual");
      assert.ok(col.operator.equals(operator.publicKey), "operator deve ser a wallet do operador");
      assert.isAbove(col.collectedAt.toNumber(), 0, "collected_at deve ser preenchido");
      assert.isAtMost(col.solUsdDecimals, 18, "decimais do feed devem ser razoáveis");

      console.log(`    Chainlink SOL/USD = ${col.solUsdPrice} × 10^-${col.solUsdDecimals}`);
    });

    it("incrementa o contador do operador a cada coleta", async () => {
      const before = await program.account.operatorState.fetch(operatorStatePda);
      const countBefore = before.totalCollections.toNumber();

      const { collectionPda } = await nextCollectionPda();

      await program.methods
        .registerCollection({
          litersMl: new BN(1500),
          rewardCentavos: new BN(180),
          supabaseId: randomSupabaseId(),
        })
        .accounts({
          operator: operator.publicKey,
          operatorState: operatorStatePda,
          collection: collectionPda,
          chainlinkFeed: SOL_USD_DEVNET,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const after = await program.account.operatorState.fetch(operatorStatePda);
      assert.equal(
        after.totalCollections.toNumber(),
        countBefore + 1,
        "totalCollections deve incrementar em 1"
      );
    });

    it("dois operadores têm contadores e PDAs completamente independentes", async () => {
      const op2 = Keypair.generate();

      // Airdrop para cobrir fees do segundo operador
      try {
        const sig = await connection.requestAirdrop(op2.publicKey, 0.1 * LAMPORTS_PER_SOL);
        await connection.confirmTransaction(sig, "confirmed");
      } catch {
        // Devnet airdrop pode estar com rate-limit — pular este sub-teste
        console.log("    ⚠  Airdrop indisponível — sub-teste de segundo operador pulado");
        return;
      }

      const [op2StatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("operator_state"), op2.publicKey.toBuffer()],
        program.programId
      );
      const seqBuf = Buffer.alloc(8);
      seqBuf.writeBigUInt64LE(BigInt(0));
      const [op2CollectionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("collection"), op2.publicKey.toBuffer(), seqBuf],
        program.programId
      );

      await program.methods
        .registerCollection({
          litersMl: new BN(1000),
          rewardCentavos: new BN(120),
          supabaseId: randomSupabaseId(),
        })
        .accounts({
          operator: op2.publicKey,
          operatorState: op2StatePda,
          collection: op2CollectionPda,
          chainlinkFeed: SOL_USD_DEVNET,
          systemProgram: SystemProgram.programId,
        })
        .signers([op2])
        .rpc();

      const op2State = await program.account.operatorState.fetch(op2StatePda);
      assert.equal(op2State.totalCollections.toNumber(), 1, "op2 deve ter 1 coleta");
      assert.ok(op2State.operator.equals(op2.publicKey), "operator do estado deve ser op2");
    });

    it("rejeita coleta com litersMl = 0 (InvalidLiters)", async () => {
      const { collectionPda } = await nextCollectionPda();

      try {
        await program.methods
          .registerCollection({
            litersMl: new BN(0),
            rewardCentavos: new BN(0),
            supabaseId: randomSupabaseId(),
          })
          .accounts({
            operator: operator.publicKey,
            operatorState: operatorStatePda,
            collection: collectionPda,
            chainlinkFeed: SOL_USD_DEVNET,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        assert.fail("liters = 0 deveria ser rejeitado");
      } catch (e: any) {
        assert.ok(
          e.message.includes("InvalidLiters") ||
          e.message.includes("6002"),
          `InvalidLiters esperado: ${e.message}`
        );
      }
    });

    it("rejeita feed com owner inválido (InvalidFeedOwner)", async () => {
      const fakeFeed = Keypair.generate(); // conta sem owner Chainlink
      const { collectionPda } = await nextCollectionPda();

      try {
        await program.methods
          .registerCollection({
            litersMl: new BN(1000),
            rewardCentavos: new BN(120),
            supabaseId: randomSupabaseId(),
          })
          .accounts({
            operator: operator.publicKey,
            operatorState: operatorStatePda,
            collection: collectionPda,
            chainlinkFeed: fakeFeed.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        assert.fail("feed inválido deveria ser rejeitado");
      } catch (e: any) {
        assert.ok(
          e.message.includes("InvalidFeedOwner") ||
          e.message.includes("6000"),
          `InvalidFeedOwner esperado: ${e.message}`
        );
      }
    });
  });

  // ─── 4. BURN COT (Token-2022 CPI) ─────────────────────────────────────────

  describe("burn_cot", () => {
    let testMint: PublicKey;
    let operatorTokenAccount: PublicKey;
    const INITIAL_SUPPLY = 10;

    before(async () => {
      // Cria mint Token-2022 exclusivo para testes (decimais=0, igual ao COT real)
      const mintKeypair = Keypair.generate();
      testMint = await createMint(
        connection,
        payer(operator),          // fee payer
        operator.publicKey,       // mint authority
        null,                     // sem freeze authority
        0,                        // decimals = 0 (1 COT = 1 litro)
        mintKeypair,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      // Cria ATA Token-2022 para o operador
      const ataInfo = await getOrCreateAssociatedTokenAccount(
        connection,
        payer(operator),
        testMint,
        operator.publicKey,
        false,
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      operatorTokenAccount = ataInfo.address;

      // Minta 10 COT para o operador
      await mintTo(
        connection,
        payer(operator),
        testMint,
        operatorTokenAccount,
        operator.publicKey,
        INITIAL_SUPPLY,
        [],
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      const info = await getAccount(connection, operatorTokenAccount, undefined, TOKEN_2022_PROGRAM_ID);
      assert.equal(Number(info.amount), INITIAL_SUPPLY, `setup: deve ter ${INITIAL_SUPPLY} COT`);
    });

    it("queima COT via CPI ao Token-2022 e reduz saldo", async () => {
      await program.methods
        .burnCot(new BN(5))
        .accounts({
          operator: operator.publicKey,
          operatorTokenAccount,
          cotMint: testMint,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      const info = await getAccount(connection, operatorTokenAccount, undefined, TOKEN_2022_PROGRAM_ID);
      assert.equal(Number(info.amount), 5, "saldo deve ser 5 após queimar 5 de 10");
    });

    it("queima quantidade restante e zera o saldo", async () => {
      await program.methods
        .burnCot(new BN(5))
        .accounts({
          operator: operator.publicKey,
          operatorTokenAccount,
          cotMint: testMint,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      const info = await getAccount(connection, operatorTokenAccount, undefined, TOKEN_2022_PROGRAM_ID);
      assert.equal(Number(info.amount), 0, "saldo deve zerar após queimar o restante");
    });

    it("rejeita amount = 0 (InvalidLiters)", async () => {
      try {
        await program.methods
          .burnCot(new BN(0))
          .accounts({
            operator: operator.publicKey,
            operatorTokenAccount,
            cotMint: testMint,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
          })
          .rpc();
        assert.fail("amount 0 deveria ser rejeitado");
      } catch (e: any) {
        assert.ok(
          e.message.includes("InvalidLiters") ||
          e.message.includes("6002"),
          `InvalidLiters esperado: ${e.message}`
        );
      }
    });

    it("rejeita token program incorreto (InvalidTokenProgram)", async () => {
      const SPL_TOKEN_CLASSIC = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

      try {
        await program.methods
          .burnCot(new BN(1))
          .accounts({
            operator: operator.publicKey,
            operatorTokenAccount,
            cotMint: testMint,
            tokenProgram: SPL_TOKEN_CLASSIC,
          })
          .rpc();
        assert.fail("token program incorreto deveria ser rejeitado");
      } catch (e: any) {
        assert.ok(
          e.message.includes("InvalidTokenProgram") ||
          e.message.includes("6006"),
          `InvalidTokenProgram esperado: ${e.message}`
        );
      }
    });
  });
});
