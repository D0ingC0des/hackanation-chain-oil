# ChainOil — oil-drop-rewards

## Quick Context

Hackathon Solana — PWA mobile-first onde operadores (parceiros locais) registram coletas de óleo de cozinha usado e cidadãos recebem PIX instantâneo + tokens Solana (OIL).

Stack: **TanStack Start (SSR)** + TanStack Router (file-based) + React 19 + TypeScript + Tailwind v4 + shadcn/ui + Supabase + Cloudflare Pages.

## Arquitetura

```
src/
├── routes/          # THIN — só JSX orquestrador + useXxx hooks; zero lógica inline
│   ├── index.tsx    # Login
│   ├── collect.tsx  # Nova Coleta
│   ├── processing.tsx
│   ├── success.tsx
│   └── dashboard.tsx
├── components/
│   ├── pages/       # Componentes decompostos por página
│   │   ├── collect/      # CollectForm, LiterStepper, RewardPreview, PhotoCapture
│   │   ├── dashboard/    # LevelCard, MetricsGrid, BadgesGrid, Leaderboard
│   │   ├── processing/   # StepList, ProgressBar
│   │   └── success/      # SuccessCard, ImpactGrid, LevelBanner
│   └── ui/          # shadcn/ui — NÃO TOCAR
├── hooks/           # useAuthGuard, useCollection, useDashboard, useProcessing
├── services/        # collection-service.ts, dashboard-service.ts, pix-service.ts, wallet-service.ts
├── types/           # database.ts + tipos de domínio (Collection, Reward, Operator…)
├── lib/             # supabase.ts, auth.ts, utils.ts
└── assets/
supabase/migrations/ # SQL — rodar no SQL Editor do Supabase
scripts/             # test-supabase.mjs, seed-demo-user.mjs
.claude/skills/      # Skills de referência (Solana, Rust, React)
```

## Commands

```bash
npm run dev
node --env-file=.env.local scripts/test-supabase.mjs   # testa conexão Supabase
node --env-file=.env.local scripts/seed-demo-user.mjs  # recria usuário demo
```

**Credenciais demo:** telefone `(44) 98888-7777` · PIN `1234`

## Rules — Padrão DFL de Componentização (OBRIGATÓRIO)

### 1. Nomenclatura de arquivos

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Componente React | `kebab-case.tsx` | `liter-stepper.tsx` |
| Hook | `use-kebab-case.ts` | `use-collection.ts` |
| Constante | `kebab-case.ts` dentro de `consts/` | `consts/reward-rates.ts` |
| Util (função pura) | `kebab-case.ts` dentro de `utils/` | `utils/format-phone.ts` |
| Tipo/interface | `kebab-case.ts` dentro de `types/` | `types/collection.ts` |
| Service | `kebab-case.ts` dentro de `services/` | `services/collection-service.ts` |

**Regra:** nunca PascalCase em nome de arquivo. Sempre kebab-case.

### 2. Um arquivo, uma coisa

Cada arquivo contém **exatamente uma** das seguintes:
- Um componente React exportado
- Uma função util exportada
- Um bloco de constantes relacionadas
- Um hook
- Um service (conjunto de funções de acesso a dados para uma entidade)

**Proibido:** dois componentes no mesmo arquivo, função util dentro de componente, constante inline que vai ser reutilizada.

### 3. Routes são thin (máx. ~40 linhas de JSX)

Routes apenas orquestram: importam hooks e componentes, compõem JSX. **Zero lógica inline.**

```tsx
// ✅ Correto
function CollectPage() {
  useAuthGuard();
  const form = useCollection();
  return <MobileShell><CollectForm {...form} /></MobileShell>;
}

// ❌ Errado — lógica de negócio na route
function CollectPage() {
  const [liters, setLiters] = useState(2);
  const reward = (liters * 1.2).toFixed(2); // isso vai para um hook
  // ... 80 linhas de handlers
}
```

### 4. Regra do hook (>40 linhas de lógica)

Se um componente tem **mais de ~40 linhas de lógica** (estado, efeitos, handlers, derivações), extrair para um hook.

