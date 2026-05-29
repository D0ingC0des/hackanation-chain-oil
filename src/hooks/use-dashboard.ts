import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  getMyStats,
  getMyHistory,
  type CollectionStats,
  type CollectionRecord,
} from "@/services/collection-service";

const EMPTY: CollectionStats = { totalLiters: 0, totalPix: 0 };

export function useDashboard() {
  const { publicKey } = useWallet();
  const [stats, setStats] = useState<CollectionStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicKey) return;
    getMyStats(publicKey.toBase58())
      .then(setStats)
      .finally(() => setLoading(false));
  }, [publicKey]);

  return {
    loading,
    totalLiters: stats.totalLiters,
    totalWaterL: Math.round(stats.totalLiters * 1000),
    totalCo2Kg: stats.totalLiters * 1.5,
    totalPixBrl: stats.totalPix,
  };
}

export function useCollectionHistory() {
  const { publicKey } = useWallet();
  const [history, setHistory] = useState<CollectionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicKey) return;
    getMyHistory(publicKey.toBase58())
      .then(setHistory)
      .finally(() => setLoading(false));
  }, [publicKey]);

  return { history, loading };
}
