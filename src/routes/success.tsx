import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useRate } from "@/hooks/use-rate";
import { AlertCircle, Check, Droplets, ExternalLink, Leaf, Trophy } from "lucide-react";
import { Logo } from "@/components/Logo";
import { BlurredHeroBg } from "@/components/BlurredHeroBg";

export const Route = createFileRoute("/success")({
  component: SuccessPage,
  validateSearch: (s: Record<string, unknown>) => ({
    l: typeof s.l === "number" ? s.l : Number(s.l) || 2,
    p: typeof s.p === "string" ? s.p : "",
    txHash: typeof s.txHash === "string" ? s.txHash : undefined,
    pixStatus: typeof s.pixStatus === "string" ? s.pixStatus : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Coleta concluída — ChainOil" },
      {
        name: "description",
        content: "PIX enviado e impacto ambiental gerado. Veja seu progresso.",
      },
    ],
  }),
});

function SuccessPage() {
  useAuthGuard();
  const { l, p, txHash, pixStatus } = Route.useSearch();
  const { rate } = useRate();
  const reward = (l * rate).toFixed(2).replace(".", ",");
  const water = l * 1000;
  const co2 = (l * 1.5).toFixed(1);

  const isMock = pixStatus === "mock_pending";
  const isFailed = pixStatus === "failed";
  const isPending = pixStatus === "pending" || pixStatus === "processing";

  const pixLabel = isMock
    ? "Demo • PIX simulado"
    : isFailed
      ? "Problema no PIX"
      : isPending
        ? "PIX em processamento"
        : "PIX enviado";

  const pixDesc = isMock
    ? "Modo demonstração — em produção o PIX seria enviado instantaneamente."
    : isFailed
      ? "Houve um problema ao processar o pagamento. Entre em contato com o suporte."
      : isPending
        ? "O PIX foi iniciado e chegará em instantes."
        : `Enviado instantaneamente ${p ? `para ${p}` : "ao cidadão"}.`;

  return (
    <div className="relative">
      <BlurredHeroBg />
      <main className="min-h-screen flex flex-col">
        <div className="px-5 pt-8 lg:px-12">
          <Logo />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 pt-8 pb-6 text-center">
          <div className="w-full max-w-md lg:max-w-xl bg-background/60 backdrop-blur-md rounded-3xl p-6 border border-border/30 shadow-elevated">
            <div className="relative size-28 mb-6 animate-pop-in mx-auto">
              <div className="absolute inset-0 rounded-full bg-success/20" />
              <div className="absolute inset-2 rounded-full bg-gradient-primary flex items-center justify-center shadow-elevated">
                <Check className="size-14 text-primary-foreground" strokeWidth={3} />
              </div>
            </div>

            <p className="text-sm font-semibold text-primary uppercase tracking-wider animate-float-up flex items-center justify-center gap-1.5">
              {isFailed && <AlertCircle className="size-3.5" />}
              {pixLabel}
            </p>
            <h1
              className="mt-1 text-4xl lg:text-5xl font-extrabold tracking-tight animate-float-up"
              style={{ animationDelay: "60ms" }}
            >
              R$ {reward}
            </h1>
            <p
              className="mt-2 text-muted-foreground text-sm animate-float-up"
              style={{ animationDelay: "120ms" }}
            >
              {pixDesc}
            </p>
            {txHash && (
              <a
                href={`https://explorer.solana.com/tx/${txHash}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline animate-float-up"
                style={{ animationDelay: "150ms" }}
              >
                Ver transação on-chain
                <ExternalLink className="size-3" />
              </a>
            )}

            <div
              className="mt-8 grid grid-cols-2 lg:grid-cols-3 gap-3 animate-float-up"
              style={{ animationDelay: "180ms" }}
            >
              <div className="rounded-3xl bg-card border border-border p-4 text-left shadow-soft">
                <div className="size-10 rounded-2xl bg-water/20 flex items-center justify-center text-water">
                  <Droplets className="size-5" />
                </div>
                <div className="mt-3 text-2xl font-extrabold">{water.toLocaleString("pt-BR")}L</div>
                <div className="text-xs text-muted-foreground">de água protegidos</div>
              </div>
              <div className="rounded-3xl bg-card border border-border p-4 text-left shadow-soft">
                <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Leaf className="size-5" />
                </div>
                <div className="mt-3 text-2xl font-extrabold">{co2}kg</div>
                <div className="text-xs text-muted-foreground">CO₂ evitado</div>
              </div>
              <div className="rounded-3xl bg-card border border-border p-4 text-left shadow-soft">
                <div className="size-10 rounded-2xl bg-gaming/15 flex items-center justify-center text-gaming">
                  <Trophy className="size-5" />
                </div>
                <div className="mt-3 text-2xl font-extrabold">OIL</div>
                <div className="text-xs text-muted-foreground">tokens Solana</div>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <Link
                to="/collect"
                className="block w-full h-14 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-base shadow-elevated hover:opacity-90 active:scale-[0.98] transition text-center leading-[3.5rem]"
              >
                Registrar nova coleta
              </Link>
              <Link
                to="/dashboard"
                className="block w-full h-12 rounded-2xl bg-card border border-border text-foreground font-semibold text-sm text-center leading-[3rem] hover:bg-secondary transition"
              >
                Ver meu impacto
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
