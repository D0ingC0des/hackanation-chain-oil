import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "edge" };

const RATE_KEY = "rate_per_liter";

export default async function handler(_request: Request): Promise<Response> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return Response.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from("oil_config")
    .select("*")
    .eq("key", RATE_KEY)
    .single();

  if (error || !data) {
    return Response.json({ error: "Rate not configured" }, { status: 404 });
  }

  return new Response(
    JSON.stringify({
      rate_per_liter: parseFloat(data.value),
      currency: "BRL",
      unit: "liter",
      updated_at: data.updated_at,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Cache-Control": "no-store",
      },
    }
  );
}
