import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Wallet } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { Logo } from "@/components/Logo";
import { BlurredHeroBg } from "@/components/BlurredHeroBg";
import {
  prepareCollection,
  processCollection,
} from "@/services/collection-service";
import { type PixType } from "@/constants/pix";
import { PENDING_PHOTO_KEY } from "@/constants/session";
import { useRate } from "@/hooks/use-rate";

export const Route = createFileRoute("/processing")({
  component: ProcessingPage,
  validateSearch: (s: Record<string, unknown>) => ({
    l: typeof s.l === "number" ? s.l : Number(s.l) || 1,
    p: typeof s.p === "string" ? s.p : "",
    t: (["PHONE", "CPF", "EMAIL"].includes(s.t as string) ? s.t : "PHONE") as PixType,
  }),
  head: () => ({
    meta: [
      { title: "Validando coleta — ChainOil" },
      {
        name: "description",
        content: "Estamos confirmando sua coleta e enviando o PIX.",
      },
    ],
  }),
});

const STEPS = [
  "Calculando recompensa",
  "Preparando transação",
  "Assinando na carteira",
  "Registrando on-chain",
  "Enviando seu PIX",
];

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function ProcessingPage() {
  useAuthGuard();
  const { l, p, t } = Route.useSearch();
  const navigate = useNavigate();
  const { publicKey, signTransaction } = useWallet();
  const { rate } = useRate();
  const [step, setStep] = useState(0);
  const [failed, setFailed] = useState(false);
  const savedRef = useRef(false);
  const resultRef = useRef<{ txHash: string | null; pixStatus: string } | null>(null);

  useEffect(() => {
    if (savedRef.current || !publicKey) return;
    savedRef.current = true;

    const operatorKey = publicKey.toBase58();

    async function run() {
      console.clear();
      try {
        setStep(1);
        await delay(400);

        // Step 1: prepare — edge function builds the Solana tx
        setStep(2);
        const { collectionId, txBase64, rewardBrl } = await prepareCollection({
          operatorKey,
          citizenPhone: p,
          liters: l,
        });

        // Step 2: partial-sign — wallet popup
        setStep(3);
        if (!signTransaction)
          throw new Error("Carteira não suporta assinatura. Reconecte sua carteira.");
        const txBytes = Uint8Array.from(atob(txBase64), (c) => c.charCodeAt(0));
        const tx = Transaction.from(txBytes);
        const signedTx = await signTransaction(tx);
        const signedBytes = signedTx.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        });
        const signedBase64 = btoa(String.fromCharCode(...signedBytes));

        // Step 3: process — edge co-signs, submits, PIX + photo upload
        setStep(4);
        const photo = sessionStorage.getItem(PENDING_PHOTO_KEY);
        sessionStorage.removeItem(PENDING_PHOTO_KEY);

        const result = await processCollection({
          collectionId,
          partialSignedTxBase64: signedBase64,
          operatorKey,
          citizenPhone: p,
          citizenPixType: t,
          liters: l,
          rewardBrl,
          photoBase64: photo ?? undefined,
        });
        resultRef.current = { txHash: result.txHash, pixStatus: result.pixStatus };

        if (result.summary) {
          const s = result.summary;
          console.group("━━━ ChainOil TX SUMMARY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log("Data/hora  :", s.timestamp);
          console.log("Coleta ID  :", result.collectionId);
          console.groupCollapsed("─── On-chain (Solana devnet)");
          console.log("Origem (mintAuthority)  :", s.onChain.origin);
          console.log("Destino (token account) :", s.onChain.destination);
          console.log("Operador (wallet)       :", s.onChain.operator);
          console.log("COTs transferidas       :", s.onChain.cotsTransferred, "COT");
          console.log("TX Status               :", s.onChain.txStatus);
          console.log("TX Hash                 :", s.onChain.txHash);
          console.log("Explorer                :", s.onChain.explorer);
          console.groupEnd();
          console.groupCollapsed("─── PIX");
          console.log("Chave PIX cidadão :", s.pix.citizenKey, `(${s.pix.pixType})`);
          console.log("Valor             : R$", s.pix.amountBrl.toFixed(2));
          console.log("PIX Status        :", s.pix.pixStatus);
          console.log("PIX ID            :", s.pix.pixId);
          console.groupEnd();
          console.groupEnd();
        }

        setStep(5);
      } catch (err) {
        console.error("processing error:", err);
        setFailed(true);
      }
    }

    run();
  }, [publicKey, signTransaction, l, p, t, rate]);

  useEffect(() => {
    if (step < STEPS.length) return;
    const timer = setTimeout(() => {
      const r = resultRef.current;
      navigate({
        to: "/success",
        search: {
          l,
          p,
          txHash: r?.txHash ?? undefined,
          pixStatus: r?.pixStatus ?? undefined,
        },
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [step, navigate, l, p]);

  const progress = Math.min(100, (step / STEPS.length) * 100);
  const isWalletStep = step === 3; // "Assinando na carteira" is active

  if (failed) {
    return (
      <div className="relative">
        <BlurredHeroBg />
        <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <div className="max-w-sm">
            <Logo />
            <h1 className="mt-6 text-xl font-bold">Algo deu errado</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              A transação falhou ou expirou. Tente novamente.
            </p>
            <button
              onClick={() => navigate({ to: "/collect" })}
              className="mt-6 w-full h-12 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold"
            >
              Tentar novamente
            </button>
          </div>
        </main>
      </div>
    );
  }

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
                {isWalletStep ? (
                  <Wallet className="size-14 text-primary-foreground" strokeWidth={2} />
                ) : (
                  <Loader2
                    className="size-14 text-primary-foreground animate-spin"
                    strokeWidth={2.5}
                  />
                )}
              </div>
            </div>

            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
              {isWalletStep ? "Confirme na carteira" : "Quase lá!"}
            </h1>
            <p className="mt-2 text-muted-foreground text-sm max-w-xs mx-auto">
              {isWalletStep
                ? "Verifique sua carteira Phantom ou Solflare e aprove a transação."
                : `Confirmando sua coleta de ${l}L com segurança.`}
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
                          i === 2 ? (
                            <Wallet className="size-4" />
                          ) : (
                            <Loader2 className="size-4 animate-spin" />
                          )
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
          Coleta verificada com co-assinatura on-chain ChainOil.
        </p>
      </main>
    </div>
  );
}
