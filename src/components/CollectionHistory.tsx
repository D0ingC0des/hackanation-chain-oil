import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { getCollectionHistory, getMyStats } from "@/services/collection-service";

type Item = {
  citizen_phone: string;
  reward_brl: number;
  collected_at: string;
  liters: number;
  pix_status: string | null;
};

export function CollectionHistory() {
  const { publicKey } = useWallet();
  const operatorKey = publicKey?.toBase58() ?? "";

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalLiters, setTotalLiters] = useState(0);
  const [totalPix, setTotalPix] = useState(0);

  useEffect(() => {
    if (!operatorKey) return;
    setLoading(true);
    Promise.all([getCollectionHistory(operatorKey), getMyStats(operatorKey)]).then(
      ([history, stats]) => {
        setItems(history);
        setTotalLiters(stats.totalLiters);
        setTotalPix(stats.totalPix);
        setLoading(false);
      },
    );
  }, [operatorKey]);

  if (!operatorKey) return <p className="p-4">Conecte sua carteira para ver o histórico.</p>;
  if (loading) return <p className="p-4">Carregando...</p>;
  if (items.length === 0) return <p className="p-4">Nenhuma coleta encontrada.</p>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-4">
        <div className="p-3 rounded-lg bg-secondary">
          <p className="text-sm text-muted-foreground">Total coletado</p>
          <p className="font-bold">{totalLiters.toFixed(2)} L</p>
        </div>
        <div className="p-3 rounded-lg bg-secondary">
          <p className="text-sm text-muted-foreground">Total recebido</p>
          <p className="font-bold">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
              totalPix,
            )}
          </p>
        </div>
      </div>

      {items.map((item, i) => (
        <div key={i} className="p-3 rounded-lg border space-y-1">
          <div className="flex justify-between">
            <span className="text-sm">{item.citizen_phone}</span>
            <span className="text-sm font-bold">{item.reward_brl}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{item.liters} L</span>
            <span>{item.collected_at}</span>
          </div>
          {item.pix_status && <span className="text-xs">{item.pix_status}</span>}
        </div>
      ))}
    </div>
  );
}
