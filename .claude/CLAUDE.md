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

- **Rates:** R$ 1,20/litro · 20 pontos/litro · 1.000L água protegida/litro · 1,5kg CO₂ evitado/litro
- **Níveis:** Bronze (0–49L) · Prata (50–299L) · Ouro (300L+)
- **Fluxo:** Collect → Processing (4 passos) → Success → Dashboard
- **Auth:** operadores autenticam com telefone + PIN via Supabase Auth email/password
- **Coleta:** cidadão recebe PIX (mock) e tokens OIL mintados na carteira custodial
