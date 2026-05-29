import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useDashboard, useCollectionHistory } from "@/hooks/use-dashboard";
import { ChevronLeft, Droplets, FlaskConical, Leaf, Loader2, Plus, TrendingUp } from "lucide-react";
import { BlurredHeroBg } from "@/components/BlurredHeroBg";
import { MetricCard } from "@/components/MetricCard";
import { PIX_ICON } from "@/constants/pix";
import { fmtPixKey, fmtBRL, fmtNumber, fmtDate } from "@/utils/formatters";

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

function DashboardPage() {
  useAuthGuard();
  const { loading, totalLiters, totalWaterL, totalCo2Kg, totalPixBrl } = useDashboard();
  const { history, loading: loadingHistory } = useCollectionHistory();

  return (
    <div className="relative">
      <BlurredHeroBg />

      <MobileShell transparentBg>
        {/* ── Mobile header ── */}
        <header className="lg:hidden px-5 pt-6 pb-4 flex items-center justify-between bg-gradient-hero">
          <Link
            to="/collect"
            className="size-10 rounded-full bg-card/80 border border-border flex items-center justify-center shadow-soft backdrop-blur-sm"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <h1 className="text-base font-semibold drop-shadow-sm">Meu impacto</h1>
          <div className="size-10" />
        </header>

        {/* ── Desktop header ── */}
        <div className="hidden lg:flex lg:items-center lg:justify-between px-8 pt-8 pb-2 rounded-2xl bg-background/70 backdrop-blur-md mx-4 mt-4 mb-0 border border-border/40">
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

        {/* Total óleo coletado */}
        <section className="px-5 lg:px-8 mt-2">
          <div className="rounded-3xl bg-card border border-border p-4 shadow-soft flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <FlaskConical className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total de óleo coletado</p>
              {loading ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground mt-1" />
              ) : (
                <p className="text-2xl font-extrabold tracking-tight">
                  {fmtNumber(totalLiters, 1)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">litros</span>
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Histórico de coletas */}
        <section className="px-5 lg:px-8 mt-4 pb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Histórico de PIX
          </h2>

          {loadingHistory ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-3xl bg-card border border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">Nenhuma coleta registrada ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((record) => {
                const pixType = record.citizen_pix_type ?? "PHONE";
                const PixIcon = PIX_ICON[pixType];
                return (
                  <div
                    key={record.id}
                    className="rounded-2xl bg-card border border-border px-4 py-3 flex items-center gap-3 shadow-soft"
                  >
                    <div className="size-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <PixIcon className="size-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {fmtPixKey(record.citizen_phone, pixType)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(record.collected_at)}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-primary shrink-0">
                      {fmtBRL(Number(record.reward_brl))}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="h-4" />
      </MobileShell>
    </div>
  );
}
