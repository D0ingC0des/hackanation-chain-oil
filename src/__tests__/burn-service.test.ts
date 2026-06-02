import { describe, it, expect, vi, beforeEach } from "vitest";
import { prepareBurn, processBurn } from "@/services/burn-service";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn(), functions: { invoke: vi.fn() } },
  supabaseAnonKey: "test-anon-key",
}));

const OPERATOR_KEY = "VwM1cXXgCRJr3vDdAxS34WAQ7tGbDJK37juShWYqNjV";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── prepareBurn ─────────────────────────────────────────────────────────────

describe("prepareBurn", () => {
  it("retorna burnId e txBase64 em sucesso", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { success: true, burnId: "burn-uuid", txBase64: "burn-tx==" },
      error: null,
    } as any);

    const result = await prepareBurn({ operatorKey: OPERATOR_KEY, amount: 5 });

    expect(result.burnId).toBe("burn-uuid");
    expect(result.txBase64).toBe("burn-tx==");
    expect(vi.mocked(supabase.functions.invoke)).toHaveBeenCalledWith(
      "prepare-burn",
      expect.objectContaining({ body: { operatorKey: OPERATOR_KEY, amount: 5 } })
    );
  });

  it("lança erro quando success = false com mensagem da edge function", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { success: false, error: "Saldo COT insuficiente" },
      error: null,
    } as any);

    await expect(prepareBurn({ operatorKey: OPERATOR_KEY, amount: 100 }))
      .rejects.toThrow("Saldo COT insuficiente");
  });

  it("lança erro padrão quando data.error está ausente", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { success: false },
      error: null,
    } as any);

    await expect(prepareBurn({ operatorKey: OPERATOR_KEY, amount: 1 }))
      .rejects.toThrow("Falha ao preparar queima");
  });

  it("propaga erro de rede da edge function", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: new Error("Edge Function unreachable"),
    } as any);

    await expect(prepareBurn({ operatorKey: OPERATOR_KEY, amount: 1 }))
      .rejects.toThrow("Edge Function unreachable");
  });
});

// ─── processBurn ─────────────────────────────────────────────────────────────

describe("processBurn", () => {
  it("retorna txHash em sucesso", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { success: true, txHash: "burn-tx-sig-5xNELv" },
      error: null,
    } as any);

    const result = await processBurn({ burnId: "burn-uuid", signedTxBase64: "signed==" });

    expect(result.txHash).toBe("burn-tx-sig-5xNELv");
    expect(vi.mocked(supabase.functions.invoke)).toHaveBeenCalledWith(
      "process-burn",
      expect.objectContaining({ body: { burnId: "burn-uuid", signedTxBase64: "signed==" } })
    );
  });

  it("lança erro quando success = false", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { success: false, error: "Transação rejeitada pelo cluster" },
      error: null,
    } as any);

    await expect(processBurn({ burnId: "burn-uuid", signedTxBase64: "signed==" }))
      .rejects.toThrow("Transação rejeitada pelo cluster");
  });
});
