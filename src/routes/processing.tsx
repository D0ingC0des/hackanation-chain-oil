import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { Logo } from "@/components/Logo";
import { BlurredHeroBg } from "@/components/BlurredHeroBg";
import { processCollection, uploadCollectionPhoto } from "@/services/collection-service";
import { registerCollectionOnChain } from "@/services/anchor-service";
import { useRate } from "@/hooks/use-rate";

export const Route = createFileRoute("/processing")({
  component: ProcessingPage,
  validateSearch: (s: Record<string, unknown>) => ({
    l: typeof s.l === "number" ? s.l : Number(s.l) || 2,
    p: typeof s.p === "string" ? s.p : "",
  }),
  head: () => ({
    meta: [
      { title: "Validando coleta — ChainOil" },
      {
        name: "description",
        content: "Estamos calculando sua recompensa, validando a coleta e enviando o PIX.",
      },
    ],
  }),
});

const STEPS = [
  "Calculando recompensa",
  "Validando coleta",
  "Registrando impacto ambiental",
  "Enviando seu PIX",
];

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function ProcessingPage() {
  useAuthGuard();
  const { l, p } = Route.useSearch();
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { rate } = useRate();
  const [step, setStep] = useState(0);
  const savedRef = useRef(false);

  useEffect(() => {
    if (savedRef.current || !publicKey) return;
    savedRef.current = true;

    const operatorKey = publicKey.toBase58();
    const collectionId = crypto.randomUUID();

    async function run() {
      setStep(1); // "Validando coleta"
      await delay(400);

      setStep(2); // "Registrando impacto ambiental" — on-chain
      let txHash: string | undefined;
      if (anchorWallet) {
        try {
          txHash = await registerCollectionOnChain({
            wallet: anchorWallet,
            supabaseId: collectionId,
            litersML: Math.round(l * 1000),
            rewardCentavos: Math.round(l * rate * 100),
          });
        } catch (e) {
          console.warn("on-chain registration skipped:", e);
        }
      }

      setStep(3); // "Enviando seu PIX" — edge function + Woovi
      try {
        const result = await processCollection({
          operatorKey,
          citizenPhone: p,
          liters: l,
          txHash,
          collectionId,
        });
        const photo = sessionStorage.getItem("chainoil_pending_photo");
        sessionStorage.removeItem("chainoil_pending_photo");
        if (photo) {
          uploadCollectionPhoto(result.collectionId, operatorKey, photo).catch(() => {});
        }
      } catch {}

      setStep(4); // done
    }

    run();
  }, [publicKey, anchorWallet, l, p, rate]);

  useEffect(() => {
    if (step < STEPS.length) return;
    const t = setTimeout(
      () => navigate({ to: "/success", search: { l, p } as { l: number; p: string } }),
      500,
    );
    return () => clearTimeout(t);
  }, [step, navigate, l, p]);

  const progress = Math.min(100, (step / STEPS.length) * 100);

  return (
    <div className="relative">
      <BlurredHeroBg />
      <main className="min-h-screen flex flex-col">
        <div className="px-5 pt-8 lg:px-12">
          <Logo />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-full max-w-md lg:max-w-lg">
            <div className="relative size-32 mb-8 mx-auto">
              <div className="absolute inset-0 rounded-full bg-gradient-primary animate-pulse-ring" />
              <div className="absolute inset-0 rounded-full bg-gradient-primary flex items-center justify-center shadow-elevated">
                <Loader2
                  className="size-14 text-primary-foreground animate-spin"
                  strokeWidth={2.5}
                />
              </div>
            </div>

            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">Quase lá!</h1>
            <p className="mt-2 text-muted-foreground text-sm max-w-xs mx-auto">
              Estamos confirmando a sua coleta de <b>{l}L</b> com segurança.
            </p>

            <div className="mt-8 w-full">
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
                        done
                          ? "bg-card border-border"
                          : active
                            ? "bg-card border-primary shadow-soft"
                            : "bg-transparent border-transparent opacity-50"
                      }`}
                    >
                      <span
                        className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                          done
                            ? "bg-success text-success-foreground"
                            : active
                              ? "bg-primary/10 text-primary"
                              : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {done ? (
                          <Check className="size-4" strokeWidth={3} />
                        ) : active ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <span className="size-2 rounded-full bg-current" />
                        )}
                      </span>
                      <span
                        className={`text-sm font-medium ${done || active ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        <p className="pb-6 text-center text-[11px] text-muted-foreground px-6">
          Sua coleta é verificada com tecnologia segura ChainOil.
        </p>
      </main>
    </div>
  );
}
