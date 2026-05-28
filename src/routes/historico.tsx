import { createFileRoute } from "@tanstack/react-router";
import { BlurredHeroBg } from "@/components/BlurredHeroBg";
import { MobileShell } from "@/components/MobileShell";
import { CollectionHistory } from "@/components/CollectionHistory";

export const Route = createFileRoute("/historico")({
  component: HistoricoPage,
  head: () => ({
    meta: [
      { title: "Histórico — ChainOil" },
      {
        name: "description",
        content: "Veja as coletas registradas e o total acumulado.",
      },
    ],
  }),
});

function HistoricoPage() {
  return (
    <div className="relative">
      <BlurredHeroBg />
      <MobileShell transparentBg>
        <div className="px-5 lg:px-8 pt-6 pb-4">
          <CollectionHistory />
        </div>
      </MobileShell>
    </div>
  );
}

