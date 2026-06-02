/**
 * smoke-register-collection.ts â€” testa register_collection on-chain devnet.
 *
 * Simula: operador registra uma coleta de Ã³leo com atestaÃ§Ã£o Chainlink SOL/USD.
 * Usa o keypair local (~/.config/solana/id.json) como operador.
 *
 * Rodar: npx tsx scripts/smoke-register-collection.ts
 */
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import { createHash, randomBytes } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'

const PROGRAM_ID   = new PublicKey('DdyUTHY4Kv1ig4tUUecSKWjsiX4MCXduUuveKJfUpQhh')
const SOL_USD_FEED = new PublicKey('HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKegfthMvWdo')
const RPC          = 'https://api.devnet.solana.com'
const KEYPAIR_PATH = `${os.homedir()}/.config/solana/id.json`

function methodDiscriminator(name: string): Buffer {
  return createHash('sha256').update(`global:${name}`).digest().slice(0, 8)
}

function u64LE(n: bigint): Buffer {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64LE(n, 0)
  return buf
}

/** LÃª total_collections do PDA do operador; retorna 0n se a conta ainda nÃ£o existe. */
async function fetchOperatorSeq(conn: Connection, pda: PublicKey): Promise<bigint> {
  const acc = await conn.getAccountInfo(pda)
  if (!acc) return 0n
  // OperatorState (apÃ³s 8 bytes de discriminador Anchor):
  // operator: Pubkey (32) | total_collections: u64 (8) | bump: u8 (1)
  return acc.data.subarray(8).readBigUInt64LE(32)
}

async function main() {
  const conn = new Connection(RPC, 'confirmed')
  const operator = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf8'))),
  )
  console.log('Operator  :', operator.publicKey.toBase58())

  // PDA: operator_state â€” seeds: ["operator_state", operator.pubkey]
  const [operatorStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('operator_state'), operator.publicKey.toBuffer()],
    PROGRAM_ID,
  )
  console.log('Op State  :', operatorStatePda.toBase58())

  const seq    = await fetchOperatorSeq(conn, operatorStatePda)
  const seqBuf = Buffer.alloc(8)
  seqBuf.writeBigUInt64LE(seq, 0)

  // PDA: collection â€” seeds: ["collection", operator.pubkey, seq_le]
  const [collectionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('collection'), operator.publicKey.toBuffer(), seqBuf],
    PROGRAM_ID,
  )
  console.log('Collection:', collectionPda.toBase58(), `(seq=${seq})`)

  // supabase_id: 16 bytes (UUID â†’ bytes; aqui usamos random para smoke test)
  const supabaseId = randomBytes(16)

  const litersML       = 2500n  // 2.5 L
  const rewardCentavos = 325n   // R$ 3,25

  // Borsh: discriminator (8) | liters_ml u64 (8) | reward_centavos u64 (8) | supabase_id [u8;16]
  const data = Buffer.concat([
    methodDiscriminator('register_collection'),
    u64LE(litersML),
    u64LE(rewardCentavos),
    supabaseId,
  ])

  const tx = new Transaction()
  tx.add(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: operator.publicKey, isSigner: true,  isWritable: true  },
      { pubkey: operatorStatePda,   isSigner: false, isWritable: true  },
      { pubkey: collectionPda,      isSigner: false, isWritable: true  },
      { pubkey: SOL_USD_FEED,       isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  }))

  tx.feePayer       = operator.publicKey
  tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash
  tx.sign(operator)

  console.log('\nEnviando txâ€¦')
  const sig = await conn.sendRawTransaction(tx.serialize())
  console.log('Tx sig:', sig)
  await conn.confirmTransaction(sig, 'confirmed')
  console.log('âœ“ Confirmada!')
  console.log(`  https://explorer.solana.com/tx/${sig}?cluster=devnet`)

  // Verificar resultado
  const colAcc = await conn.getAccountInfo(collectionPda)
  console.log('\nCollection PDA size:', colAcc?.data.length, 'bytes (esperado: 106)')

  const opAcc = await conn.getAccountInfo(operatorStatePda)
  if (opAcc) {
    const newSeq = opAcc.data.subarray(8).readBigUInt64LE(32)
    console.log('Op total_collections:', newSeq.toString())
  }
}

main().catch((e) => { console.error('âŒ', e); process.exit(1) })
