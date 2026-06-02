/**
 * Verifica assinatura HMAC-SHA256 com comparação em tempo constante
 * para prevenir timing attacks.
 *
 * @param rawBody  Corpo bruto da requisição (string)
 * @param signature  Assinatura recebida — aceita com ou sem prefixo "sha256="
 * @param secret   Segredo compartilhado (WOOVI_WEBHOOK_SECRET)
 */
export async function verifyHmac(
  rawBody: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const sig = signature.startsWith("sha256=") ? signature.slice(7) : signature;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const computed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(rawBody),
  );

  const hex = Array.from(new Uint8Array(computed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Comparação em tempo constante — previne timing attacks
  if (hex.length !== sig.length) return false;
  let mismatch = 0;
  for (let i = 0; i < hex.length; i++) {
    mismatch |= hex.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return mismatch === 0;
}
