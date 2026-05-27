# ChainOil — Recycle Oil. Get Paid. On-Chain.

> **Solana Hackathon 2026** · Mobile-first PWA for collecting used cooking oil and delivering instant PIX + on-chain COT tokens.

---

## The Problem

Brazil generates over **1.5 billion liters** of used cooking oil every year. Most of it goes down the drain — contaminating rivers, blocking sewers, and wasting a resource that could power communities. Local collectors have no structured incentive to collect and dispose of it properly.

---

## The Solution

**ChainOil** connects three layers:

| Layer | Who | What |
|-------|-----|------|
| Citizens | Households, restaurants, bakeries | Deliver used cooking oil to partner operators |
| Operators | Registered collectors | Register collections via mobile PWA, receive PIX instantly |
| Chain | Solana devnet | On-chain `register_collection` + COT token minted per liter |

Every collection triggers:
1. **Instant PIX payment** — to the citizen's phone number (via Woovi), rate from `oil_config`
2. **COT token mint** — 1 COT per liter to the operator's wallet (Token-2022, decimals 0)
3. **On-chain registration** — Anchor instruction with Chainlink SOL/USD price attested at the moment of collection
4. **ESG impact log** — 1,000 L water protected + 1.5 kg CO₂ avoided per liter, recorded immutably

> **Operator option:** pay the citizen out-of-pocket and retain the COT token as an ESG asset.

---

## Flow

```
Login (Phantom wallet)
  └─▶ Collect (citizen phone, liters, optional photo)
        └─▶ Processing
              ├── [1] Calculate reward
              ├── [2] Validate collection
              ├── [3] Register on Solana (Anchor + Chainlink)
              └── [4] Send PIX via Woovi
                    └─▶ Success
                          └─▶ Dashboard (total liters, total PIX paid, impact)
```

---

## Tech Stack

### Frontend

| Layer | Choice |
|-------|--------|
| Framework | [TanStack Router](https://tanstack.com/router) (file-based routing) |
| UI | React 19 + TypeScript + Tailwind v4 + shadcn/ui |
| Auth | Solana Wallet Adapter — Phantom (non-custodial) |
| Deploy | Cloudflare Pages (via Wrangler) |

### Backend

| Layer | Choice |
|-------|--------|
| Database | Supabase PostgreSQL with RLS |
| Storage | Supabase Storage (collection photos) |
| Functions | Supabase Edge Functions (Deno) |
| PIX | [Woovi](https://woovi.com) cash-out API |

### Blockchain

| Layer | Choice |
|-------|--------|
| Network | Solana Devnet |
| Smart contract | [Anchor](https://anchor-lang.com) 0.31.1 (Rust) |
| Token | **COT** (ChainOil Token) — Token-2022, decimals 0, 1L = 1 COT |
| Oracle | [Chainlink](https://chain.link) SOL/USD Data Feed (on-chain read at collection time) |

---

## Architecture

```
oil-drop-rewards/
├── src/
│   ├── routes/          # index (login), collect, processing, success, dashboard, profile
│   ├── components/
│   │   ├── pages/       # collect/, dashboard/, processing/
│   │   └── ui/          # shadcn/ui — do not edit
│   ├── services/        # anchor-service, collection-service, rates-service, profileService
│   ├── hooks/           # useAuthGuard, useRate
│   └── lib/             # supabase.ts, wallet-provider.tsx
├── supabase/
│   ├── migrations/      # 001–005 (schema, wallet_profiles, oil_config, oil_collections, pix_fields)
│   └── functions/
│       └── process-collection/   # edge fn: save collection + PIX via Woovi
└── anchor/              # Anchor program (Rust)
    ├── Anchor.toml
    ├── programs/chain-oil/src/
    │   ├── lib.rs
    │   ├── state.rs           # Collection PDA + OperatorState PDA
    │   ├── errors.rs
    │   └── instructions/register_collection.rs
    └── tests/chain-oil.ts
```

---

## Local Setup

### Prerequisites

- Node.js 22+
- A Supabase project ([create free](https://supabase.com))
- [Phantom wallet](https://phantom.app) browser extension
- Rust + Solana CLI + Anchor 0.31.1 (for smart contract work — optional for frontend-only dev)

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create `.env.local`:

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_ADMIN_PIN=<admin-pin>
```

### 3. Apply database migrations

Run in Supabase SQL Editor (in order):

```
supabase/migrations/001_chainoil_schema.sql
supabase/migrations/002_wallet_profiles.sql
supabase/migrations/003_oil_config.sql
supabase/migrations/004_oil_collections.sql
supabase/migrations/005_pix_fields.sql
```

### 4. Run

```bash
npm run dev
```

### 5. Test connection

```bash
node --env-file=.env.local scripts/test-supabase.mjs
```

---

## Smart Contract (Anchor)

**Program:** `chain_oil` — deploys to Solana devnet.

**Instruction:** `register_collection(params)`

- Reads Chainlink SOL/USD price on-chain at collection time
- Creates `Collection` PDA: `[b"collection", operator.key, seq]`
- Creates/updates `OperatorState` PDA: `[b"operator_state", operator.key]`
- Stores `sol_usd_price` (Chainlink), `liters_ml`, `reward_centavos`, `supabase_id` (UUID for cross-reference)

**Chainlink feed (devnet):**

```
SOL/USD feed:       HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKegfthMvWdo
Chainlink program:  HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny
```

**Build & deploy:**

```bash
cd anchor
anchor build
anchor deploy --provider.cluster devnet
# After deploy: replace CHAiNoiLXXX... in Anchor.toml, lib.rs, and src/services/anchor-service.ts
```

**Local testing (clones Chainlink accounts from devnet):**

```bash
solana-test-validator \
  --clone HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKegfthMvWdo \
  --clone HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny \
  --url devnet --reset

# In another terminal:
anchor test --skip-local-validator
```

---

## COT Token

- **Name:** ChainOil Token
- **Symbol:** COT
- **Standard:** Token-2022
- **Decimals:** 0
- **Rate:** 1 COT per liter collected
- **Mint authority:** transferred to Anchor program PDA after deploy

```bash
spl-token create-token \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --decimals 0 --enable-metadata
spl-token initialize-metadata <MINT_PUBKEY> "ChainOil Token" "COT" ""
spl-token authorize <MINT_PUBKEY> mint <PROGRAM_ID>
```

---

## ESG Impact

| Metric | Per liter |
|--------|-----------|
| Water protected | 1,000 L |
| CO₂ avoided | 1.5 kg |
| PIX paid | dynamic (default R$ 1.20) |
| COT minted | 1 token |

---

## Supabase Secrets (Edge Functions)

| Key | Description |
|-----|-------------|
| `WOOVI_APP_ID` | Woovi API token for PIX cash-out |
| `TREASURY_KEYPAIR` | Solana keypair (JSON array) for devnet treasury |

---

## Roadmap

- [x] Frontend PWA (mobile-first, React 19, Phantom auth)
- [x] Supabase schema (001–005) + edge function `process-collection`
- [x] Anchor program `register_collection` with Chainlink SOL/USD read
- [ ] `anchor build` + deploy to devnet (pending toolchain on VPS)
- [ ] COT Token-2022 creation + mint authority transfer
- [ ] Woovi account + `WOOVI_APP_ID` secret
- [ ] Smoke test: 2L collection → Collection PDA on explorer + COT balance

---

## License

MIT — see [LICENSE](./LICENSE).
