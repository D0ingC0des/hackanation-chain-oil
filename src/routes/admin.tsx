import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Settings, Loader2, CheckCheck, AlertTriangle, Lock } from "lucide-react";
import { getRateConfig, updateRatePerLiter, type RateConfig } from "@/services/rates-service";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [{ title: "Admin — ChainOil" }],
  }),
});

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN as string | undefined;
const SESSION_KEY = "chainoil_admin_auth";

function AdminPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");

  if (!ADMIN_PIN) {
    return <Blocked message="Acesso administrativo não configurado neste ambiente." />;
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

  return <RateDashboard />;
}

function RateDashboard() {
  const [config, setConfig] = useState<RateConfig | null>(null);
  const [newRate, setNewRate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRateConfig()
      .then((c) => {
        setConfig(c);
        if (c) setNewRate(parseFloat(c.value).toFixed(2));
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rate = parseFloat(newRate.replace(",", "."));
    if (isNaN(rate) || rate <= 0) {
      setError("Valor inválido.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateRatePerLiter(rate, "admin");
      const updated = await getRateConfig();
      setConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-4 pt-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <Settings className="size-3.5" />
          Painel Administrativo
        </div>

        <section className="rounded-3xl bg-card border border-border p-6 space-y-5">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Valor atual por litro</p>
            {loading ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <p className="text-3xl font-bold">
                  R$ {config ? parseFloat(config.value).toFixed(2) : "—"}
                  <span className="text-sm font-normal text-muted-foreground ml-2">/ litro</span>
                </p>
                {config?.updated_at && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Atualizado em {new Date(config.updated_at).toLocaleString("pt-BR")}
                  </p>
                )}
              </>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Novo valor (R$ / litro)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="1.20"
              />
            </div>

            {error && (
              <p className="text-xs text-destructive flex items-center gap-1.5">
                <AlertTriangle className="size-3" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving || !newRate}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold py-3 disabled:opacity-50 transition"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : saved ? (
                <>
                  <CheckCheck className="size-4" />
                  Salvo
                </>
              ) : (
                "Salvar valor"
              )}
            </button>
          </form>
        </section>

        <p className="text-[11px] text-muted-foreground text-center">
          Este valor é lido pelos contratos Solana no momento de cada coleta.
        </p>
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

function Blocked({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
