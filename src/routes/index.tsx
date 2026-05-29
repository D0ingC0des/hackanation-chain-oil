import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  ShieldCheck,
  Sparkles,
  Leaf,
  Droplets,
  Recycle,
  Zap,
  Wallet,
  ExternalLink,
  X,
} from "lucide-react";
import heroImg from "@/assets/hero-community.jpg";
import { Logo } from "@/components/Logo";
import { getProfile, touchWalletLogin } from "@/services/profileService";
import { useRate } from "@/hooks/use-rate";

const WALLET_TUTORIAL_URL =
  "https://www.youtube.com/results?search_query=como+criar+carteira+phantom+solana";

export const Route = createFileRoute("/")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Entrar — ChainOil" },
      {
        name: "description",
        content: "Conecte sua carteira Solana e comece a transformar óleo em renda e impacto.",
      },
    ],
  }),
});

const STATIC_FEATURES = [
  { icon: Droplets, label: "1.000L de água protegidos", desc: "Por cada litro de óleo coletado" },
  { icon: Recycle, label: "Tokens OIL na Solana", desc: "Recompensas em blockchain por coleta" },
];

const WALLETS = [
  {
    name: "Phantom",
    desc: "A carteira mais popular da Solana",
    desktopUrl: "https://phantom.app/download",
    mobileUrl: "https://phantom.app/download",
    icon: "👻",
  },
  {
    name: "Solflare",
    desc: "Carteira nativa Solana, alternativa confiável",
    desktopUrl: "https://solflare.com/download",
    mobileUrl: "https://solflare.com/download",
    icon: "🔥",
  },
];

