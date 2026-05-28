import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Droplets, MapPin, Recycle, ShieldCheck } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { BlurredHeroBg } from "@/components/BlurredHeroBg";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/ajuda")({
  component: HelpPage,
  head: () => ({
    meta: [
      { title: "Ajuda — ChainOil" },
      {
        name: "description",
        content:
          "Entenda como funciona a coleta de óleo usado, como registrar uma coleta e tire dúvidas frequentes.",
      },
    ],
  }),
});

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "O que é o ChainOil?",
    a: "O ChainOil conecta parceiros locais (pontos de coleta) a cidadãos que levam óleo de cozinha usado. O parceiro registra a coleta e o cidadão recebe a recompensa na hora, além do impacto ambiental ficar contabilizado.",
  },
  {
    q: "Que tipo de óleo pode ser coletado?",
    a: "Óleo de cozinha usado (ex.: soja, canola, girassol). Evite misturar com água, detergente ou restos de comida — isso melhora a qualidade para reciclagem.",
  },
  {
    q: "Como preparo o óleo para levar ao ponto de coleta?",
    a: "Espere esfriar, coe (se possível) e armazene em garrafa PET bem fechada. Leve ao parceiro mais próximo para registro.",
  },
  {
    q: "Onde encontro um ponto de coleta?",
    a: "Procure parceiros na sua região (mercados, escolas, igrejas e iniciativas locais). Se você for um parceiro, registre coletas diretamente no app.",
  },
  {
    q: "Por que não posso jogar óleo na pia?",
    a: "O óleo entope tubulações, aumenta o custo do tratamento de esgoto e pode contaminar rios e solo. A coleta correta ajuda a transformar o resíduo em reaproveitamento seguro (ex.: sabão, biodiesel).",
  },
  {
    q: "O app faz chamadas para banco de dados ou API nesta página?",
    a: "Não. Esta página é apenas informativa (estática) e funciona offline do ponto de vista de dados.",
  },
];

function HelpPage() {
  const router = useRouter();

  return (
    <div className="relative">
      <BlurredHeroBg />
      <MobileShell hideNav transparentBg className="pb-10">
        {/* Header */}
        <header className="px-5 pt-6 pb-4 flex items-center justify-between bg-gradient-hero">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="size-10 rounded-full bg-card border border-border flex items-center justify-center shadow-soft"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-base font-semibold">Ajuda</h1>
          <div className="size-10" />
        </header>

        <div className="px-5 lg:px-8 pt-4 space-y-4">
          {/* Intro */}
          <Card className="rounded-3xl border-border shadow-soft">
            <div className="p-5 lg:p-6">
              <h2 className="text-xl lg:text-2xl font-extrabold tracking-tight">Como funciona</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                O ChainOil é um app para{" "}
                <span className="font-semibold text-foreground">coleta de óleo usado</span>. Você
                leva o óleo de cozinha (já utilizado) até um parceiro. O parceiro registra os litros
                no app e a recompensa pode ser enviada na hora, enquanto o impacto ambiental da
                coleta fica contabilizado.
              </p>

              <Separator className="my-4" />

              <div className="grid gap-3 lg:grid-cols-3">
                <Step
                  icon={Droplets}
                  title="1) Armazene o óleo"
                  desc="Espere esfriar, coloque em garrafa PET e feche bem."
                />
                <Step
                  icon={MapPin}
                  title="2) Leve a um parceiro"
                  desc="Entregue no ponto de coleta mais próximo."
                />
                <Step
                  icon={Recycle}
                  title="3) Registre e gere impacto"
                  desc="O parceiro registra no app e o resíduo segue para reaproveitamento."
                />
              </div>
            </div>
          </Card>

          {/* Safety / tips */}
          <Card className="rounded-3xl border-border shadow-soft">
            <div className="p-5 lg:p-6">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="size-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold tracking-tight">Dicas rápidas</h3>
                  <ul className="mt-2 text-sm text-muted-foreground space-y-1 list-disc pl-5">
                    <li>Não misture óleo com água, detergente ou restos de comida.</li>
                    <li>Use garrafa PET bem fechada para evitar vazamentos.</li>
                    <li>Se possível, coe antes de armazenar.</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          {/* FAQ */}
          <Card className="rounded-3xl border-border shadow-soft">
            <div className="p-5 lg:p-6">
              <h2 className="text-lg lg:text-xl font-extrabold tracking-tight">
                Perguntas frequentes (FAQ)
              </h2>
              <div className="mt-4 space-y-3">
                {FAQ.map((item) => (
                  <div
                    key={item.q}
                    className="rounded-2xl bg-secondary/40 border border-border px-4 py-3"
                  >
                    <p className="text-sm font-semibold">{item.q}</p>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild className="rounded-2xl">
                  <Link to="/">Voltar ao início</Link>
                </Button>
                <Button asChild variant="secondary" className="rounded-2xl">
                  <Link to="/collect">Registrar uma coleta</Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </MobileShell>
    </div>
  );
}

function Step({ icon: Icon, title, desc }: { icon: typeof Droplets; title: string; desc: string }) {
  return (
    <div className="rounded-3xl bg-card border border-border p-4 shadow-soft">
      <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Icon className="size-5 text-primary" />
      </div>
      <div className="mt-3 text-sm font-bold">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{desc}</div>
    </div>
  );
}
