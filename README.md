# ChainOil — Recycle Oil. Get Paid. On-Chain.

> **Solana Hackathon 2026** · Mobile-first PWA for collecting used cooking oil and delivering instant cash + on-chain rewards.

---

## The Problem

Brazil generates over **1.5 billion liters** of used cooking oil every year. Most of it goes down the drain — contaminating rivers, blocking sewers, and wasting a resource that could power communities. Meanwhile, local small businesses (restaurants, bakeries, grocery stores) have no structured incentive to collect and dispose of it properly.

---

## The Solution

**ChainOil** connects three layers:

| Layer | Who | What they do |
|-------|-----|-------------|
| Citizens | Households, restaurants, bakeries | Drop off used cooking oil at partner points |
| Operators | Local partners (registered collectors) | Register collections via mobile PWA |
| Chain | Solana devnet → mainnet | Mint **OIL tokens** + record impact immutably |

Every collection triggers:
1. **Instant PIX payment** — R$ 1.20 per liter, no waiting
2. **OIL token mint** — 20 tokens per liter to the citizen's custodial wallet
3. **On-chain registration** — Anchor instruction `register_collection` with operator PDA
4. **ESG impact log** — 1,000 L of water protected + 1.5 kg CO₂ avoided per liter

---

## Flow

```
Login (phone + PIN)
  └─▶ Collect (citizen phone, liters, photo)
        └─▶ Processing (4 animated steps)
              ├── Calculate reward
              ├── Validate collection
              ├── Register on Solana
              └── Send PIX
                    └─▶ Success (reward summary)
                          └─▶ Dashboard (level, history, leaderboard)
```

---

## Reward Tiers

| Level | Liters collected | Perks |
|-------|-----------------|-------|
| 🥉 Bronze | 0 – 49 L | Base rate |
| 🥈 Prata | 50 – 299 L | +5% OIL bonus |
| 🥇 Ouro | 300 L+ | Priority PIX + NFT badge |

---

## Tech Stack

### Frontend

| Layer | Choice |
|-------|--------|
| Framework | [TanStack Start](https://tanstack.com/start) (SSR) + [TanStack Router](https://tanstack.com/router) (file-based) |
| UI | React 19 + TypeScript + [Tailwind v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) |
| Data | [TanStack Query](https://tanstack.com/query) v5 |
| Deploy | Cloudflare Pages (via Wrangler) |

### Backend

| Layer | Choice |
|-------|--------|
| Auth | Supabase Auth (phone→email derivation) |
| Database | Supabase PostgreSQL 15 with RLS |
| Storage | Supabase Storage (collection photos) |
| Real-time | Supabase Realtime (leaderboard) |

### Blockchain

| Layer | Choice |
|-------|--------|
| Network | Solana Devnet → Mainnet |
| Smart contract | [Anchor](https://anchor-lang.com) framework |
| Token | OIL — SPL Token (fungible) |
| Compression | [ZK Compression](https://www.zkcompression.com) via Light Protocol (scale-ready) |
| Wallets | Custodial — keypairs generated server-side, encrypted at rest |

---

## Architecture

```
src/
├── routes/          # Thin orchestrators only (~40 lines max)
│   ├── index.tsx    # Login
│   ├── collect.tsx  # Nova Coleta
│   ├── processing.tsx
│   ├── success.tsx
│   └── dashboard.tsx
├── components/
│   ├── pages/       # Decomposed by feature
│   │   ├── collect/      # CollectForm, LiterStepper, RewardPreview, PhotoCapture
│   │   ├── dashboard/    # LevelCard, MetricsGrid, BadgesGrid, Leaderboard
│   │   ├── processing/   # StepList, ProgressBar
│   │   └── success/      # SuccessCard, ImpactGrid, LevelBanner
│   └── ui/          # shadcn/ui — do not edit
├── hooks/           # useAuthGuard, useCollection, useDashboard, useProcessing
├── services/        # collection-service, dashboard-service, pix-service, wallet-service, solana-service
├── types/           # database.ts + domain types (Collection, Reward, Operator…)
├── lib/             # supabase.ts, auth.ts, utils.ts
└── assets/
supabase/
├── migrations/      # 001_chainoil_schema.sql — run in Supabase SQL Editor
scripts/
├── test-supabase.mjs   # Connection + schema smoke test
└── seed-demo-user.mjs  # Creates demo operator for testing
programs/            # Anchor smart contract (register_collection)
```

---

## Local Setup

### Prerequisites

- Node.js 22+
- A Supabase project ([create free at supabase.com](https://supabase.com))
- Solana CLI + Anchor CLI (for smart contract work)

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # server only, never exposed to client
```

### 3. Apply database migration

Open the Supabase SQL Editor and run `supabase/migrations/001_chainoil_schema.sql`.

### 4. Seed demo operator

```bash
node --env-file=.env.local scripts/seed-demo-user.mjs
```

### 5. Run

```bash
npm run dev
```

### 6. Test connection

```bash
node --env-file=.env.local scripts/test-supabase.mjs
```

---

## Demo Credentials

| Field | Value |
|-------|-------|
| Phone | `(44) 98888-7777` |
| PIN | `1234` |

> These credentials are for development/demo only and map to a seeded test operator.

---

## Database Schema

12 tables covering the full domain:

`profiles` → `operators` → `collection_points` → `collections` → `rewards` → `transactions`

`wallets` (custodial Solana keypairs, encrypted)

`rankings` · `badges` · `user_badges` · `esg_metrics` · `audit_logs`

Full schema with enums, RLS policies, triggers, and storage buckets in `supabase/migrations/001_chainoil_schema.sql`.

---

## Smart Contract (Anchor)

```
programs/chainoil/
├── src/lib.rs
├── instructions/
│   └── register_collection.rs   # PDA: [operator_pubkey, collection_id]
└── Anchor.toml
```

**Instruction:** `register_collection(collection_id, liters, citizen_pubkey)` — writes an on-chain record linking operator PDA → collection → citizen wallet.

**Deploy:**

```bash
anchor build
anchor deploy --provider.cluster devnet
```

---

## OIL Token

- **Standard:** SPL Token (fungible)
- **Symbol:** OIL
- **Decimals:** 6
- **Minting authority:** program PDA (no centralized mint key)
- **Rate:** 20 OIL per liter collected

---

## ESG Impact

Each liter of cooking oil collected prevents:

| Metric | Value |
|--------|-------|
| Water contaminated | 1,000 L protected |
| CO₂ equivalent | 1.5 kg avoided |
| PIX paid | R$ 1.20 |
| OIL minted | 20 tokens |

All impact data is aggregated on-chain and queryable from the `esg_metrics` table.

---

## Roadmap

- [x] Frontend PWA (mobile-first, React 19)
- [x] Supabase schema + RLS + Auth
- [x] Phone + PIN login
- [ ] Collection registration → Supabase
- [ ] Anchor program `register_collection` on devnet
- [ ] OIL SPL Token + custodial wallet minting
- [ ] PIX integration (mock → Pix API)
- [ ] Real leaderboard from DB
- [ ] ZK Compression for scale (Light Protocol)
- [ ] Mainnet deploy

---

## License

MIT — see [LICENSE](./LICENSE).

---

Built with love, oil, and a lot of Solana blocks. 🫙⛓️
