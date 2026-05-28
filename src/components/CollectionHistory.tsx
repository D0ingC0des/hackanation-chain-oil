import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Loader2, Droplets, Calendar, Phone, Image as ImageIcon, Hash } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getCollectionHistory, getMyStats, type CollectionHistoryItem } from "@/services/collection-service";

export function CollectionHistory() {
  const { publicKey } = useWallet();
  const operatorKey = publicKey?.toBase58() ?? "";

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CollectionHistoryItem[]>([]);
  const [totalLiters, setTotalLiters] = useState(0);
  const [totalPix, setTotalPix] = useState(0);

  useEffect(() => {
    if (!operatorKey) return;
    setLoading(true);
    Promise.all([getCollectionHistory(operatorKey), getMyStats(operatorKey)])
      .then(([history, stats]) => {
        setItems(history);
        setTotalLiters(stats.totalLiters);
        setTotalPix(stats.totalPix);
      })
      .finally(() => setLoading(false));
  }, [operatorKey]);

  const fmtMoney = useMemo(
    () => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }),
    []
  );

  return (
    <div className="space-y-3">
      <Card className="rounded-3xl border-border shadow-soft">
        <div className="p-5 lg:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold tracking-tight">Histórico de coletas</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Suas coletas registradas (mais recentes primeiro).
              </p>
            </div>
            {loading && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-secondary/40 border border-border p-4">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                <Droplets className="size-3.5" />
                Total em litros
              </div>
              <div className="mt-2 text-2xl font-extrabold tracking-tight">
                {loading ? "—" : totalLiters.toLocaleString("pt-BR")}
                <span className="text-sm font-normal text-muted-foreground ml-1">L</span>
              </div>
            </div>

            <div className="rounded-2xl bg-secondary/40 border border-border p-4">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                <span className="font-bold">R$</span>
                Total pago
              </div>
              <div className="mt-2 text-2xl font-extrabold tracking-tight">
                {loading ? "—" : fmtMoney.format(totalPix)}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card className="rounded-3xl border-border shadow-soft">
          <div className="p-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Carregando histórico…
          </div>
        </Card>
      ) : items.length === 0 ? (
        <Card className="rounded-3xl border-border shadow-soft">
          <div className="p-6 text-center">
            <p className="text-sm font-semibold">Nenhuma coleta registrada ainda</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Quando você registrar uma coleta, ela aparecerá aqui.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((it, idx) => (
            <Card key={`${it.collected_at}-${idx}`} className="rounded-3xl border-border shadow-soft">
              <div className="p-5 lg:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold tracking-tight">
                      {it.reward_brl}
                      <span className="text-xs font-normal text-muted-foreground ml-2">
                        • {it.liters.toLocaleString("pt-BR")}L
                      </span>
                    </div>
                    <div className="mt-2 grid gap-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-3.5" />
                        {it.collected_at}
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="size-3.5" />
                        {it.citizen_phone}
                      </div>
                      {it.tx_hash && (
                        <div className="flex items-center gap-2">
                          <Hash className="size-3.5" />
                          <span className="font-mono break-all">{it.tx_hash}</span>
                        </div>
                      )}
                      {it.pix_status && (
                        <div className="flex items-center gap-2">
                          <span className="size-3.5 inline-block rounded-full bg-primary/20" />
                          PIX: <span className="font-semibold text-foreground/90">{it.pix_status}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {it.photo_url ? (
                      <a
                        href={it.photo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-2xl bg-secondary/40 border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary transition"
                      >
                        <ImageIcon className="size-3.5" />
                        Foto
                      </a>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-2xl bg-secondary/30 border border-border px-3 py-2 text-xs text-muted-foreground">
                        <ImageIcon className="size-3.5" />
                        Sem foto
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

