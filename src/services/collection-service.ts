import { supabase, supabaseAnonKey } from "@/lib/supabase";
import type { PixType } from "@/constants/pix";

export type { PixType } from "@/constants/pix";

const fnHeaders = () => ({
  apikey: supabaseAnonKey,
  Authorization: `Bearer ${supabaseAnonKey}`,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = () => (supabase as any).from("oil_collections");

// ── Option B: prepare (build tx) ───────────────────────────────────────────

export interface PrepareCollectionInput {
  operatorKey: string;
  citizenPhone: string;
  liters: number;
}

export interface PrepareCollectionResult {
  collectionId: string;
  txBase64: string;
  rewardBrl: number;
}

export async function prepareCollection(
  input: PrepareCollectionInput,
): Promise<PrepareCollectionResult> {
  const { data, error } = await supabase.functions.invoke("prepare-collection", {
    body: input,
    headers: fnHeaders(),
  });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error ?? "Falha ao preparar transação");
  return data as PrepareCollectionResult;
}

// ── Option B: process (co-sign + submit + PIX) ────────────────────────────

export interface ProcessCollectionInput {
  collectionId: string;
  partialSignedTxBase64: string;
  operatorKey: string;
  citizenPhone: string;
  citizenPixType?: PixType;
  liters: number;
  rewardBrl: number;
  photoBase64?: string;
}

export interface CollectionSummary {
  timestamp: string;
  onChain: {
    origin: string;
    destination: string;
    operator: string;
    cotsTransferred: number;
    txHash: string;
    txStatus: string;
    explorer: string;
  };
  pix: {
    citizenKey: string;
    pixType: PixType;
    amountBrl: number;
    pixId: string | null;
    pixStatus: string;
  };
}

export interface ProcessCollectionResult {
  collectionId: string;
  txHash: string | null;
  pixId: string | null;
  pixStatus: string;
  rewardBrl: number;
  summary?: CollectionSummary;
}

export async function processCollection(
  input: ProcessCollectionInput,
): Promise<ProcessCollectionResult> {
  const { data, error } = await supabase.functions.invoke("process-collection", {
    body: input,
    headers: fnHeaders(),
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export async function saveCollection(input: CollectionInput): Promise<void> {
  const { error } = await table().insert({
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
  const { data, error } = await table()
    .select("liters, reward_brl")
    .eq("operator_key", operatorKey);
  if (error || !data) return { totalLiters: 0, totalPix: 0 };
  return sumRows(data);
}

export async function getGlobalStats(): Promise<CollectionStats> {
  const { data, error } = await table().select("liters, reward_brl");
  if (error || !data) return { totalLiters: 0, totalPix: 0 };
  return sumRows(data);
}

export interface CollectionRecord {
  id: string;
  citizen_phone: string;
  citizen_pix_type?: PixType;
  reward_brl: number;
  collected_at: string;
  pix_status?: string;
}

export async function getMyHistory(operatorKey: string): Promise<CollectionRecord[]> {
  const { data, error } = await table()
    .select("id, citizen_phone, citizen_pix_type, reward_brl, collected_at, pix_status")
    .eq("operator_key", operatorKey)
    .order("collected_at", { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return data;
}