```tsx
// ✅ Correto
function CollectForm() {
  const { liters, phone, reward, onSubmit } = useCollectForm();
  return <form onSubmit={onSubmit}>...</form>;
}
```

### 5. Services — nunca Supabase direto nas routes/components

```ts
// ❌ Errado
import { supabase } from "@/lib/supabase";
const { data } = await supabase.from("collections").select();

// ✅ Correto
import { getCollections } from "@/services/collection-service";
const collections = await getCollections();
```

Services ficam em `src/services/`. Hooks chamam services. Routes chamam hooks.

### 6. Constantes — Record, não switch

```ts
// ❌ Não fazer
function levelLabel(level: number): string {
  switch (level) {
    case 1: return "Bronze";
    case 2: return "Prata";
    default: return "Ouro";
  }
}

// ✅ Fazer — em consts/levels.ts
export const LEVEL_LABEL: Record<number, string> = {
  1: "Bronze",
  2: "Prata",
  3: "Ouro",
};
```

### 7. Tipos e interfaces — sempre em types/

Nenhuma interface ou type complexo inline em componentes. Vai para `src/types/`.

```ts
// types/collection.ts
export interface CollectionDraft {
  citizenPhone: string;
  liters: number;
  photoUrl?: string;
}
```

### 8. Sem mock hardcoded em componentes de produção

```tsx
// ❌ Remover imediatamente
const LEADERBOARD = [{ name: "Mercado da Dona Lu", liters: 312 }];

// ✅ Dados vêm de hook → service → Supabase
const { leaderboard } = useDashboard();
```

### 9. Sem `as const` em arrays usados em useState

```ts
// ❌ Quebra inferência de tipo do useState
const STEPS = ["a", "b", "c"] as const;
const [step, setStep] = useState(STEPS[0]); // tipo: "a" literal

// ✅ Sem as const
const STEPS = ["a", "b", "c"];
```

### 10. Checklist antes de push

```bash
npx tsc --noEmit
npx eslint --fix src/
```

Ambos têm que passar com exit code 0.

---

## Skills disponíveis

Leia os arquivos antes de escrever código Solana ou Rust:

```
.claude/skills/solana-development/SKILL.md   # Anchor, PDA, CPI, tokens, deploy
.claude/skills/solana-security/SKILL.md      # auditoria pré-deploy
.claude/skills/solana-compression/SKILL.md   # ZK Compression (Light Protocol)
.claude/skills/rusty/SKILL.md               # Rust quality guidelines
.claude/skills/react-web3-developer/SKILL.md # React patterns (adaptar para Solana)
```

