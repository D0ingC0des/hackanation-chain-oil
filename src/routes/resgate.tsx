import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Wallet, Flame, ArrowLeft, Minus, Plus } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { Logo } from "@/components/Logo";
import { BlurredHeroBg } from "@/components/BlurredHeroBg";
import { prepareBurn, processBurn } from "@/services/burn-service";
import { useCotBalance } from "@/hooks/use-cot-balance";

export const Route = createFileRoute("/resgate")({
  component: ResgatePage,
  head: () => ({
    meta: [
      { title: "Resgatar COT — ChainOil" },
      { name: "description", content: "Queime seus tokens COT e resgate sua recompensa." },
    ],
  }),
});

const STEPS = [
  "Preparando queima",
  "Assinando na carteira",
  "Queimando COT",
  "Confirmando",
];

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function ResgatePage() {
  useAuthGuard();
  const navigate = useNavigate();
  const { publicKey, signTransaction } = useWallet();
  const cotBalance = useCotBalance();

  const [phase, setPhase] = useState<"form" | "processing" | "done" | "error">("form");
  const [amount, setAmount] = useState(1);
  const [step, setStep] = useState(0);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const runningRef = useRef(false);

  const maxAmount = cotBalance ?? 0;

  function dec() { setAmount((v) => Math.max(1, v - 1)); }
  function inc() { setAmount((v) => Math.min(maxAmount, v + 1)); }

  async function handleConfirm() {
    if (!publicKey || !signTransaction || amount <= 0) return;
    if (runningRef.current) return;
    runningRef.current = true;
    setPhase("processing");
    setStep(0);

    const operatorKey = publicKey.toBase58();

    try {
      setStep(1);
      await delay(300);

      const { burnId, txBase64 } = await prepareBurn({ operatorKey, amount });

      setStep(2);
      const txBytes = Uint8Array.from(atob(txBase64), (c) => c.charCodeAt(0));
      const tx = Transaction.from(txBytes);
      const signedTx = await signTransaction(tx);
      const signedBytes = signedTx.serialize({ requireAllSignatures: false, verifySignatures: false });
      const signedBase64 = btoa(String.fromCharCode(...signedBytes));

      setStep(3);
      const { txHash: hash } = await processBurn({ burnId, signedTxBase64: signedBase64 });
      setTxHash(hash);

      setStep(4);
      await delay(600);
      setPhase("done");
    } catch (err) {
      console.error("resgate error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Erro desconhecido");
      setPhase("error");
    } finally {
      runningRef.current = false;
    }
  }

  // Redireciona para form se step completo
  useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(() => navigate({ to: "/dashboard" }), 3000);
    return () => clearTimeout(t);
  }, [phase, navigate]);

  if (phase === "done") {
    return (
      <div className="relative">
        <BlurredHeroBg />
        <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <div className="max-w-sm w-full space-y-6">
            <Logo />
            <div className="size-20 mx-auto rounded-full bg-success flex items-center justify-center">
              <Check className="size-10 text-success-foreground" strokeWidth={3} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold">COT queimado!</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {amount} COT removido do supply de forma permanente.
              </p>
            </div>
            {txHash && (
              <a
                href={`https://explorer.solana.com/tx/${txHash}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary underline underline-offset-2"
              >
                Ver no Explorer Solana
              </a>
            )}
            <p className="text-xs text-muted-foreground">Redirecionando para o dashboard...</p>
          </div>
        </main>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="relative">
        <BlurredHeroBg />
        <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <div className="max-w-sm">
            <Logo />
            <h1 className="mt-6 text-xl font-bold">Algo deu errado</h1>
            <p className="mt-2 text-sm text-muted-foreground">{errorMsg || "A transação falhou. Tente novamente."}</p>
            <button
              onClick={() => { setPhase("form"); runningRef.current = false; }}
              className="mt-6 w-full h-12 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold"
            >
              Tentar novamente
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (phase === "processing") {
    const progress = Math.min(100, (step / STEPS.length) * 100);
    const isWalletStep = step === 2;

    return (
      <div className="relative">
        <BlurredHeroBg />
        <main className="min-h-screen flex flex-col">
          <div className="px-5 pt-8 lg:px-12">
            <Logo />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-full max-w-md">
              <div className="relative size-32 mb-8 mx-auto">
                <div className="absolute inset-0 rounded-full bg-gradient-primary animate-pulse-ring" />
                <div className="absolute inset-0 rounded-full bg-gradient-primary flex items-center justify-center shadow-elevated">
                  {isWalletStep ? (
                    <Wallet className="size-14 text-primary-foreground" strokeWidth={2} />
                  ) : (
                    <Flame className="size-14 text-primary-foreground" strokeWidth={2} />
                  )}
                </div>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight">
                {isWalletStep ? "Confirme na carteira" : "Queimando COT..."}
              </h1>
              <p className="mt-2 text-muted-foreground text-sm max-w-xs mx-auto">
                {isWalletStep
                  ? "Verifique sua carteira Phantom ou Solflare e aprove a transação."
                  : `Queimando ${amount} COT de forma permanente e auditável.`}
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
                    const active = i === step - 1;
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
                            i === 1 ? (
                              <Wallet className="size-4" />
                            ) : (
                              <Loader2 className="size-4 animate-spin" />
                            )
                          ) : (
                            <span className="size-2 rounded-full bg-current" />
                          )}
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
          </div>
          <p className="pb-6 text-center text-[11px] text-muted-foreground px-6">
            Queima registrada on-chain via Token-2022 ChainOil.
          </p>
        </main>
      </div>
    );
  }

  // Form
  return (
    <div className="relative">
      <BlurredHeroBg />
      <main className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate({ to: "/profile" })}
              className="p-2 rounded-xl hover:bg-secondary transition"
            >
              <ArrowLeft className="size-5" />
            </button>
            <Logo />
          </div>

          <div className="rounded-3xl bg-card/80 border border-border p-6 space-y-6 backdrop-blur-sm">
            <div>
              <h1 className="text-xl font-extrabold">Resgatar COT</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Queime seus tokens COT acumulados nas coletas.
              </p>
            </div>

            <div className="rounded-2xl bg-primary/10 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-primary font-semibold">Saldo disponível</span>
              <span className="text-xl font-extrabold text-primary">
                {cotBalance === null ? (
                  <Loader2 className="size-4 animate-spin inline" />
                ) : (
                  `${cotBalance} COT`
                )}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Quantidade a queimar</label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={dec}
                  disabled={amount <= 1}
                  className="size-11 rounded-2xl bg-secondary flex items-center justify-center disabled:opacity-40 hover:bg-secondary/70 transition"
                >
                  <Minus className="size-4" />
                </button>
                <span className="flex-1 text-center text-3xl font-extrabold tabular-nums">
                  {amount}
                  <span className="text-sm font-normal text-muted-foreground ml-1">COT</span>
                </span>
                <button
                  type="button"
                  onClick={inc}
                  disabled={amount >= maxAmount}
                  className="size-11 rounded-2xl bg-secondary flex items-center justify-center disabled:opacity-40 hover:bg-secondary/70 transition"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              {maxAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(maxAmount)}
                  className="text-xs text-primary underline underline-offset-2 w-full text-center"
                >
                  Usar tudo ({maxAmount} COT)
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={!publicKey || amount <= 0 || maxAmount === 0 || amount > maxAmount}
              className="w-full h-12 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold disabled:opacity-40 transition flex items-center justify-center gap-2"
            >
              <Flame className="size-4" />
              Queimar {amount} COT
            </button>

            <p className="text-[11px] text-muted-foreground text-center">
              A queima é irreversível e registrada permanentemente na Solana.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
