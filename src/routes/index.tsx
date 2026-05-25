import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { ShieldCheck, Sparkles, Leaf, AlertCircle, Droplets, Recycle, Zap } from "lucide-react";
import { login } from "@/lib/auth";
import heroImg from "@/assets/hero-community.jpg";

export const Route = createFileRoute("/")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Entrar — ChainOil" },
      { name: "description", content: "Acesse sua conta de parceiro ChainOil e comece a transformar óleo em renda e impacto." },
    ],
  }),
});

const FEATURES = [
  { icon: Zap, label: "PIX instantâneo", desc: "R$ 1,20 por litro direto na conta" },
  { icon: Droplets, label: "1.000L de água protegidos", desc: "Por cada litro de óleo coletado" },
  { icon: Recycle, label: "Tokens OIL na Solana", desc: "Recompensas em blockchain por coleta" },
];

function LoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const valid = phone.replace(/\D/g, "").length >= 10 && pin.length === 4;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setError("");
    setLoading(true);
    const phoneRaw = phone.replace(/\D/g, "");
    const session = await login(phoneRaw, pin);
    if (session) {
      navigate({ to: "/collect" });
    } else {
      setLoading(false);
      setError("Telefone ou PIN incorretos.");
    }
  };

  return (
    <main className="min-h-screen flex flex-col lg:flex-row">

      {/* ── LEFT: hero marketing (desktop only) ── */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-between bg-gradient-hero px-14 py-12">
        <Logo />

        <div className="max-w-md">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-semibold mb-6">
            <Sparkles className="size-3.5" />
            +12.480 litros reciclados este mês
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight leading-tight">
            Recicle óleo.<br />
            <span className="text-primary">Receba na hora.</span>
          </h1>
          <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
            Conectamos parceiros locais a cidadãos que transformam óleo de cozinha usado em renda e impacto ambiental real.
          </p>

          <div className="mt-10 space-y-4">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-4">
                <div className="size-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="size-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{label}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl shadow-elevated aspect-[16/9]">
          <img
            src={heroImg}
            alt="Comunidade trocando óleo de cozinha por recompensa digital"
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent" />
          <div className="absolute bottom-4 left-4 flex items-center gap-2 text-primary-foreground text-xs font-semibold">
            <Sparkles className="size-3.5" />
            Tecnologia Solana • Impacto real • PIX instantâneo
          </div>
        </div>
      </div>

      {/* ── RIGHT: login form panel ── */}
      <div className="flex flex-col flex-1 bg-background lg:max-w-[480px] lg:border-l lg:border-border">

        {/* Mobile-only header */}
        <div className="lg:hidden bg-gradient-hero">
          <div className="px-5 pt-8 pb-4">
            <Logo />
          </div>
          <section className="px-5 pb-4">
            <div className="relative overflow-hidden rounded-3xl shadow-elevated aspect-[16/10] bg-secondary">
              <img
                src={heroImg}
                alt="Comunidade trocando óleo de cozinha por recompensa digital"
                className="absolute inset-0 size-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 text-primary-foreground">
                <Sparkles className="size-4" />
                <span className="text-xs font-semibold tracking-wide">+12.480 litros reciclados este mês</span>
              </div>
            </div>
          </section>
          <section className="px-5 pb-6">
            <h1 className="text-3xl font-extrabold tracking-tight leading-tight">
              Recicle óleo.<br />
              <span className="text-primary">Receba na hora.</span>
            </h1>
            <p className="mt-2 text-muted-foreground text-[15px]">
              Acesse sua conta de parceiro e transforme óleo em renda e impacto.
            </p>
          </section>
        </div>

        {/* Form */}
        <div className="flex flex-col flex-1 justify-center px-5 lg:px-12 py-8">
          <div className="hidden lg:block mb-8">
            <Logo />
            <h2 className="mt-6 text-2xl font-extrabold tracking-tight">Entrar na plataforma</h2>
            <p className="mt-1 text-muted-foreground text-sm">Acesse com seu celular e PIN de operador.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Celular</span>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="(11) 90000-0000"
                value={phone}
                onChange={(e) => { setPhone(formatPhone(e.target.value)); if (error) setError(""); }}
                className="mt-1 w-full h-14 px-4 rounded-2xl bg-card border border-border text-lg font-medium focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Código PIN</span>
              <input
                type="password"
                inputMode="numeric"
                placeholder="• • • •"
                maxLength={4}
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); if (error) setError(""); }}
                className="mt-1 w-full h-14 px-4 rounded-2xl bg-card border border-border text-lg tracking-[0.5em] text-center font-bold focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!valid || loading}
              className="w-full h-14 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-base shadow-soft active:scale-[0.98] transition disabled:opacity-50"
            >
              {loading ? "Entrando…" : "Entrar na plataforma"}
            </button>

            <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-primary" />
              Conexão segura • Dados protegidos
            </div>
          </form>
        </div>

        <div className="px-5 lg:px-12 pb-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Leaf className="size-3.5 text-primary" />
          ChainOil • Economia verde para a sua comunidade
        </div>
      </div>
    </main>
  );
}
