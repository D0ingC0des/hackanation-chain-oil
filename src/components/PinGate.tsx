import { useState } from "react";
import { Lock } from "lucide-react";

interface PinGateProps {
  correctPin: string;
  onSuccess: () => void;
}

export function PinGate({ correctPin, onSuccess }: PinGateProps) {
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
