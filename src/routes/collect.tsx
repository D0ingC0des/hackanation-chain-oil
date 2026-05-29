import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { BlurredHeroBg } from "@/components/BlurredHeroBg";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { ChevronLeft, Droplet, Leaf, Sparkles, User, Zap } from "lucide-react";
import { PhotoCapture } from "@/components/pages/collect/photo-capture";
import { useRate } from "@/hooks/use-rate";
import { type PixType } from "@/services/collection-service";

export const Route = createFileRoute("/collect")({
  component: CollectPage,
  head: () => ({
    meta: [
      { title: "Nova coleta — ChainOil" },
      {
        name: "description",
        content:
          "Registre uma coleta de óleo em menos de 15 segundos e gere recompensa instantânea para o cidadão.",
      },
    ],
  }),
});

const PIX_OPTIONS: { type: PixType; label: string; placeholder: string }[] = [
  { type: "PHONE", label: "Celular", placeholder: "(11) 90000-0000" },
  { type: "CPF", label: "CPF", placeholder: "000.000.000-00" },
  { type: "EMAIL", label: "E-mail", placeholder: "cidadao@email.com" },
];

const PIX_LABELS: Record<PixType, string> = {
  PHONE: "Celular do cidadão",
  CPF: "CPF do cidadão",
  EMAIL: "E-mail do cidadão",
};

