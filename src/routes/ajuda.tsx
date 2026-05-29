import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Chrome,
  KeyRound,
  ShieldCheck,
  Wallet,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/ajuda")({
  component: AjudaPage,
  head: () => ({
    meta: [
      { title: "Como criar sua carteira — ChainOil" },
      {
        name: "description",
        content: "Guia passo a passo para instalar e criar uma carteira Phantom na Solana.",
      },
    ],
  }),
});

const PHANTOM_DOWNLOAD_URL = "https://phantom.app/download";
const PHANTOM_CHROME_URL =
  "https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa";

const STEPS = [
  {
    number: 1,
    icon: Chrome,
    title: "Instale a extensão Phantom",
    description:
      'Acesse phantom.app/download e clique em "Adicionar ao Chrome" (ou Firefox/Brave). Confirme a instalação na Chrome Web Store.',
    tip: "O ícone 👻 aparecerá na barra de extensões do seu navegador.",
    href: PHANTOM_CHROME_URL,
    linkLabel: "Abrir Chrome Web Store",
    color: "bg-primary/10 text-primary",
  },
  {
    number: 2,
    icon: Wallet,
    title: "Crie uma nova carteira",
    description:
      'Clique no ícone do Phantom na barra de extensões. Na tela inicial, selecione "Create a new wallet" para criar uma carteira do zero.',
    tip: 'Se já tiver uma carteira, escolha "I already have a wallet" para importar.',
    color: "bg-water/15 text-water",
  },
  {
    number: 3,
    icon: KeyRound,
    title: "Defina sua senha",
    description:
      "Crie uma senha forte (mínimo 8 caracteres). Esta senha desbloqueia o Phantom neste dispositivo — não é possível recuperá-la, guarde-a em local seguro.",
    tip: "Use uma combinação de letras maiúsculas, minúsculas, números e símbolos.",
    color: "bg-reward/20 text-reward-foreground",
  },
  {
    number: 4,
    icon: ShieldCheck,
    title: "Anote sua Frase Secreta",
    description:
      "O Phantom exibirá 12 palavras únicas (Secret Recovery Phrase). Anote-as em papel na ordem correta e guarde em local físico seguro. NUNCA compartilhe com ninguém.",
    tip: "Essas 12 palavras são a única forma de recuperar sua carteira em outro dispositivo.",
    color: "bg-destructive/10 text-destructive",
    important: true,
  },
  {
    number: 5,
    icon: CheckCircle2,
    title: "Confirme e pronto!",
    description:
      "O Phantom pedirá para confirmar algumas palavras da frase secreta na ordem correta. Após confirmar, sua carteira estará criada e pronta para usar no ChainOil.",
    tip: 'Volte ao app, clique em "Conectar carteira" e selecione Phantom.',
    color: "bg-success/15 text-success",
  },
];

function AjudaPage() {
  return (
    <div className="min-h-screen bg-secondary/30">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition -ml-1"
          >
            <ArrowLeft className="size-4" />
            Voltar ao app
          </Link>
          <Logo />
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight">Como criar sua carteira Solana</h1>
          <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
            Siga os passos abaixo para instalar o Phantom e criar sua primeira carteira em menos de
            2 minutos. É gratuito e seguro.
          </p>
          <a
            href={PHANTOM_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-soft"
          >
            <ExternalLink className="size-4" />
            Baixar Phantom
          </a>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {STEPS.map((step) => (
            <StepCard key={step.number} step={step} />
          ))}
        </div>

        {/* Back button at bottom */}
        <div className="mt-10 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-card border border-border text-sm font-semibold hover:bg-secondary transition shadow-soft"
          >
            <ArrowLeft className="size-4" />
            Voltar ao app
          </Link>
        </div>
      </div>
    </div>
  );
}

function StepCard({ step }: { step: (typeof STEPS)[number] }) {
  const Icon = step.icon;
  return (
    <div
      className={`rounded-3xl bg-card/80 border ${step.important ? "border-destructive/30" : "border-border"} p-5 shadow-soft backdrop-blur-sm`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`shrink-0 size-12 rounded-2xl flex items-center justify-center ${step.color}`}
        >
          <Icon className="size-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Passo {step.number}
            </span>
            {step.important && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive uppercase tracking-wide">
                Importante
              </span>
            )}
          </div>
          <h2 className="font-bold text-base">{step.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{step.description}</p>

          {step.tip && (
            <p className="mt-2 text-xs text-muted-foreground/80 bg-secondary/60 rounded-xl px-3 py-2">
              💡 {step.tip}
            </p>
          )}

          {step.href && (
            <a
              href={step.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-xs text-primary font-semibold hover:underline"
            >
              <ExternalLink className="size-3" />
              {step.linkLabel}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
