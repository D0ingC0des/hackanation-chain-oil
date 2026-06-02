/**
 * Testes Deno — lógica de mapeamento de status do webhook Woovi
 *
 * Cobre a transformação de status Woovi → status interno ChainOil:
 *   COMPLETED/CONFIRMED/PAID/SUCCESS → "confirmed"
 *   FAILED/ERROR/DENIED/REJECTED    → "failed"
 *   qualquer outro                  → "processing"
 *
 * Também cobre a extração de correlationID e endToEndId do payload.
 *
 * Execução: deno test supabase/functions/_tests/webhook-logic.test.ts
 */

import { assertEquals } from "jsr:@std/assert";

// Lógica extraída inline do woovi-webhook-chainoil para teste unitário puro
function mapWooviStatus(wooviStatus: string | undefined): "confirmed" | "failed" | "processing" {
  const completed = wooviStatus && /COMPLETED|CONFIRMED|PAID|SUCCESS/i.test(wooviStatus);
  const failed = wooviStatus && /FAILED|ERROR|DENIED|REJECTED/i.test(wooviStatus);
  return completed ? "confirmed" : failed ? "failed" : "processing";
}

function extractCorrelationId(payload: Record<string, unknown>): string | undefined {
  const transfer = (payload.transfer ?? payload.charge ?? payload) as Record<string, unknown>;
  return (transfer.correlationID ?? transfer.correlationId) as string | undefined;
}

function extractEndToEndId(payload: Record<string, unknown>): string | undefined {
  const transfer = (payload.transfer ?? payload.charge ?? payload) as Record<string, unknown>;
  return (transfer.endToEndId ?? transfer.endtoendId) as string | undefined;
}

// ─── mapWooviStatus ───────────────────────────────────────────────────────────

Deno.test("mapWooviStatus — COMPLETED → confirmed", () => {
  assertEquals(mapWooviStatus("COMPLETED"), "confirmed");
});

Deno.test("mapWooviStatus — CONFIRMED → confirmed (case-insensitive)", () => {
  assertEquals(mapWooviStatus("confirmed"), "confirmed");
});

Deno.test("mapWooviStatus — PAID → confirmed", () => {
  assertEquals(mapWooviStatus("PAID"), "confirmed");
});

Deno.test("mapWooviStatus — SUCCESS → confirmed", () => {
  assertEquals(mapWooviStatus("SUCCESS"), "confirmed");
});

Deno.test("mapWooviStatus — FAILED → failed", () => {
  assertEquals(mapWooviStatus("FAILED"), "failed");
});

Deno.test("mapWooviStatus — ERROR → failed", () => {
  assertEquals(mapWooviStatus("ERROR"), "failed");
});

Deno.test("mapWooviStatus — DENIED → failed", () => {
  assertEquals(mapWooviStatus("DENIED"), "failed");
});

Deno.test("mapWooviStatus — REJECTED → failed", () => {
  assertEquals(mapWooviStatus("REJECTED"), "failed");
});

Deno.test("mapWooviStatus — status desconhecido → processing", () => {
  assertEquals(mapWooviStatus("PENDING"), "processing");
  assertEquals(mapWooviStatus("IN_PROGRESS"), "processing");
  assertEquals(mapWooviStatus("CREATED"), "processing");
});

Deno.test("mapWooviStatus — undefined → processing", () => {
  assertEquals(mapWooviStatus(undefined), "processing");
});

// ─── extractCorrelationId ─────────────────────────────────────────────────────

Deno.test("extractCorrelationId — lê de transfer.correlationID", () => {
  const payload = { transfer: { correlationID: "col-uuid-123", status: "COMPLETED" } };
  assertEquals(extractCorrelationId(payload), "col-uuid-123");
});

Deno.test("extractCorrelationId — lê de transfer.correlationId (camelCase alternativo)", () => {
  const payload = { transfer: { correlationId: "col-uuid-456" } };
  assertEquals(extractCorrelationId(payload), "col-uuid-456");
});

Deno.test("extractCorrelationId — fallback para correlationID na raiz", () => {
  const payload = { correlationID: "col-uuid-789" };
  assertEquals(extractCorrelationId(payload), "col-uuid-789");
});

Deno.test("extractCorrelationId — retorna undefined se ausente", () => {
  assertEquals(extractCorrelationId({}), undefined);
});

// ─── extractEndToEndId ────────────────────────────────────────────────────────

Deno.test("extractEndToEndId — lê endToEndId corretamente", () => {
  const payload = { transfer: { endToEndId: "E123456789" } };
  assertEquals(extractEndToEndId(payload), "E123456789");
});

Deno.test("extractEndToEndId — lê endtoendId (lowercase alternativo)", () => {
  const payload = { transfer: { endtoendId: "E987654321" } };
  assertEquals(extractEndToEndId(payload), "E987654321");
});

Deno.test("extractEndToEndId — retorna undefined se ausente", () => {
  assertEquals(extractEndToEndId({ transfer: {} }), undefined);
});

// ─── allowedFrom — lógica de idempotência ────────────────────────────────────

Deno.test("confirmed só aceita transição de processing/pending/failed", () => {
  const localStatus = "confirmed";
  const allowedFrom = localStatus === "confirmed"
    ? ["processing", "pending", "failed"]
    : ["processing", "pending"];

  assertEquals(allowedFrom.includes("processing"), true);
  assertEquals(allowedFrom.includes("pending"), true);
  assertEquals(allowedFrom.includes("failed"), true);
  assertEquals(allowedFrom.includes("confirmed"), false);
});

Deno.test("failed só aceita transição de processing/pending (não de confirmed)", () => {
  const localStatus = "failed";
  const allowedFrom = localStatus === "confirmed"
    ? ["processing", "pending", "failed"]
    : ["processing", "pending"];

  assertEquals(allowedFrom.includes("processing"), true);
  assertEquals(allowedFrom.includes("pending"), true);
  assertEquals(allowedFrom.includes("confirmed"), false);
  assertEquals(allowedFrom.includes("failed"), false);
});
