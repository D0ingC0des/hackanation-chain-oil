import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/processing")({
  component: ProcessingPage,
  validateSearch: (s: Record<string, unknown>) => ({
    l: typeof s.l === "number" ? s.l : Number(s.l) || 2,
    p: typeof s.p === "string" ? s.p : "",
  }),
  head: () => ({
    meta: [
      { title: "Validando coleta — ChainOil" },
      { name: "description", content: "Estamos calculando sua recompensa, validando a coleta e enviando o PIX." },
    ],
  }),
});

const STEPS = [
  "Calculando recompensa",
  "Validando coleta",
  "Registrando impacto ambiental",
  "Enviando seu PIX",
];

function ProcessingPage() {
  const { l, p } = Route.useSearch();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= STEPS.length) {
      const t = setTimeout(() => navigate({ to: "/success", search: { l, p } as any }), 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), 750);
    return () => clearTimeout(t);
  }, [step, navigate, l, p]);

  const progress = Math.min(100, (step / STEPS.length) * 100);

  return (
    <main className="min-h-screen bg-gradient-hero flex flex-col">
      <div className="px-5 pt-8"><Logo /></div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="relative size-32 mb-8">
          <div className="absolute inset-0 rounded-full bg-gradient-primary animate-pulse-ring" />
          <div className="absolute inset-0 rounded-full bg-gradient-primary flex items-center justify-center shadow-elevated">
            <Loader2 className="size-14 text-primary-foreground animate-spin" strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight">Quase lá!</h1>
        <p className="mt-2 text-muted-foreground text-sm max-w-xs">
          Estamos confirmando a sua coleta de <b>{l}L</b> com segurança.
        </p>

        <div className="mt-8 w-full max-w-sm">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <ul className="mt-6 space-y-3 text-left">
            {STEPS.map((label, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li
                  key={label}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition ${
                    done ? "bg-card border-border" : active ? "bg-card border-primary shadow-soft" : "bg-transparent border-transparent opacity-50"
                  }`}
                >
                  <span className={`size-8 rounded-full flex items-center justify-center ${
                    done ? "bg-success text-success-foreground" : active ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                  }`}>
                    {done ? <Check className="size-4" strokeWidth={3} /> : active ? <Loader2 className="size-4 animate-spin" /> : <span className="size-2 rounded-full bg-current" />}
                  </span>
                  <span className={`text-sm font-medium ${done || active ? "text-foreground" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <p className="pb-6 text-center text-[11px] text-muted-foreground px-6">
        Sua coleta é verificada com tecnologia segura ChainOil.
      </p>
    </main>
  );
}
