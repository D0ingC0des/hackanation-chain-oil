import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { UserPlus, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { PinGate } from "@/components/PinGate";
import { useAdminPin } from "@/hooks/use-admin-pin";
import { ADMIN_PIN } from "@/constants/session";

export const Route = createFileRoute("/reset")({
  component: ResetPage,
  head: () => ({
    meta: [{ title: "ChainOil" }],
  }),
});

function ResetPage() {
  const { authed, approve } = useAdminPin();

  if (!ADMIN_PIN) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Não disponível.</p>
      </div>
    );
  }

  if (!authed) {
    return <PinGate correctPin={ADMIN_PIN} onSuccess={approve} />;
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