function CollectPage() {
  useAuthGuard();
  const navigate = useNavigate();
  const { rate } = useRate();
  const [pixType, setPixType] = useState<PixType>("PHONE");
  const [pixKey, setPixKey] = useState("");
  const [liters, setLiters] = useState<number>(0);
  const [photo, setPhoto] = useState<string | null>(null);

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const formatCPF = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  };

  function handlePixKeyChange(raw: string) {
    if (pixType === "PHONE") setPixKey(formatPhone(raw));
    else if (pixType === "CPF") setPixKey(formatCPF(raw));
    else setPixKey(raw);
  }

  const reward = useMemo(() => (liters * rate).toFixed(2).replace(".", ","), [liters, rate]);
  const water = liters * 1000;
  const co2 = (liters * 1.5).toFixed(1);

  const canSubmit = useMemo(() => {
    if (liters <= 0) return false;
    if (pixType === "PHONE") return pixKey.replace(/\D/g, "").length >= 10;
    if (pixType === "CPF") return pixKey.replace(/\D/g, "").length === 11;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pixKey);
  }, [pixKey, pixType, liters]);

  function handleConfirm() {
    if (photo) {
      sessionStorage.setItem("chainoil_pending_photo", photo);
    } else {
      sessionStorage.removeItem("chainoil_pending_photo");
    }
    navigate({
      to: "/processing",
      search: { l: liters, p: pixKey, t: pixType } as { l: number; p: string; t: PixType },
    });
  }

  return (
    <div className="relative">
      <BlurredHeroBg />
      <MobileShell transparentBg>
        {/* ── Mobile header ── */}
        <header className="lg:hidden px-5 pt-6 pb-4 flex items-center justify-between bg-background/90 backdrop-blur-sm border-b border-border">
          <Link
            to="/"
            className="size-10 rounded-full bg-card border border-border flex items-center justify-center shadow-soft"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <h1 className="text-base font-semibold">Nova coleta</h1>
          <div className="size-10" />
        </header>

        {/* ── Desktop header ── */}
        <div className="hidden lg:block px-8 pt-6 pb-4 mx-4 mt-4 mb-0 rounded-2xl bg-background/70 backdrop-blur-md border border-border/40">
          <h1 className="text-2xl font-extrabold tracking-tight">Nova coleta</h1>
          <p className="text-foreground/80 text-sm mt-0.5">
            Registre o óleo coletado e gere a recompensa instantânea.
          </p>
        </div>

        {/* ── Two-column on desktop ── */}
        <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8 lg:px-8 lg:pt-6">
          {/* LEFT: form */}
          <div className="px-5 lg:px-0 pt-2 lg:pt-0 space-y-3">
            {/* PIX key */}
            <div className="bg-card rounded-3xl p-4 shadow-soft border border-border space-y-3">
              {/* Seletor de tipo */}
              <div className="flex gap-2">
                {PIX_OPTIONS.map(({ type, label }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setPixType(type);
                      setPixKey("");
                    }}
                    className={`flex-1 h-9 rounded-xl text-sm font-semibold border transition ${
                      pixType === type
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary border-border text-foreground hover:border-primary/40"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Input dinâmico */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <User className="size-3.5" /> {PIX_LABELS[pixType]}
                </label>
                <input
                  type={pixType === "EMAIL" ? "email" : "text"}
                  inputMode={pixType === "EMAIL" ? "email" : "numeric"}
                  placeholder={PIX_OPTIONS.find((o) => o.type === pixType)?.placeholder}
                  value={pixKey}
                  onChange={(e) => handlePixKeyChange(e.target.value)}
                  className="mt-2 w-full h-12 px-4 rounded-2xl bg-secondary text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Liters */}
            <div className="bg-card rounded-3xl p-4 shadow-soft border border-border">
              <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <Droplet className="size-3.5" /> Litros coletados
              </label>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setLiters((l) => Math.max(0, +(l - 0.5).toFixed(1)))}
                  className="size-14 rounded-2xl bg-secondary text-2xl font-bold active:scale-95 transition"
                  aria-label="Diminuir"
                >
                  −
                </button>
                <div className="flex-1 text-center">
                  <div className="text-5xl font-extrabold tracking-tight">
                    {liters}
                    <span className="text-2xl text-muted-foreground ml-1">L</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLiters((l) => +(l + 0.5).toFixed(1))}
                  className="size-14 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold active:scale-95 transition"
                  aria-label="Aumentar"
                >
                  +
                </button>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {[1, 2, 5, 10].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setLiters(v)}
                    className={`h-10 rounded-xl text-sm font-semibold border transition ${
                      liters === v
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary border-border text-foreground"
                    }`}
                  >
                    {v}L
                  </button>
                ))}
              </div>
            </div>

            {/* Photo */}
            <PhotoCapture photo={photo} onPhoto={setPhoto} />

            {/* Mobile: reward preview + CTA inline */}
            <div className="lg:hidden space-y-3 pb-4">
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
                    <div className="text-[11px] opacity-80">
                      {water.toLocaleString("pt-BR")}L de água protegidos
                    </div>
                  </div>
                </div>
              </div>
              <button
                disabled={!canSubmit}
                onClick={handleConfirm}
                className="w-full h-14 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-base shadow-elevated active:scale-[0.98] transition disabled:opacity-50"
              >
                Confirmar coleta • R$ {reward}
              </button>
            </div>
          </div>

          {/* RIGHT: desktop reward preview + CTA (sticky) */}
          <div className="hidden lg:flex lg:flex-col">
            <div className="sticky top-24 space-y-4">
              {/* Reward card */}
              <div className="rounded-3xl p-4 bg-gradient-reward shadow-reward text-reward-foreground">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-2">
                  <Sparkles className="size-4" /> Recompensa instantânea
                </div>
                <div className="text-xs opacity-80">Valor via PIX</div>
                <div className="text-4xl font-extrabold tracking-tight mt-0.5">R$ {reward}</div>
                <div className="mt-2 text-xs">
                  <div className="bg-white/15 rounded-2xl p-2.5">
                    <div className="font-bold text-sm">{water.toLocaleString("pt-BR")}L</div>
                    <div className="opacity-80">água protegida</div>
                  </div>
                </div>
              </div>

              {/* ESG card */}
              <div className="rounded-3xl p-4 bg-card border border-border shadow-soft space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Impacto ambiental
                </div>
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Zap className="size-3.5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">{co2}kg CO₂ evitado</div>
                    <div className="text-xs text-muted-foreground">{liters * 3} dias de carro</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-xl bg-emerald/10 flex items-center justify-center">
                    <Leaf className="size-3.5 text-emerald" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">Óleo reutilizado</div>
                    <div className="text-xs text-muted-foreground">Não vai para esgoto ou rios</div>
                  </div>
                </div>
              </div>

              {/* Desktop CTA */}
              <button
                disabled={!canSubmit}
                onClick={handleConfirm}
                className="w-full h-14 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-base shadow-elevated hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50"
              >
                Confirmar coleta • R$ {reward}
              </button>
            </div>
          </div>
        </div>
      </MobileShell>
    </div>
  );
}
