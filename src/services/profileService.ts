import { supabase } from "@/lib/supabase";

export interface WalletProfile {
  id: string;
  public_key: string;
  name: string;
  email: string;
  phone: string;
  business_name: string;
  cnpj: string | null;
  cep: string;
  street: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProfileInput {
  public_key: string;
  name: string;
  email: string;
  phone: string;
  business_name: string;
  cnpj?: string | null;
  cep: string;
  street?: string | null;
  neighborhood?: string | null;
  city: string;
  state: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = () => (supabase as any).from("wallet_profiles");

export async function getProfile(publicKey: string): Promise<WalletProfile | null> {
  const { data, error } = await table()
    .select("*")
    .eq("public_key", publicKey)
    .maybeSingle();

  if (error || !data) return null;
  return data as WalletProfile;
}

export async function createProfile(input: CreateProfileInput): Promise<WalletProfile> {
  const { data, error } = await table()
    .insert(input)
    .select()
    .single();

  if (error || !data) throw error ?? new Error("Failed to create profile");
  return data as WalletProfile;
}