function LoginPage() {
  const navigate = useNavigate();
  const { wallets, wallet, select, connect, connecting, connected, publicKey } = useWallet();
  const { rate } = useRate();
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [pendingConnect, setPendingConnect] = useState(false);

  const features = [
    {
      icon: Zap,
      label: "PIX instantâneo",
      desc: `R$ ${rate.toFixed(2).replace(".", ",")} por litro direto na conta`,
    },
    ...STATIC_FEATURES,
  ];

  useEffect(() => setMounted(true), []);

  // Wallet detection only runs client-side — gate behind mounted to avoid SSR mismatch
  const SUPPORTED = ["Phantom", "Solflare"];
  const installedWallets = mounted
    ? wallets.filter((w) => w.readyState === "Installed" && SUPPORTED.includes(w.adapter.name))
    : [];
  const hasWallet = installedWallets.length > 0;

  useEffect(() => {
    if (connecting || connected) setError("");
  }, [connecting, connected]);

  // connect() só pode ser chamado APÓS select() propagar no contexto React
  useEffect(() => {
    if (!pendingConnect || !wallet) return;
    setPendingConnect(false);
    connect().catch(() => setError("Não foi possível conectar. Tente novamente."));
  }, [pendingConnect, wallet, connect]);

  useEffect(() => {
    if (connected && publicKey) {
      getProfile(publicKey.toBase58()).then((profile) => {
        if (profile) touchWalletLogin(publicKey.toBase58()).catch(() => {});
        navigate({ to: profile ? "/collect" : "/onboarding" });
      });
    }
  }, [connected, publicKey, navigate]);

  function handleConnect() {
    setError("");
    if (!hasWallet) {
      setShowInstallGuide(true);
      return;
    }
    if (!installedWallets[0]) return;
    select(installedWallets[0].adapter.name);
    setPendingConnect(true);
  }

  return (
    <main className="min-h-screen flex flex-col lg:flex-row">
      {/* ── LEFT: hero marketing (desktop only) ── */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-between bg-gradient-hero px-12 py-5">
        <Logo />

        <div className="max-w-md">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold mb-3">
            <Sparkles className="size-3.5" />
            +12.480 litros reciclados este mês
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            Recicle óleo.
            <br />
            <span className="text-primary">Receba na hora.</span>
          </h1>
          <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
            Conectamos parceiros locais a cidadãos que transformam óleo de cozinha usado em renda e
            impacto ambiental real.
          </p>

          <div className="mt-4 space-y-2">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="size-4 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{label}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl shadow-elevated aspect-[16/5]">
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

      {/* ── RIGHT: connect panel ── */}
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
                <span className="text-xs font-semibold tracking-wide">
                  +12.480 litros reciclados este mês
                </span>
              </div>
            </div>
          </section>
          <section className="px-5 pb-6">
            <h1 className="text-3xl font-extrabold tracking-tight leading-tight">
              Recicle óleo.
              <br />
              <span className="text-primary">Receba na hora.</span>
            </h1>
            <p className="mt-2 text-muted-foreground text-[15px]">
              Conecte sua carteira Solana para acessar a plataforma.
            </p>
          </section>
        </div>

        {/* Connect form */}
        <div className="flex flex-col flex-1 justify-center px-5 lg:px-12 py-5">
          <div className="hidden lg:block mb-6">
            <Logo />
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight">Entrar na plataforma</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Conecte sua carteira Solana para continuar.
            </p>
          </div>

          {!showInstallGuide ? (
            <div className="space-y-3">
              {/* Wallets detectadas */}
              {hasWallet && (
                <div className="space-y-2 mb-2">
                  {installedWallets.map((w) => (
                    <button
                      key={w.adapter.name}
                      type="button"
                      onClick={() => {
                        setError("");
                        select(w.adapter.name);
                        setPendingConnect(true);
                      }}
                      className="w-full h-12 flex items-center gap-3 px-4 rounded-2xl bg-card border border-border hover:border-primary/50 transition font-semibold text-sm"
                    >
                      {w.adapter.icon && (
                        <img
                          src={w.adapter.icon}
                          alt={w.adapter.name}
                          className="size-6 rounded-lg"
                        />
                      )}
                      <span className="flex-1 text-left">Conectar {w.adapter.name}</span>
                      <Wallet className="size-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              {/* Botão principal */}
              <button
                type="button"
                onClick={handleConnect}
                disabled={connecting}
                className="w-full h-12 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-base shadow-soft active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Wallet className="size-5" />
                {connecting ? "Conectando…" : hasWallet ? "Conectar carteira" : "Instalar carteira"}
              </button>

              {error && <p className="text-sm text-destructive text-center">{error}</p>}

              <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 text-primary" />
                Conexão segura • Sem custódia de chaves
              </div>
            </div>
          ) : (
            /* Guia de instalação */
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-base">Instale uma carteira Solana</h3>
                <button
                  type="button"
                  onClick={() => setShowInstallGuide(false)}
                  className="size-8 rounded-full bg-secondary flex items-center justify-center"
                >
                  <X className="size-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                Uma carteira Solana é necessária para acessar a plataforma. É gratuita e leva menos
                de 2 minutos para criar.
              </p>
              <div className="flex items-center gap-3 text-sm">
                <a
                  href={WALLET_TUTORIAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline"
                >
                  <ExternalLink className="size-3.5" />
                  Ver tutorial em vídeo
                </a>
                <span className="text-muted-foreground/40">•</span>
                <Link
                  to="/ajuda"
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition"
                >
                  Guia passo a passo
                </Link>
              </div>

              {WALLETS.map((w) => (
                <a
                  key={w.name}
                  href={w.desktopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/50 transition"
                >
                  <div className="size-12 rounded-2xl bg-secondary flex items-center justify-center text-2xl">
                    {w.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{w.name}</div>
                    <div className="text-xs text-muted-foreground">{w.desc}</div>
                  </div>
                  <ExternalLink className="size-4 text-muted-foreground shrink-0" />
                </a>
              ))}

              <p className="text-xs text-muted-foreground text-center pt-2">
                Após instalar, volte aqui e clique em "Conectar carteira".
              </p>
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="w-full h-12 rounded-2xl bg-secondary text-foreground font-semibold text-sm"
              >
                Já instalei — Voltar
              </button>
            </div>
          )}
        </div>

        <div className="px-5 lg:px-12 pb-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Leaf className="size-3.5 text-primary" />
          ChainOil • Economia verde para a sua comunidade
        </div>
      </div>
    </main>
  );
}
