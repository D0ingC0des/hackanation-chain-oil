import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import {
  Award,
  ChevronLeft,
  Droplets,
  Flame,
  Leaf,
  Medal,
  Plus,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { BlurredHeroBg } from "@/components/BlurredHeroBg";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Meu impacto — ChainOil" },
      {
        name: "description",
        content:
          "Acompanhe seu nível, ranking da comunidade e o impacto ambiental das suas coletas.",
      },
    ],
  }),
});

const LEADERBOARD = [
  { name: "Mercado da Dona Lu", liters: 312, you: false },
  { name: "Padaria Pão Quente", liters: 287, you: false },
  { name: "Você", liters: 248, you: true },
  { name: "Igreja São José", liters: 196, you: false },
  { name: "Escola Vila Verde", liters: 154, you: false },
];

const BADGES = [
  { icon: Leaf, label: "Eco Iniciante", earned: true, color: "bg-emerald/20 text-emerald" },
  { icon: Droplets, label: "Guardião da Água", earned: true, color: "bg-water/20 text-water" },
  {
    icon: Flame,
    label: "Sequência 7 dias",
    earned: true,
    color: "bg-reward/30 text-reward-foreground",
  },
  {
    icon: Award,
    label: "100L Coletados",
    earned: false,
    color: "bg-secondary text-muted-foreground",
  },
];

function DashboardPage() {
  useAuthGuard();
  return (
    <div className="relative">
      <BlurredHeroBg />

      <MobileShell transparentBg>
        {/* ── Mobile header ── */}
        <header className="lg:hidden px-5 pt-6 pb-4 flex items-center justify-between bg-gradient-hero">
          <Link
            to="/collect"
            className="size-10 rounded-full bg-card border border-border flex items-center justify-center shadow-soft"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <h1 className="text-base font-semibold">Meu impacto</h1>
          <div className="size-10" />
        </header>

        {/* ── Desktop header ── */}
        <div className="hidden lg:flex lg:items-center lg:justify-between px-8 pt-8 pb-2">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Meu impacto</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Acompanhe suas coletas, nível e ranking da comunidade.
            </p>
          </div>
          <Link
            to="/collect"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-soft hover:opacity-90 transition"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            Nova coleta
          </Link>
        </div>

        {/* ── Desktop: 2-column layout ── */}
        <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-8 lg:px-8 lg:pt-6">
          {/* LEFT: level + metrics + badges */}
          <div className="space-y-4 lg:space-y-5">
            {/* Level hero */}
            <section className="px-5 lg:px-0 -mt-1 lg:mt-0">
              <div className="rounded-3xl bg-gradient-primary text-primary-foreground p-5 shadow-elevated">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider opacity-90">
                      Seu nível
                    </div>
                    <div className="mt-1 text-3xl font-extrabold tracking-tight flex items-center gap-2">
                      Prata <Medal className="size-6 text-silver" />
                    </div>
                    <div className="text-xs opacity-90 mt-1">Top 3 da sua comunidade</div>
                  </div>
                  <div className="size-16 rounded-2xl bg-primary-foreground/15 backdrop-blur flex items-center justify-center">
                    <Trophy className="size-8 text-reward" />
                  </div>
                </div>
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs opacity-90 mb-1.5">
                    <span>248L coletados</span>
                    <span className="font-semibold">52L até Ouro</span>
                  </div>
                  <div className="h-2.5 bg-primary-foreground/20 rounded-full overflow-hidden">
                    <div className="h-full bg-reward rounded-full" style={{ width: "82%" }} />
                  </div>
                </div>
              </div>
            </section>

            {/* Metrics */}
            <section className="px-5 lg:px-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard
                icon={Droplets}
                value="248.000L"
                label="de água protegidos"
                tone="water"
              />
              <MetricCard icon={Leaf} value="412kg" label="CO₂ evitado" tone="primary" />
              <MetricCard icon={TrendingUp} value="R$ 297,60" label="pagos via PIX" tone="reward" />
              <MetricCard icon={Trophy} value="4.960" label="pontos de impacto" tone="gaming" />
            </section>

            {/* Badges */}
            <section className="px-5 lg:px-0">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-base font-bold">Conquistas</h2>
                <span className="text-xs text-muted-foreground">3 de 12</span>
              </div>
              <div className="grid grid-cols-4 lg:grid-cols-4 gap-3">
                {BADGES.map(({ icon: Icon, label, earned, color }) => (
                  <div key={label} className="flex flex-col items-center text-center">
                    <div
                      className={`size-14 rounded-2xl flex items-center justify-center ${color} ${earned ? "shadow-soft" : "opacity-60"}`}
                    >
                      <Icon className="size-6" />
                    </div>
                    <div className="mt-1.5 text-[11px] font-medium leading-tight">{label}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Leaderboard (mobile only) */}
            <section className="lg:hidden px-5 mt-6">
              <Leaderboard />
            </section>
          </div>

          {/* RIGHT: leaderboard (desktop only) */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <Leaderboard />
            </div>
          </div>
        </div>

        <div className="h-6" />
      </MobileShell>
    </div>
  );
}

function Leaderboard() {
  return (
    <>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-base font-bold">Ranking da comunidade</h2>
        <span className="text-xs text-muted-foreground">Esta semana</span>
      </div>
      <ul className="bg-card rounded-3xl border border-border shadow-soft overflow-hidden">
        {LEADERBOARD.map((row, i) => (
          <li
            key={row.name}
            className={`flex items-center gap-3 px-4 py-3.5 ${i < LEADERBOARD.length - 1 ? "border-b border-border" : ""} ${row.you ? "bg-accent" : ""}`}
          >
            <span
              className={`size-8 rounded-full flex items-center justify-center text-sm font-bold ${
                i === 0
                  ? "bg-gold/30 text-foreground"
                  : i === 1
                    ? "bg-silver/40 text-foreground"
                    : i === 2
                      ? "bg-bronze/30 text-foreground"
                      : "bg-secondary text-muted-foreground"
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`flex-1 text-sm ${row.you ? "font-bold text-primary" : "font-medium"}`}
            >
              {row.name}
            </span>
            <span className="text-sm font-bold tabular-nums">{row.liters}L</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function MetricCard({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof Droplets;
  value: string;
  label: string;
  tone: "water" | "primary" | "reward" | "gaming";
}) {
  const map = {
    water: "bg-water/15 text-water",
    primary: "bg-primary/10 text-primary",
    reward: "bg-reward/25 text-reward-foreground",
    gaming: "bg-gaming/15 text-gaming",
  } as const;
  return (
    <div className="rounded-3xl bg-card border border-border p-4 shadow-soft">
      <div className={`size-10 rounded-2xl flex items-center justify-center ${map[tone]}`}>
        <Icon className="size-5" />
      </div>
      <div className="mt-3 text-xl font-extrabold tracking-tight">{value}</div>
      <div className="text-[11px] text-muted-foreground leading-tight">{label}</div>
    </div>
  );
}
