import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Lock, UserPlus, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/reset")({
  component: ResetPage,
  head: () => ({
    meta: [{ title: "ChainOil" }],
  }),
});

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN as string | undefined;
const SESSION_KEY = "chainoil_admin_auth";

function ResetPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");

  if (!ADMIN_PIN) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Não disponível.</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <PinGate
        correctPin={ADMIN_PIN}
        onSuccess={() => {
          sessionStorage.setItem(SESSION_KEY, "1");
          setAuthed(true);
        }}
      />
    );
  }

  return <ResetPanel />;
}

function ResetPanel() {
  const { disconnect, connected } = useWallet();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    setLoading(true);
    try {
      if (connected) await disconnect();
    } catch {
      // ignora erros de desconexão
    } finally {
      setLoading(false);
      navigate({ to: "/" });
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-xs space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Logo />
          <p className="text-sm font-medium text-muted-foreground">Preparar novo operador</p>
        </div>

        <div className="rounded-3xl bg-card border border-border p-6 space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            {connected
              ? "A carteira atual será desconectada. O novo operador poderá criar o cadastro."
              : "Nenhuma carteira conectada. Redirecionar para novo cadastro."}
          </p>

          <button
            onClick={handleReset}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold py-3 disabled:opacity-50 transition"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <UserPlus className="size-4" />
                Novo cadastro
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function PinGate({ correctPin, onSuccess }: { correctPin: string; onSuccess: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin === correctPin) {
      onSuccess();
    } else {
      setError(true);
      setPin("");
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div className="flex flex-col items-center gap-3 mb-2">
          <div className="size-12 rounded-2xl bg-secondary flex items-center justify-center">
            <Lock className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Área restrita</p>
        </div>
        <input
          type="password"
          value={pin}
          onChange={(e) => {
            setError(false);
            setPin(e.target.value);
          }}
          autoFocus
          placeholder="PIN de acesso"
          className="w-full rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        {error && <p className="text-xs text-destructive text-center">PIN incorreto.</p>}
        <button
          type="submit"
          disabled={!pin}
          className="w-full rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold py-3 disabled:opacity-50 transition"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