Skills Chainlink (em `E:\_projetos\fellowship\hackaton\SKILLS\chainlink-agent-skills-main\`):

```
chainlink-data-feeds-skill/SKILL.md   # price feeds Solana (OCR2, devnet+mainnet) — USAR
chainlink-ccip-skill/SKILL.md         # cross-chain com suporte non-EVM/Solana
chainlink-cre-skill/SKILL.md          # EVM-only — NÃO usar para Solana
chainlink-vrf-skill/SKILL.md          # EVM-only — não relevante
chainlink-ace-skill/SKILL.md          # EVM-only — não relevante
```

---

## Decisões de integração Chainlink

### CRE — descartado para ChainOil

**Decisão:** CRE não será utilizado no projeto.

**Motivo:** ChainOil é Solana-nativo (programa Anchor + token SPL + PIX off-chain). CRE orquestra EVM via DON — usá-lo exigiria bridge EVM↔Solana (CCIP), adicionando complexidade sem benefício para o hackathon.

### Chainlink Data Feeds — disponível se necessário

**Decisão:** Data Feeds está disponível para consulta de preço SOL/USD caso a regra de recompensa precise de conversão estável.

**Quando usar:** se o rate de R$ 1,20/litro precisar ser calculado a partir de um preço de mercado dinâmico em vez de constante fixa.

**Como integrar (Solana on-chain):**
```toml
# Cargo.toml
chainlink_solana = "2.0.8"
anchor-lang = "0.31.1"
```
- Program ID OCR2 (Devnet + Mainnet): `HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny`
- Ler via `chainlink_solana::v2::read_feed_v2` (não CPI — deprecated)

**Como integrar (off-chain TypeScript):**
```bash
npm install @chainlink/solana-sdk @coral-xyz/anchor
# atenção: @project-serum/anchor está deprecated
```

### Chainlink Functions — não usar

**Decisão:** Chainlink Functions encerra em **1 set 2026** (testnet: 2 jun 2026). Não iniciar nenhum desenvolvimento nele. Se automação EVM for necessária no futuro, usar CRE.

---

## Sessão 2025-05-25 — o que foi feito e aprendido

### Melhorias visuais

- **BlurredHeroBg:** `blur(28px)` → `blur(8px)`, overlay `bg-background/70` → `bg-background/28`, `scale-110` → `scale-105`. Fundo da imagem agora aparece com mais textura sem comprometer legibilidade dos cards.
- **Subtítulo collect:** `text-muted-foreground` → `text-foreground/80` — cor mais escura que mantém contraste contra fundo claro.

### Captura de foto — componente adaptativo

- Criado `src/components/pages/collect/photo-capture.tsx`.
- **Mobile** (`useIsMobile() = true`): `<input type="file" capture="environment">` — abre câmera nativa diretamente; sem dependência extra.
- **Desktop**: modal com `react-webcam` (preview ao vivo + botão "Capturar"). Usa `navigator.mediaDevices` via webcam.
- Instalado `react-webcam@7.2.0`.
- Bloco inline de 29 linhas em `collect.tsx` substituído por `<PhotoCapture photo={photo} onPhoto={setPhoto} />`.

### Limpeza de arquivos órfãos (ui/)

- 17 arquivos em `src/components/ui/` referenciavam pacotes removidos na sessão anterior.
- Removidos: accordion, aspect-ratio, calendar, carousel, chart, collapsible, command, context-menu, drawer, hover-card, menubar, navigation-menu, resizable, scroll-area, slider, toggle, toggle-group.
- `npx tsc --noEmit` passou limpo após remoção.

### Bug: CTA mobile invisível / sobreposição

- **Causa:** botão sticky `z-30 bottom-0` coberto pelo BottomNav `z-40 bottom-0`; ao mover para `bottom-24`, ainda sobrepunha o card de recompensa inline em telas curtas.
- **Fix final:** CTA sticky removido. Botão colocado **inline** abaixo do card de recompensa mobile. Fluxo: `Celular → Litros → Foto → Recompensa → Confirmar`.
- **Gotcha:** sticky CTA só funciona sem sobreposição quando o conteúdo é longo o suficiente para scrollar além dele. Para forms curtos, inline é sempre mais seguro.

### BottomNav — ícone semântico

- Ícone central trocado de `Plus` → `Droplet` (lucide-react) com label "Coletar".
- Motivo: `Plus` é genérico; `Droplet` comunica diretamente a ação de coleta de óleo.

---

## Contratos de domínio

- **Rates:** R$ 1,20/litro · 1.000L água protegida/litro · 1,5kg CO₂ evitado/litro
- **Fluxo:** Collect → Processing (4 passos) → Success → Dashboard
- **Auth:** wallet Solana (Phantom/Backpack) — connect se existir, guia de criação se não tiver
- **Coleta:** cidadão recebe PIX (mock) e tokens OIL mintados na carteira
- **Chainlink:** conversa on-chain ↔ off-chain, tem acesso ao contrato — integrar em seguida

---

## Sessão 2026-05-26 — o que foi feito

### Remoção de pontuação e conquistas

- Removidos de `dashboard.tsx`: Level hero (nível Prata + progress bar), card "pontos de impacto", seção Conquistas/badges, Ranking da comunidade (mobile + desktop). Imports limpos (`Award/Flame/Medal/Trophy`). `MetricCard` agora tem 3 cards: água, CO₂, PIX.
- Removidos de `success.tsx`: card "pontos de impacto", banner de progresso de nível (gradient-impact). Grid ajustado de 4 → 3 colunas.
- Removidos de `collect.tsx`: `POINTS`, cálculo `points`, exibição "+{points} pts" (mobile e desktop). Mantido: litros de água protegida.

### Auth migrada para Solana Wallet Adapter

- Instalados: `@solana/wallet-adapter-base`, `@solana/wallet-adapter-react`, `@solana/wallet-adapter-wallets`.
- Criado `src/lib/wallet-provider.tsx` — `ConnectionProvider` + `WalletProvider` (devnet, Wallet Standard, `wallets={[]}`).
- `src/routes/__root.tsx` envolto em `SolanaWalletProvider`.
- `src/hooks/useAuthGuard.ts` reescrito: usa `useWallet().connected/connecting` em vez de Supabase.
- `src/routes/index.tsx` reescrito: detecta carteiras instaladas (`readyState === "Installed"`); se nenhuma → guia de instalação com links para Phantom e Backpack.
- `src/lib/auth.ts` simplificado: mantém só `AuthSession { publicKey, name }`.
- `TopNav`/`BottomNav`: `Trophy` → `BarChart2`; logout usa `wallet.disconnect()`.
- **Gotcha hydration (SSR):** `useWallet()` detecta carteiras via `window.solana` — inexistente no servidor. Fix: `const [mounted, setMounted] = useState(false)` + `useEffect(() => setMounted(true), [])`. `installedWallets` só calculado após `mounted`.

### Onboarding de perfil (wallet_profiles)

- Criada migration `002_wallet_profiles.sql`: tabela `wallet_profiles` com `public_key` como identificador (fora do Supabase Auth).
- **Gotcha RLS:** tabelas criadas via SQL não recebem `GRANT` automático para `anon`. Solução: `grant select, insert, update on public.wallet_profiles to anon, authenticated`. Políticas sem restrição de role (`to anon`) falham se o client enviar JWT `authenticated` (sessão antiga em localStorage).
- Criado `src/services/profileService.ts` — `getProfile(publicKey)` + `createProfile(input)`. Usa `(supabase as any).from(...)` porque `wallet_profiles` não está no tipo `Database`.
- Criado `src/routes/onboarding.tsx`: form com nome, email, celular (máscara), estabelecimento, CNPJ (opcional), CEP → ViaCEP auto-preenche rua/bairro/cidade/estado.
- Fluxo: connect → `getProfile` → se tem perfil: `/collect`, se não: `/onboarding` → salva → `/collect`.

### Página de perfil

- Criado `src/routes/profile.tsx`: exibe dados da carteira (ícone do adapter, nome, endereço completo selecionável, saldo SOL via `connection.getBalance()`, rede Devnet) e dados do perfil Supabase.
- Saldo em SOL com 4 casas decimais via `LAMPORTS_PER_SOL`.
- Botão de copiar endereço com feedback visual (ícone `CheckCheck`).
- `BottomNav`: item "Coleta" (Home) → "Perfil" (User) — o botão primário já cobre coleta.
- `TopNav`: adicionado link "Perfil" ao lado de "Meu impacto".

---

## Sessão 2026-05-26 (cont.) — Admin, Taxas, Coletas, PIX Woovi, Anchor + Chainlink

### Página de Admin (`/admin`)

- Criado `src/routes/admin.tsx` — oculta do menu; acesso direto por URL.
- Auth por PIN via `VITE_ADMIN_PIN` (env var). Não usa carteira — funciona em qualquer browser.
- Estado de sessão salvo em `sessionStorage` com chave `"chainoil_admin_auth"`.
- Se `VITE_ADMIN_PIN` não estiver configurado → exibe `Blocked` (mensagem de ambiente não configurado).
- Admin pode alterar o valor R$/litro — salvo na tabela `oil_config`.

### Taxa dinâmica de R$/litro

- Criada migration `003_oil_config.sql`: tabela key-value `oil_config`; seed inicial `rate_per_liter = '1.20'`.
- Criado `src/services/rates-service.ts`: `getRatePerLiter()`, `getRateConfig()`, `updateRatePerLiter()`.
- Criado `src/hooks/use-rate.ts`: wraper React com fallback `1.2` (evita flash de "—").
- `collect.tsx` e `success.tsx`: removido `const RATE = 1.2` hardcoded; passaram a usar `useRate()`.

### Endpoint público da taxa (`GET /api/oil-rate`)

- Criado `src/routes/api/oil-rate.ts` usando padrão `createFileRoute` com `server.handlers.GET`.
- **Gotcha TanStack Start:** não existe `createAPIFileRoute` em `@tanstack/react-start@1.167.50`. O padrão correto é `createFileRoute` com a opção `server: { handlers: { GET: async () => ... } }` — documentado em `.claude/skills/start-client-core/server-routes/SKILL.md`.
- Retorna JSON: `{ rate_per_liter, currency, unit, updated_at }`. CORS aberto para contratos.

### Tabela `oil_collections` (wallet-based)

- Criada migration `004_oil_collections.sql`: tabela com `operator_key text` (carteira) em vez de FK para `auth.users`.
- A tabela `collections` da migration 001 usa FK para `profiles → auth.users` — incompatível com wallet auth. Não usar.
- Criado `src/services/collection-service.ts`: `saveCollection()`, `getMyStats()`, `getGlobalStats()`.

### Dashboard com dados reais

- Criado `src/hooks/use-dashboard.ts`: busca `getMyStats(publicKey)` — dados por estabelecimento (wallet).
- CO₂ e água calculados por estabelecimento; global adiado para painel de admin futuro.
- `dashboard.tsx` reescrito: usa `useDashboard()`, `Intl.NumberFormat('pt-BR')`, `MetricCard` com `Loader2` enquanto carrega.
- `processing.tsx`: salva coleta no mount via `useRef(false)` guard (previne duplo disparo no StrictMode).

### PIX via Woovi (Edge Function)

- Criada migration `005_pix_fields.sql`: adiciona `pix_id`, `pix_status`, `pix_paid_at` a `oil_collections`.
- Criado `supabase/functions/process-collection/index.ts`: busca taxa → salva coleta → chama Woovi → atualiza status.
  - Endpoint Woovi usado: `POST /api/v1/transfer`. **Verificar** se é o correto para cash-out na documentação da conta criada.
  - Auth Woovi: header `Authorization: <WOOVI_APP_ID>`.
  - Valor enviado em centavos (`rewardBrl * 100`).
  - `pix_status`: `pending` → `processing` (Woovi aceitou) | `failed` (erro).
- `collection-service.ts`: adicionado `processCollection()` que invoca a edge function via `supabase.functions.invoke`.
- `processing.tsx`: simplificado — chama só `processCollection()`. A edge function gerencia taxa + save + PIX.

### Programa Anchor + Chainlink SOL/USD

- Criado workspace Anchor em `anchor/` (fora de `oil-drop-rewards/`).
- `anchor/programs/chain-oil/`: instrução `register_collection` que:
  1. Valida owner do feed Chainlink (`HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny`).
  2. Lê SOL/USD via `chainlink_solana::v2::read_feed_v2` (SDK v2 — não CPI deprecated).
  3. Valida freshness ≤ 3.600s.
  4. Grava PDA `Collection` com litros, recompensa em centavos, preço atestado, UUID Supabase.
  5. Incrementa contador `OperatorState` PDA.
- Feed SOL/USD Devnet: `HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKegfthMvWdo` — **verificar se ainda ativo** em https://docs.chain.link/data-feeds/price-feeds/addresses?network=solana.
- Criado `src/services/anchor-service.ts`: client TypeScript para chamar o programa do frontend após coleta confirmada.
- Criado `anchor/tests/chain-oil.ts`: teste de integração devnet.

---

## Sessão 2026-05-26 (cont.) — Upload de foto da coleta

### Fluxo implementado

A foto capturada em `collect.tsx` agora é persistida no Supabase Storage e vinculada à coleta.

**Caminho no bucket:** `collection-photos/{operatorKey}/{collectionId}.jpg`
- Bucket `collection-photos` criado na migration 001 (público, RLS com insert para authenticated e select público).
- `operator_key` (chave pública Solana do coletador) define a pasta — funciona como "id do estabelecimento".
- `collectionId` (UUID Supabase) é o nome do arquivo.

### Mudanças por arquivo

| Arquivo | O que mudou |
|---------|-------------|
| `photo-capture.tsx` | Mobile: trocado `URL.createObjectURL(file)` por `FileReader.readAsDataURL(file)` — foto agora é sempre base64 dataUrl (não objeto URL volátil) |
| `collect.tsx` | `handleConfirm()` salva a foto em `sessionStorage.setItem("chainoil_pending_photo", photo)` antes de navegar; remove a chave se não há foto |
| `collection-service.ts` | Adicionados: helper `dataUrlToBlob()` + função `uploadCollectionPhoto(collectionId, operatorKey, dataUrl)` — faz upload para Storage, obtém URL pública, atualiza `oil_collections.photo_url` |
| `processing.tsx` | Após `processCollection()` resolver: lê foto do sessionStorage, limpa a chave, chama `uploadCollectionPhoto()` (fire-and-forget — não bloqueia tela de sucesso) |

### Gotchas

- **Object URL vs. base64:** `URL.createObjectURL()` no mobile gerava uma URL `blob://` que não sobrevive à navegação client-side no sentido de não ser serializável. `FileReader.readAsDataURL()` produz base64 puro, sempre passível de ser salvo em sessionStorage.
- **sessionStorage como ponte:** foto não vai nos search params da URL (base64 pode chegar a 100 KB). sessionStorage é limpo após uso para evitar lixo entre sessões.
- **Coluna `photo_url` já existia:** migration 004 já tinha `photo_url text` — não foi necessária nova migration.

---

## O que está faltando (pendências obrigatórias)

### Para o PIX funcionar

| # | Tarefa | Comando / Ação |
|---|--------|----------------|
| 1 | Rodar migrations 003, 004, 005 | Colar SQL no Supabase SQL Editor |
| 2 | Criar conta Woovi + obter App ID sandbox | https://woovi.com |
| 3 | Configurar secret da edge function | `supabase secrets set WOOVI_APP_ID=<token>` |
| 4 | **Verificar endpoint Woovi cash-out** | No painel da conta: confirmar se é `/transfer` ou outro. Ajustar 1 linha em `supabase/functions/process-collection/index.ts` |
| 5 | Adicionar `VITE_ADMIN_PIN` ao `.env.local` | `VITE_ADMIN_PIN=sua_senha_aqui` |
| 6 | Deploy da edge function | `supabase functions deploy process-collection` |

### Para o Anchor + Chainlink funcionar

| # | Tarefa | Comando |
|---|--------|---------|
| 7 | Instalar Anchor CLI | `avm install 0.31.1 && avm use 0.31.1` |
| 8 | Build do programa | `cd anchor && anchor build` |
| 9 | Substituir Program ID placeholder | Copiar ID gerado em `lib.rs`, `Anchor.toml`, `src/services/anchor-service.ts` (substituir `CHAiNoiLXXX...`) |
| 10 | Deploy no devnet | `anchor deploy --provider.cluster devnet` |
| 11 | Rodar teste de integração | `anchor test` (valida leitura Chainlink real) |
| 12 | Integrar `registerCollectionOnChain` no `processing.tsx` | Chamar após `processCollection()` resolver; passar `collectionId` retornado como `supabaseId` |

### Pendências de produto (fase 2)

- **`tx_hash` na coleta:** popular `oil_collections.tx_hash` com a assinatura Solana após confirmação da tx Anchor.
- **Webhook Woovi:** receber confirmação de `pix_status → paid` e atualizar `pix_paid_at`. Criar endpoint ou Supabase Edge Function `woovi-webhook`.
- **Dashboard global de admin:** totais de CO₂ e água de todos os operadores (usa `getGlobalStats()` já implementado no service).
- **OIL Token SPL:** mint do token para o operador após coleta confirmada (não iniciado).
- **Verificar endereço do feed SOL/USD Devnet:** `HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKegfthMvWdo` — confirmar se ainda está ativo na documentação Chainlink antes do deploy.
