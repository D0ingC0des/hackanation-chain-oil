import { supabase } from "./supabase";

export interface AuthSession {
  phone: string;
  name: string;
  level: string;
}

// Convenção interna: operadores autenticam com email derivado do telefone
function toEmail(phoneRaw: string): string {
  return `${phoneRaw}@chainoil.local`;
}

// PIN tem 4 dígitos; adicionamos prefixo para atender mínimo de 6 chars do Supabase
function toPassword(pin: string): string {
  return `co_${pin}_oil`;
}

export async function login(phoneRaw: string, pin: string): Promise<AuthSession | null> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: toEmail(phoneRaw),
    password: toPassword(pin),
  });

  if (error || !data.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", data.user.id)
    .single<{ phone: string; full_name: string }>();

  return {
    phone: profile?.phone ?? phoneRaw,
    name: profile?.full_name ?? "Operador ChainOil",
    level: "Prata",
  };
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<AuthSession | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", session.user.id)
    .single<{ phone: string; full_name: string }>();

  return {
    phone: profile?.phone ?? "",
    name: profile?.full_name ?? "Operador ChainOil",
    level: "Prata",
  };
}

export async function isAuthenticated(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session !== null;
}
