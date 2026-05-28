import { supabase } from "@/lib/supabase";

const RATE_KEY = "rate_per_liter";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = () => (supabase as any).from("oil_config");

export async function getRatePerLiter(): Promise<number> {
  const { data, error } = await table().select("value").eq("key", RATE_KEY).single();
  if (error || !data) return 1.2;
  return parseFloat(data.value);
}

export interface RateConfig {
  key: string;
  value: string;
  updated_by: string | null;
  updated_at: string;
}

export async function getRateConfig(): Promise<RateConfig | null> {
  const { data, error } = await table().select("*").eq("key", RATE_KEY).single();
  if (error || !data) return null;
  return data as RateConfig;
}

export async function updateRatePerLiter(rate: number, updatedBy: string): Promise<void> {
  const { error } = await table()
    .update({ value: rate.toFixed(4), updated_by: updatedBy, updated_at: new Date().toISOString() })
    .eq("key", RATE_KEY);
  if (error) throw error;
}
