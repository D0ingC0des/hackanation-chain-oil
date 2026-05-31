/**
 * initialize-oracle.ts — chama initialize_oracle no programa chain_oil (devnet).
 *
 * Executar UMA VEZ após o deploy para criar o PDA OilOracleState.
 * Usa o mesmo keypair da treasury como deployer e authority inicial.
 *
 * Rodar: npx tsx scripts/initialize-oracle.ts
 */
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'

const PROGRAM_ID   = new PublicKey('49NBUcWMprgym8gqFegGEVisvcEqHe5RgHmpzmKdaaDy')
const RPC          = 'https://api.devnet.solana.com'
const KEYPAIR_PATH = `${os.homedir()}/.config/solana/id.json`

// Taxa inicial: R$1,20/L = 120 centavos
const INITIAL_PRICE_CENTAVOS = 120n

function discriminator(name: string): Buffer {
  return createHash('sha256').update(`global:${name}`).digest().subarray(0, 8)
}

function u64LE(n: bigint): Buffer {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64LE(n, 0)
  return buf
}

async function main() {
  const conn = new Connection(RPC, 'confirmed')
  const deployer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf8'))),
  )
  console.log('Deployer/Authority:', deployer.publicKey.toBase58())

  // PDA: ["oil_oracle"]
  const [oraclePda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('oil_oracle')],
    PROGRAM_ID,
  )
  console.log('OilOracleState PDA:', oraclePda.toBase58(), `(bump=${bump})`)

  // Verificar se já existe
  const existing = await conn.getAccountInfo(oraclePda)
  if (existing) {
    console.log('PDA já existe! Tamanho:', existing.data.length, 'bytes')
    const data = existing.data.subarray(8) // skip discriminator
    const currentPrice = data.readBigUInt64LE(0)
    const lastUpdate   = data.readBigInt64LE(8)
    const updateCount  = data.readBigUInt64LE(16)
    console.log('  current_price:', currentPrice.toString(), 'centavos (R$' + (Number(currentPrice) / 100).toFixed(2) + '/L)')
    console.log('  last_update  :', new Date(Number(lastUpdate) * 1000).toISOString())
    console.log('  update_count :', updateCount.toString())
    return
  }

  // Borsh: discriminator (8) | authority: Pubkey (32) | initial_price: u64 (8)
  const authorityBytes = deployer.publicKey.toBytes()
  const data = Buffer.concat([
    discriminator('initialize_oracle'),
    Buffer.from(authorityBytes),
    u64LE(INITIAL_PRICE_CENTAVOS),
  ])

  const tx = new Transaction()
  tx.add(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: deployer.publicKey, isSigner: true,  isWritable: true  },
      { pubkey: oraclePda,          isSigner: false, isWritable: true  },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  }))

  tx.feePayer        = deployer.publicKey
  tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash
  tx.sign(deployer)

  console.log('\nEnviando initialize_oracle...')
  const sig = await conn.sendRawTransaction(tx.serialize())
  console.log('Tx sig:', sig)
  await conn.confirmTransaction(sig, 'confirmed')
  console.log('✓ OilOracleState criado!')
  console.log('  PDA    :', oraclePda.toBase58())
  console.log('  Preço  : R$' + (Number(INITIAL_PRICE_CENTAVOS) / 100).toFixed(2) + '/L')
  console.log('  Authority:', deployer.publicKey.toBase58(), '(CRE wallet)')
  console.log('  Explorer:', `https://explorer.solana.com/address/${oraclePda.toBase58()}?cluster=devnet`)
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
