/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase";

export interface ProcessCollectionInput {
  operatorKey: string;
  citizenPhone: string;
  liters: number;
  txHash?: string;
  collectionId?: string;
}

export interface ProcessCollectionResult {
  collectionId: string;
  pixId: string | null;
  pixStatus: string;
  rewardBrl: number;
}

export async function processCollection(
  input: ProcessCollectionInput,
): Promise<ProcessCollectionResult> {
  const { data, error } = await supabase.functions.invoke("process-collection", {
    body: input,
  });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error ?? "Falha ao processar coleta");
  return data as ProcessCollectionResult;
}

/** Converte dataUrl base64 em Blob para upload */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function uploadCollectionPhoto(
  collectionId: string,
  operatorKey: string,
  dataUrl: string,
): Promise<void> {
  const blob = dataUrlToBlob(dataUrl);
  const path = `${operatorKey}/${collectionId}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("collection-photos")
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from("collection-photos").getPublicUrl(path);

  const { error: updateError } = await (supabase as any)
    .from("oil_collections")
    .update({ photo_url: publicUrl })
    .eq("id", collectionId);

  if (updateError) throw updateError;
}

export interface CollectionInput {
  operatorKey: string;
  citizenPhone: string;
  liters: number;
  rewardBrl: number;
  rateUsed: number;
  photoUrl?: string;
}

export interface CollectionStats {
  totalLiters: number;
  totalPix: number;
}

function formatPhoneBr(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length < 10) return "(--) ----- ----";
  const ddd = d.slice(0, 2);
  const prefix = d.length === 11 ? d.slice(2, 7) : d.slice(2, 6);
  const suffix = d.length === 11 ? d.slice(7, 11) : d.slice(6, 10);
  return `(${ddd}) ${prefix}-${suffix}`;
}

export interface CollectionHistoryItem {
  citizen_phone: string; // formatted (never raw)
  reward_brl: string; // formatted currency
  collected_at: string; // formatted date
  liters: number;
  photo_url: string | null;
  tx_hash: string | null;
  pix_status: string | null;
}

export async function saveCollection(input: CollectionInput): Promise<void> {
  const { error } = await (supabase as any).from("oil_collections").insert({
    operator_key: input.operatorKey,
    citizen_phone: input.citizenPhone,
    liters: input.liters,
    reward_brl: input.rewardBrl,
    rate_used: input.rateUsed,
    photo_url: input.photoUrl ?? null,
  });
  if (error) throw error;
}

function sumRows(rows: Array<{ liters: string; reward_brl: string }>): CollectionStats {
  return rows.reduce(
    (acc, r) => ({
      totalLiters: acc.totalLiters + parseFloat(r.liters),
      totalPix: acc.totalPix + parseFloat(r.reward_brl),
    }),
    { totalLiters: 0, totalPix: 0 },
  );
}

export async function getMyStats(operatorKey: string): Promise<CollectionStats> {
  const { data, error } = await (supabase as any)
    .from("oil_collections")
    .select("liters, reward_brl")
    .eq("operator_key", operatorKey);
  if (error || !data) return { totalLiters: 0, totalPix: 0 };
  return sumRows(data);
}

export async function getCollectionHistory(operatorKey: string): Promise<CollectionHistoryItem[]> {
  const { data, error } = await (supabase as any)
    .from("oil_collections")
    .select("*")
    .eq("operator_key", operatorKey)
    .order("collected_at", { ascending: false });

  if (error || !data) return [];

  const fmtMoney = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  return (data as any[]).map((r) => ({
    citizen_phone: formatPhoneBr(String(r.citizen_phone ?? "")),
    reward_brl: fmtMoney.format(Number(r.reward_brl ?? 0)),
    collected_at: new Date(String(r.collected_at)).toLocaleDateString("pt-BR"),
    liters: Number(r.liters ?? 0),
    photo_url: r.photo_url ?? null,
    tx_hash: r.tx_hash ?? null,
    pix_status: r.pix_status ?? null,
  }));
}

export async function getGlobalStats(): Promise<CollectionStats> {
  const { data, error } = await (supabase as any)
    .from("oil_collections")
    .select("liters, reward_brl");
  if (error || !data) return { totalLiters: 0, totalPix: 0 };
  return sumRows(data);
}
