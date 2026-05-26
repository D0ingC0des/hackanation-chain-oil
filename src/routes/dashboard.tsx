import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useDashboard } from "@/hooks/use-dashboard";
import {
  ChevronLeft,
  Droplets,
  Leaf,
  Loader2,
  Plus,
  TrendingUp,
} from "lucide-react";
import { BlurredHeroBg } from "@/components/BlurredHeroBg";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Meu impacto — ChainOil" },
      {
        name: "description",
        content: "Acompanhe suas coletas e o impacto ambiental gerado.",
      },
    ],
  }),
});

function fmtNumber(n: number, decimals = 0) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

function DashboardPage() {
  useAuthGuard();
  const { loading, totalWaterL, totalCo2Kg, totalPixBrl } = useDashboard();

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
              Acompanhe suas coletas e o impacto ambiental.
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

        {/* Metrics */}
        <section className="px-5 lg:px-8 lg:pt-6 grid grid-cols-2 lg:grid-cols-3 gap-3">
          <MetricCard
            icon={Droplets}
            value={fmtNumber(totalWaterL) + "L"}
            label="de água protegidos"
            tone="water"
            loading={loading}
          />
          <MetricCard
            icon={Leaf}
            value={fmtNumber(totalCo2Kg, 1) + "kg"}
            label="CO₂ evitado"
            tone="primary"
            loading={loading}
          />
          <MetricCard
            icon={TrendingUp}
            value={"R$ " + fmtNumber(totalPixBrl, 2)}
            label="pagos via PIX"
            tone="reward"
            loading={loading}
          />
        </section>

        <div className="h-6" />
      </MobileShell>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  value,
  label,
  tone,
  loading,
}: {
  icon: typeof Droplets;
  value: string;
  label: string;
  tone: "water" | "primary" | "reward";
  loading: boolean;
}) {
  const map = {
    water: "bg-water/15 text-water",
    primary: "bg-primary/10 text-primary",
    reward: "bg-reward/25 text-reward-foreground",
  } as const;
  return (
    <div className="rounded-3xl bg-card border border-border p-4 shadow-soft">
      <div className={`size-10 rounded-2xl flex items-center justify-center ${map[tone]}`}>
        <Icon className="size-5" />
      </div>
      <div className="mt-3 min-h-[28px] flex items-center">
        {loading ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : (
          <span className="text-xl font-extrabold tracking-tight">{value}</span>
        )}
      </div>
      <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{label}</div>
    </div>
  );
}
