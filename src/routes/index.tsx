import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { ShieldCheck, Sparkles, Leaf, AlertCircle } from "lucide-react";
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setError("");
    setLoading(true);

    const phoneRaw = phone.replace(/\D/g, "");
    const session = login(phoneRaw, pin);

    if (session) {
      setTimeout(() => {
        navigate({ to: "/collect" });
      }, 600);
    } else {
      setLoading(false);
      setError("Telefone ou PIN incorretos.");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-hero flex flex-col">
      <div className="relative px-5 pt-8 pb-6">
        <Logo />
      </div>

      <section className="px-5">
        <div className="relative overflow-hidden rounded-3xl shadow-elevated aspect-[16/10] bg-secondary">
          <img
            src={heroImg}
            alt="Comunidade trocando óleo de cozinha por recompensa digital"
            width={1280}
            height={1024}
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 text-primary-foreground">
            <Sparkles className="size-4" />
            <span className="text-xs font-semibold tracking-wide">
              +12.480 litros reciclados este mês
            </span>
          </div>
        </div>
      </section>

      <section className="px-5 mt-7">
        <h1 className="text-3xl font-extrabold tracking-tight leading-tight">
          Recicle óleo.<br />
          <span className="text-primary">Receba na hora.</span>
        </h1>
        <p className="mt-2 text-muted-foreground text-[15px]">
          Acesse sua conta de parceiro e transforme óleo em renda e impacto.
        </p>
      </section>

      <form
        className="px-5 mt-6 space-y-3"
        onSubmit={handleSubmit}
      >
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Celular</span>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="(11) 90000-0000"
            value={phone}
            onChange={(e) => {
              setPhone(formatPhone(e.target.value));
              if (error) setError("");
            }}
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
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, ""));
              if (error) setError("");
            }}
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

      <div className="mt-auto px-5 py-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Leaf className="size-3.5 text-emerald" />
        ChainOil • Economia verde para a sua comunidade
      </div>
    </main>
  );
}
