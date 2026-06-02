import { supabase, supabaseAnonKey } from "@/lib/supabase";

const fnHeaders = () => ({
  apikey: supabaseAnonKey,
  Authorization: `Bearer ${supabaseAnonKey}`,
});

export interface PrepareBurnInput {
  operatorKey: string;
  amount: number;
}

export interface PrepareBurnResult {
  burnId: string;
  txBase64: string;
}

export async function prepareBurn(input: PrepareBurnInput): Promise<PrepareBurnResult> {
  const { data, error } = await supabase.functions.invoke("prepare-burn", {
    body: input,
    headers: fnHeaders(),
  });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error ?? "Falha ao preparar queima");
  return data as PrepareBurnResult;
}

export interface ProcessBurnInput {
  burnId: string;
  signedTxBase64: string;
}

export interface ProcessBurnResult {
  txHash: string;
}

export async function processBurn(input: ProcessBurnInput): Promise<ProcessBurnResult> {
  const { data, error } = await supabase.functions.invoke("process-burn", {
    body: input,
    headers: fnHeaders(),
  });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error ?? "Falha ao processar queima");
  return data as ProcessBurnResult;
}
