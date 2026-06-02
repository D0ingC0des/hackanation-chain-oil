/**
 * Testes Deno — helpers CORS (_shared/cors.ts)
 *
 * Cobre:
 *  - json(): Content-Type, status, CORS headers
 *  - jsonOpen(): Access-Control-Allow-Origin = *
 *  - handleOptions() / handleOptionsOpen()
 *
 * Execução: deno test supabase/functions/_tests/cors.test.ts
 */

import { assertEquals, assertStringIncludes } from "jsr:@std/assert";

// Stub de Deno.env para testes (sem variáveis reais)
// deno-lint-ignore no-explicit-any
(globalThis as any).Deno = {
  env: {
    get: (key: string) => {
      if (key === "ALLOWED_ORIGINS") return "http://localhost:5173,https://chainoil.vercel.app";
      return undefined;
    },
  },
};

const { json, jsonOpen, handleOptions, handleOptionsOpen, corsHeadersOpen } = await import(
  "../_shared/cors.ts"
);

Deno.test("json() — retorna Content-Type application/json", async () => {
  const res = json({ ok: true });
  assertEquals(res.headers.get("Content-Type"), "application/json");
});

Deno.test("json() — status padrão é 200", async () => {
  const res = json({ ok: true });
  assertEquals(res.status, 200);
});

Deno.test("json() — respeita status customizado", async () => {
  const res = json({ error: "not found" }, 404);
  assertEquals(res.status, 404);
});

Deno.test("json() — body é JSON válido", async () => {
  const res = json({ key: "value", num: 42 });
  const body = await res.json();
  assertEquals(body, { key: "value", num: 42 });
});

Deno.test("json() — inclui header Vary: Origin", () => {
  const res = json({ ok: true });
  assertEquals(res.headers.get("Vary"), "Origin");
});

Deno.test("jsonOpen() — Access-Control-Allow-Origin = *", async () => {
  const res = jsonOpen({ ok: true });
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
  const body = await res.json();
  assertEquals(body.ok, true);
});

Deno.test("jsonOpen() — aceita status customizado", async () => {
  const res = jsonOpen({ error: "bad request" }, 400);
  assertEquals(res.status, 400);
});

Deno.test("handleOptions() — retorna 204", () => {
  const res = handleOptions();
  assertEquals(res.status, 204);
});

Deno.test("handleOptionsOpen() — retorna 204 com CORS aberto", () => {
  const res = handleOptionsOpen();
  assertEquals(res.status, 204);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
});

Deno.test("corsHeadersOpen — sempre tem Access-Control-Allow-Origin = *", () => {
  assertEquals(corsHeadersOpen["Access-Control-Allow-Origin"], "*");
});
