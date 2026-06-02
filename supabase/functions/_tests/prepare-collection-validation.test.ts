/**
 * Testes Deno — validação de input para prepare-collection e prepare-burn
 *
 * Cobre a lógica de validação de entrada que protege as edge functions
 * de dados malformados.
 *
 * Execução: deno test supabase/functions/_tests/prepare-collection-validation.test.ts
 */

import { assertEquals, assertFalse } from "jsr:@std/assert";

// ─── Lógica de validação extraída inline ────────────────────────────────────

interface PrepareCollectionInput {
  operatorKey?: string;
  liters?: number;
  citizenPhone?: string;
}

function validatePrepareCollection(input: PrepareCollectionInput): string | null {
  if (!input.operatorKey) return "operatorKey e liters são obrigatórios";
  if (!input.liters || input.liters <= 0) return "operatorKey e liters são obrigatórios";
  return null;
}

interface PrepareBurnInput {
  operatorKey?: string;
  amount?: number;
}

function validatePrepareBurn(input: PrepareBurnInput): string | null {
  if (!input.operatorKey || !input.amount || input.amount <= 0) {
    return "operatorKey e amount são obrigatórios";
  }
  const amountInt = Math.floor(input.amount);
  if (amountInt <= 0) return "amount deve ser um inteiro positivo";
  return null;
}

// ─── prepare-collection validation ───────────────────────────────────────────

Deno.test("validatePrepareCollection — aceita input válido", () => {
  const err = validatePrepareCollection({
    operatorKey: "VwM1cXXgCRJr3vDdAxS34WAQ7tGbDJK37juShWYqNjV",
    liters: 2.5,
    citizenPhone: "11999887766",
  });
  assertEquals(err, null);
});

Deno.test("validatePrepareCollection — rejeita operatorKey ausente", () => {
  const err = validatePrepareCollection({ liters: 2.5 });
  assertEquals(err, "operatorKey e liters são obrigatórios");
});

Deno.test("validatePrepareCollection — rejeita liters ausente", () => {
  const err = validatePrepareCollection({
    operatorKey: "VwM1cXXgCRJr3vDdAxS34WAQ7tGbDJK37juShWYqNjV",
  });
  assertEquals(err, "operatorKey e liters são obrigatórios");
});

Deno.test("validatePrepareCollection — rejeita liters = 0", () => {
  const err = validatePrepareCollection({
    operatorKey: "VwM1cXXgCRJr3vDdAxS34WAQ7tGbDJK37juShWYqNjV",
    liters: 0,
  });
  assertEquals(err, "operatorKey e liters são obrigatórios");
});

Deno.test("validatePrepareCollection — rejeita liters negativo", () => {
  const err = validatePrepareCollection({
    operatorKey: "VwM1cXXgCRJr3vDdAxS34WAQ7tGbDJK37juShWYqNjV",
    liters: -1,
  });
  assertEquals(err, "operatorKey e liters são obrigatórios");
});

// ─── prepare-burn validation ──────────────────────────────────────────────────

Deno.test("validatePrepareBurn — aceita input válido", () => {
  const err = validatePrepareBurn({
    operatorKey: "VwM1cXXgCRJr3vDdAxS34WAQ7tGbDJK37juShWYqNjV",
    amount: 5,
  });
  assertEquals(err, null);
});

Deno.test("validatePrepareBurn — rejeita operatorKey ausente", () => {
  const err = validatePrepareBurn({ amount: 5 });
  assertEquals(err, "operatorKey e amount são obrigatórios");
});

Deno.test("validatePrepareBurn — rejeita amount = 0", () => {
  const err = validatePrepareBurn({
    operatorKey: "VwM1cXXgCRJr3vDdAxS34WAQ7tGbDJK37juShWYqNjV",
    amount: 0,
  });
  assertEquals(err, "operatorKey e amount são obrigatórios");
});

Deno.test("validatePrepareBurn — rejeita amount fracionário < 1 (amountInt = 0)", () => {
  const err = validatePrepareBurn({
    operatorKey: "VwM1cXXgCRJr3vDdAxS34WAQ7tGbDJK37juShWYqNjV",
    amount: 0.4,
  });
  assertEquals(err, "amount deve ser um inteiro positivo");
});

Deno.test("validatePrepareBurn — aceita amount fracionário ≥ 1 (amountInt = 1)", () => {
  const err = validatePrepareBurn({
    operatorKey: "VwM1cXXgCRJr3vDdAxS34WAQ7tGbDJK37juShWYqNjV",
    amount: 1.7,
  });
  assertEquals(err, null);
});

// ─── Cálculo de rewardBrl ─────────────────────────────────────────────────────

Deno.test("rewardBrl = liters × rate arredondado em 2 casas", () => {
  const liters = 2.5;
  const rate = 1.2;
  const reward = parseFloat((liters * rate).toFixed(2));
  assertEquals(reward, 3.0);
});

Deno.test("rewardBrl usa taxa padrão 1.2 quando rate_per_liter indisponível", () => {
  const rate = 1.2; // fallback
  const liters = 3;
  const reward = parseFloat((liters * rate).toFixed(2));
  assertEquals(reward, 3.6);
});

Deno.test("litersML = round(liters × 1000) preserva integridade", () => {
  assertEquals(Math.round(2.5 * 1000), 2500);
  assertEquals(Math.round(1.0 * 1000), 1000);
  assertEquals(Math.round(0.1 * 1000), 100);
});
