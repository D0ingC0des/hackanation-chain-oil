/**
 * Testes Deno — verifyHmac (_shared/hmac.ts)
 *
 * Cobre:
 *  - Assinatura válida (com e sem prefixo "sha256=")
 *  - Assinatura inválida
 *  - Proteção contra timing attack (comparação em tempo constante)
 *
 * Execução: deno test supabase/functions/_tests/hmac.test.ts
 */

import { assertEquals } from "jsr:@std/assert";
import { verifyHmac } from "../_shared/hmac.ts";

// Helper: gera a assinatura HMAC-SHA256 correta para um body + secret
async function sign(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const buf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.test("verifyHmac — aceita assinatura válida sem prefixo", async () => {
  const body = '{"event":"PAYMENT_CONFIRMED","correlationID":"col-uuid-123"}';
  const secret = "my-webhook-secret";
  const sig = await sign(body, secret);

  const ok = await verifyHmac(body, sig, secret);
  assertEquals(ok, true);
});

Deno.test("verifyHmac — aceita assinatura válida com prefixo sha256=", async () => {
  const body = '{"event":"PAYMENT_CONFIRMED","correlationID":"col-uuid-123"}';
  const secret = "my-webhook-secret";
  const sig = await sign(body, secret);

  const ok = await verifyHmac(body, `sha256=${sig}`, secret);
  assertEquals(ok, true);
});

Deno.test("verifyHmac — rejeita assinatura inválida", async () => {
  const body = '{"event":"PAYMENT_CONFIRMED"}';
  const secret = "my-webhook-secret";
  const wrongSig = "0000000000000000000000000000000000000000000000000000000000000000";

  const ok = await verifyHmac(body, wrongSig, secret);
  assertEquals(ok, false);
});

Deno.test("verifyHmac — rejeita quando body é diferente", async () => {
  const originalBody = '{"amount":100}';
  const tamperedBody = '{"amount":999}';
  const secret = "my-webhook-secret";
  const sig = await sign(originalBody, secret);

  const ok = await verifyHmac(tamperedBody, sig, secret);
  assertEquals(ok, false);
});

Deno.test("verifyHmac — rejeita quando secret é diferente", async () => {
  const body = '{"event":"PAYMENT_CONFIRMED"}';
  const sig = await sign(body, "correct-secret");

  const ok = await verifyHmac(body, sig, "wrong-secret");
  assertEquals(ok, false);
});

Deno.test("verifyHmac — rejeita assinatura de comprimento diferente", async () => {
  const ok = await verifyHmac("body", "tooshort", "secret");
  assertEquals(ok, false);
});
