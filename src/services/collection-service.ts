import { createClient } from "@supabase/supabase-js";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

export type CollectionHistoryItem = {
  citizenPhone: string;
  reward: number;
  collectedAt: string;
  liters: number;
  photoUrl: string | null;
  txHash: string | null;
  pixStatus: string | null;
};

function formatPhoneBr(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export async function getCollectionHistory(operatorKey: string): Promise<CollectionHistoryItem[]> {
  const { data, error } = await supabase
    .from("oil_collections")
    .select("citizen_phone, reward_brl, collected_at, liters, photo_url, tx_hash, pix_status")
    .eq("operator_key", operatorKey)
    .order("collected_at", { ascending: false });

  if (error) throw error;
  if (!Array.isArray(data)) return [];

  return data.map((item) => ({
    citizenPhone: formatPhoneBr(item.citizen_phone),
    reward: Number(item.reward_brl),
    collectedAt: item.collected_at,
    liters: Number(item.liters),
    photoUrl: item.photo_url,
    txHash: item.tx_hash,
    pixStatus: item.pix_status,
  }));
}

export async function processCollection(params: {
  operatorKey: string;
  citizenPhone: string;
  liters: number;
  txHash?: string;
  collectionId: string;
}): Promise<{ collectionId: string }> {
  const { error } = await supabase.from("oil_collections").insert({
    id: params.collectionId,
    operator_key: params.operatorKey,
    citizen_phone: params.citizenPhone,
    liters: params.liters,
    tx_hash: params.txHash ?? null,
    pix_status: "pending",
  });

  if (error) throw error;

  return { collectionId: params.collectionId };
}

export async function uploadCollectionPhoto(
  collectionId: string,
  operatorKey: string,
  photoBase64: string,
): Promise<void> {
  const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, "");
  const byteArray = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
  const fileName = `${operatorKey}/${collectionId}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("collection-photos")
    .upload(fileName, byteArray, { contentType: "image/jpeg", upsert: true });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from("collection-photos").getPublicUrl(fileName);

  const { error: updateError } = await supabase
    .from("oil_collections")
    .update({ photo_url: urlData.publicUrl })
    .eq("id", collectionId);

  if (updateError) throw updateError;
}
