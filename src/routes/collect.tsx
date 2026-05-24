import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { Camera, ChevronLeft, Droplet, Sparkles, User } from "lucide-react";

export const Route = createFileRoute("/collect")({
  component: CollectPage,
  head: () => ({
    meta: [
      { title: "Nova coleta — ChainOil" },
      { name: "description", content: "Registre uma coleta de óleo em menos de 15 segundos e gere recompensa instantânea para o cidadão." },
    ],
  }),
});

const RATE = 1.2; // R$ per liter
const POINTS = 20; // per liter

function CollectPage() {
  useAuthGuard();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [liters, setLiters] = useState<number>(2);
  const [photo, setPhoto] = useState<string | null>(null);

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const reward = useMemo(() => (liters * RATE).toFixed(2).replace(".", ","), [liters]);
  const points = liters * POINTS;
  const water = liters * 1000;
  const canSubmit = phone.replace(/\D/g, "").length >= 10 && liters > 0;

  return (
    <MobileShell>
      {/* Header */}
      <header className="px-5 pt-6 pb-4 flex items-center justify-between bg-gradient-hero">
        <Link to="/" className="size-10 rounded-full bg-card border border-border flex items-center justify-center shadow-soft">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-base font-semibold">Nova coleta</h1>
        <div className="size-10" />
      </header>

      <div className="px-5 pt-2 space-y-4">
        {/* Phone */}
        <div className="bg-card rounded-3xl p-4 shadow-soft border border-border">
          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <User className="size-3.5" /> Celular do cidadão
          </label>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="(11) 90000-0000"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            className="mt-2 w-full h-14 px-4 rounded-2xl bg-secondary text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Liters */}
        <div className="bg-card rounded-3xl p-4 shadow-soft border border-border">
          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <Droplet className="size-3.5" /> Litros coletados
          </label>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setLiters((l) => Math.max(0.5, +(l - 0.5).toFixed(1)))}
              className="size-14 rounded-2xl bg-secondary text-2xl font-bold active:scale-95"
              aria-label="Diminuir"
            >−</button>
            <div className="flex-1 text-center">
              <div className="text-5xl font-extrabold tracking-tight">{liters}<span className="text-2xl text-muted-foreground ml-1">L</span></div>
            </div>
            <button
              type="button"
              onClick={() => setLiters((l) => +(l + 0.5).toFixed(1))}
              className="size-14 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold active:scale-95"
              aria-label="Aumentar"
            >+</button>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[1, 2, 5, 10].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setLiters(v)}
                className={`h-10 rounded-xl text-sm font-semibold border transition ${
                  liters === v ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-foreground"
                }`}
              >
                {v}L
              </button>
            ))}
          </div>
        </div>

        {/* Photo */}
        <label className="block bg-card rounded-3xl p-4 shadow-soft border border-dashed border-border cursor-pointer active:scale-[0.99] transition">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPhoto(URL.createObjectURL(f));
            }}
          />
          <div className="flex items-center gap-3">
            <div className="size-14 rounded-2xl bg-accent text-primary flex items-center justify-center">
              <Camera className="size-6" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Foto da garrafa PET</div>
              <div className="text-xs text-muted-foreground">Opcional — aumenta a confiança</div>
            </div>
            {photo && (
              <img src={photo} alt="Pré-visualização" className="size-12 rounded-xl object-cover" />
            )}
          </div>
        </label>

        {/* Reward preview */}
        <div className="rounded-3xl p-5 bg-gradient-reward shadow-reward text-reward-foreground">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="size-4" /> Recompensa instantânea
          </div>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <div className="text-xs opacity-80">Você paga via PIX</div>
              <div className="text-4xl font-extrabold tracking-tight">R$ {reward}</div>
            </div>
            <div className="text-right">
              <div className="text-xs opacity-80">Impacto</div>
              <div className="text-xl font-bold">+{points} pts</div>
              <div className="text-[11px] opacity-80">{water.toLocaleString("pt-BR")}L de água protegidos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md sm:max-w-lg md:max-w-2xl px-5 pt-3 pb-5 safe-bottom bg-gradient-to-t from-background via-background to-transparent z-30">
        <button
          disabled={!canSubmit}
          onClick={() => navigate({ to: "/processing", search: { l: liters, p: phone } as any })}
          className="w-full h-14 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-base shadow-elevated active:scale-[0.98] transition disabled:opacity-50"
        >
          Confirmar coleta • R$ {reward}
        </button>
      </div>
    </MobileShell>
  );
}
