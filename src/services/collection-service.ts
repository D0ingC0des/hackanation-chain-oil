import { supabase } from "@/lib/supabase";

export interface OilCollection {
  citizen_phone: string;
  reward_brl: number;
  collected_at: string;
  liters: number;
  photo_url?: string;
  tx_hash?: string;
  pix_status?: string;
}

export interface CollectionHistoryItem {
  citizenPhone: string;
  reward: number;
  collectedAt: string;
  liters: number;
  photoUrl?: string;
  txHash?: string;
  pixStatus?: string;
}

export interface CollectionStats {
  totalLiters: number;
  totalRewards: number;
  totalCollections: number;
}

function formatPhoneBr(phone: string) {
  return phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
}

export async function getCollectionHistory(operatorKey: string): Promise<CollectionHistoryItem[]> {
  const { data, error } = await supabase
    .from("oil_collections")
    .select("citizen_phone, reward_brl, collected_at, liters, photo_url, tx_hash, pix_status")
    .eq("operator_key", operatorKey)
    .order("collected_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data as OilCollection[]).map((item) => ({
    citizenPhone: formatPhoneBr(item.citizen_phone),
    reward: Number(item.reward_brl),
    collectedAt: item.collected_at,
    liters: Number(item.liters),
    photoUrl: item.photo_url,
    txHash: item.tx_hash,
    pixStatus: item.pix_status,
  }));
}

export async function getMyStats(operatorKey: string): Promise<CollectionStats> {
  const { data, error } = await supabase
    .from("oil_collections")
    .select("liters, reward_brl")
    .eq("operator_key", operatorKey);

  if (error) {
    throw error;
  }

  const collections = data as OilCollection[];

  const totalLiters = collections.reduce(
    (acc: number, item: OilCollection) => acc + Number(item.liters),
    0,
  );

  const totalRewards = collections.reduce(
    (acc: number, item: OilCollection) => acc + Number(item.reward_brl),
    0,
  );

  return {
    totalLiters,
    totalRewards,
    totalCollections: collections.length,
  };
}
