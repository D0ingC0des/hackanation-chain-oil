import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Logo } from "@/components/Logo";
import { Building2, CheckCircle2, Loader2 } from "lucide-react";
import { createProfile } from "@/services/profileService";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
  head: () => ({
    meta: [
      { title: "Criar perfil — ChainOil" },
      { name: "description", content: "Complete seu cadastro para começar a reciclar óleo." },
    ],
  }),
});

function maskCep(v: string) {
  return v.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2").slice(0, 9);
}

interface FormState {
  business_name: string;
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

const INPUT_CLASS =
  "w-full h-12 rounded-2xl bg-card border border-border px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition";

function OnboardingPage() {
  const navigate = useNavigate();
  const { connected, connecting, publicKey } = useWallet();
  const [form, setForm] = useState<FormState>({
    business_name: "",
    cep: "",
    street: "",
    neighborhood: "",
    city: "",
    state: "",
  });
  const [cepLoading, setCepLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!connecting && !connected) navigate({ to: "/", replace: true });
  }, [connected, connecting, navigate]);

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCepBlur() {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((f) => ({
          ...f,
          street: data.logradouro ?? "",
          neighborhood: data.bairro ?? "",
          city: data.localidade ?? "",
          state: data.uf ?? "",
        }));
      }
    } catch {
      // ViaCEP indisponível
    } finally {
      setCepLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey) return;
    setError("");
    setSubmitting(true);
    try {
      await createProfile({
        public_key: publicKey.toBase58(),
        name: form.business_name.trim(),
        email: "",
        phone: "",
        business_name: form.business_name.trim(),
        cnpj: null,
        cep: form.cep.replace(/\D/g, ""),
        street: form.street || null,
        neighborhood: form.neighborhood || null,
        city: form.city,
        state: form.state,
      });
      navigate({ to: "/collect" });
    } catch {
      setError("Erro ao salvar perfil. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = !!form.business_name.trim() && !!form.city;

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Logo />
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight">Complete seu perfil</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Informe o nome do estabelecimento e o CEP para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Nome do estabelecimento<span className="text-destructive ml-0.5">*</span>
            </label>
            <input
              type="text"
              value={form.business_name}
              onChange={(e) => set("business_name", e.target.value)}
              placeholder="Igreja Batista Central"
              required
              className={INPUT_CLASS}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              CEP do estabelecimento<span className="text-destructive ml-0.5">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={form.cep}
                onChange={(e) => set("cep", maskCep(e.target.value))}
                onBlur={handleCepBlur}
                placeholder="87000-000"
                required
                className={INPUT_CLASS}
              />
              {cepLoading && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
              )}
            </div>
          </div>

          {(form.city || form.street) && (
            <div className="rounded-2xl bg-secondary/60 border border-border px-4 py-3 text-sm space-y-0.5">
              {form.street && (
                <p className="font-medium">
                  {form.street}
                  {form.neighborhood ? `, ${form.neighborhood}` : ""}
                </p>
              )}
              <p className="text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                {form.city}
                {form.state ? ` — ${form.state}` : ""}
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className="w-full h-14 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-base shadow-soft active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {submitting ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                <Building2 className="size-5" />
                Salvar e continuar
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
