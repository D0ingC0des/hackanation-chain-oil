import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Droplets, Sparkles, Trophy } from "lucide-react";

export const Route = createFileRoute("/success")({
  component: SuccessPage,
  validateSearch: (s: Record<string, unknown>) => ({
    l: typeof s.l === "number" ? s.l : Number(s.l) || 2,
    p: typeof s.p === "string" ? s.p : "",
  }),
  head: () => ({
    meta: [
      { title: "Coleta concluída — ChainOil" },
      { name: "description", content: "PIX enviado e impacto ambiental gerado. Veja seu progresso." },
    ],
  }),
});

function SuccessPage() {
  const { l, p } = Route.useSearch();
  const reward = (l * 1.2).toFixed(2).replace(".", ",");
  const points = l * 20;
  const water = l * 1000;

  return (
    <main className="min-h-screen bg-gradient-hero flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-6 text-center">
        <div className="relative size-28 mb-6 animate-pop-in">
          <div className="absolute inset-0 rounded-full bg-success/20" />
          <div className="absolute inset-2 rounded-full bg-gradient-primary flex items-center justify-center shadow-elevated">
            <Check className="size-14 text-primary-foreground" strokeWidth={3} />
          </div>
        </div>

        <p className="text-sm font-semibold text-primary uppercase tracking-wider animate-float-up">PIX enviado</p>
        <h1 className="mt-1 text-4xl font-extrabold tracking-tight animate-float-up" style={{ animationDelay: "60ms" }}>
          R$ {reward}
        </h1>
        <p className="mt-2 text-muted-foreground text-sm animate-float-up" style={{ animationDelay: "120ms" }}>
          Enviado instantaneamente {p ? `para ${p}` : "ao cidadão"}.
        </p>

        <div className="mt-8 w-full max-w-sm grid grid-cols-2 gap-3 animate-float-up" style={{ animationDelay: "180ms" }}>
          <div className="rounded-3xl bg-card border border-border p-4 text-left shadow-soft">
            <div className="size-10 rounded-2xl bg-reward/20 flex items-center justify-center text-reward-foreground">
              <Sparkles className="size-5" />
            </div>
            <div className="mt-3 text-2xl font-extrabold">+{points}</div>
            <div className="text-xs text-muted-foreground">pontos de impacto</div>
          </div>
          <div className="rounded-3xl bg-card border border-border p-4 text-left shadow-soft">
            <div className="size-10 rounded-2xl bg-water/20 flex items-center justify-center text-water">
              <Droplets className="size-5" />
            </div>
            <div className="mt-3 text-2xl font-extrabold">{water.toLocaleString("pt-BR")}L</div>
            <div className="text-xs text-muted-foreground">de água protegidos</div>
          </div>
        </div>

        <div className="mt-4 w-full max-w-sm rounded-3xl bg-gradient-impact p-5 text-left text-primary-foreground shadow-elevated animate-float-up" style={{ animationDelay: "240ms" }}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-90">
            <Trophy className="size-4" /> Você está perto do nível Prata
          </div>
          <div className="mt-3 h-2 bg-primary-foreground/20 rounded-full overflow-hidden">
            <div className="h-full bg-reward rounded-full" style={{ width: "72%" }} />
          </div>
          <div className="mt-2 text-xs opacity-90">Faltam apenas 8L para o próximo nível.</div>
        </div>
      </div>

      <div className="px-5 pb-6 safe-bottom space-y-2">
        <Link
          to="/collect"
          className="block w-full h-14 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-base shadow-elevated active:scale-[0.98] transition text-center leading-[3.5rem]"
        >
          Registrar nova coleta
        </Link>
        <Link
          to="/dashboard"
          className="block w-full h-12 rounded-2xl bg-card border border-border text-foreground font-semibold text-sm text-center leading-[3rem]"
        >
          Ver meu impacto
        </Link>
      </div>
    </main>
  );
}
