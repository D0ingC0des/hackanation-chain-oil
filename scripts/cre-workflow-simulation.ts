/**
 * cre-workflow-simulation.ts — simula o workflow Chainlink CRE localmente.
 *
 * Produção: este script seria substituído pelo workflow CRE compilado em WASM
 * e deployado num DON. Para o hackathon, roda diretamente como script Node.
 *
 * O que faz:
 *   1. GET https://hackanation-chain-oil.vercel.app/api/oil-rate
 *   2. Lê OilOracleState on-chain
 *   3. Se preço mudou → chama update_price no programa chain_oil
 *   4. Registra em chainoil.oracle_updates + chainoil.workflow_logs
 *
 * Rodar: npx tsx scripts/cre-workflow-simulation.ts
 * Cron:  0 * /12 * * *  (a cada 12h, via cron na VPS ou Chainlink CRE)
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

const PROGRAM_ID    = new PublicKey('49NBUcWMprgym8gqFegGEVisvcEqHe5RgHmpzmKdaaDy')
const RPC           = 'https://api.devnet.solana.com'
const KEYPAIR_PATH  = `${os.homedir()}/.config/solana/id.json`
const OIL_RATE_API  = 'https://hackanation-chain-oil.vercel.app/api/oil-rate'

// Supabase — logs de execução (opcional, não bloqueia em caso de falha)
const SUPABASE_URL      = process.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_KEY      = process.env.VITE_SUPABASE_ANON_KEY ?? ''

function discriminator(name: string): Buffer {
  return createHash('sha256').update(`global:${name}`).digest().subarray(0, 8)
}

function i64LE(n: bigint): Buffer {
  const buf = Buffer.alloc(8)
  buf.writeBigInt64LE(n, 0)
  return buf
}

function u64LE(n: bigint): Buffer {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64LE(n, 0)
  return buf
}

async function readOracleState(conn: Connection, pda: PublicKey) {
  const acc = await conn.getAccountInfo(pda)
  if (!acc) return null
  const data = acc.data.subarray(8) // skip discriminator
  return {
    current_price: data.readBigUInt64LE(0),   // centavos
    last_update:   data.readBigInt64LE(8),    // unix timestamp
    update_count:  data.readBigUInt64LE(16),
  }
}

async function logToSupabase(table: string, row: Record<string, unknown>) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    })
  } catch { /* non-fatal */ }
}

async function main() {
  const conn = new Connection(RPC, 'confirmed')
  const authority = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf8'))),
  )

  // 1. Buscar preço da API ChainOil
  console.log('Fetching oil price from:', OIL_RATE_API)
  const apiRes  = await fetch(OIL_RATE_API)
  const apiData = await apiRes.json() as { rate_per_liter: number; updated_at: string }
  const newPriceCentavos = BigInt(Math.round(apiData.rate_per_liter * 100))
  const sourceTimestamp  = BigInt(Math.floor(new Date(apiData.updated_at).getTime() / 1000))
  console.log(`API: R$${apiData.rate_per_liter}/L → ${newPriceCentavos} centavos (ts=${sourceTimestamp})`)

  // 2. Ler estado on-chain
  const [oraclePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('oil_oracle')],
    PROGRAM_ID,
  )
  const onChain = await readOracleState(conn, oraclePda)
  if (!onChain) {
    console.error('❌ OilOracleState PDA não encontrado — rodar initialize-oracle.ts primeiro')
    process.exit(1)
  }
  console.log(`On-chain: ${onChain.current_price} centavos | update_count=${onChain.update_count}`)

  // 3. Verificar se mudou e se timestamp é mais recente
  if (newPriceCentavos === onChain.current_price) {
    console.log('✓ Preço sem alteração — skip')
    await logToSupabase('chainoil.workflow_logs', { event: 'no_change', detail: { price_centavos: Number(newPriceCentavos) } })
    return
  }
  if (sourceTimestamp <= onChain.last_update) {
    console.log('✓ Timestamp não mais recente — skip (anti-replay)')
    await logToSupabase('chainoil.workflow_logs', { event: 'skipped', detail: { reason: 'stale_timestamp' } })
    return
  }

  // 4. Chamar update_price on-chain
  // Borsh: discriminator (8) | new_price: u64 (8) | source_timestamp: i64 (8)
  const data = Buffer.concat([
    discriminator('update_price'),
    u64LE(newPriceCentavos),
    i64LE(sourceTimestamp),
  ])

  const tx = new Transaction()
  tx.add(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority.publicKey, isSigner: true,  isWritable: false },
      { pubkey: oraclePda,           isSigner: false, isWritable: true  },
    ],
    data,
  }))
  tx.feePayer        = authority.publicKey
  tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash
  tx.sign(authority)

  console.log(`\nAtualizando: ${onChain.current_price} → ${newPriceCentavos} centavos...`)
  const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: true })
  await conn.confirmTransaction(sig, 'confirmed')
  console.log('✓ update_price confirmado!')
  console.log('  TX:', `https://explorer.solana.com/tx/${sig}?cluster=devnet`)

  // 5. Registrar no Supabase
  await logToSupabase('chainoil.oracle_updates', {
    price_centavos: Number(newPriceCentavos),
    tx_sig: sig,
    price_changed: true,
    cre_run_id: `sim-${Date.now()}`,
  })
  await logToSupabase('chainoil.workflow_logs', {
    event: 'price_updated',
    detail: {
      old_price: Number(onChain.current_price),
      new_price: Number(newPriceCentavos),
      tx_sig: sig,
    },
  })
  console.log('✓ Logs registrados no Supabase')
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
