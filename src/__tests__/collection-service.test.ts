import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getMyStats,
  getGlobalStats,
  getMyHistory,
  prepareCollection,
  processCollection,
} from "@/services/collection-service";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn(), functions: { invoke: vi.fn() } },
  supabaseAnonKey: "test-anon-key",
}));

const OPERATOR_KEY = "VwM1cXXgCRJr3vDdAxS34WAQ7tGbDJK37juShWYqNjV";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Helpers de setup ────────────────────────────────────────────────────────

function mockFromReturning(result: unknown) {
  vi.mocked(supabase.from).mockReturnValueOnce({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  } as any);
}

// ─── getMyStats ───────────────────────────────────────────────────────────────

describe("getMyStats", () => {
  it("soma liters e reward_brl corretamente", async () => {
    mockFromReturning({
      data: [
        { liters: "2.5", reward_brl: "3.00" },
        { liters: "1.0", reward_brl: "1.20" },
        { liters: "0.5", reward_brl: "0.60" },
      ],
      error: null,
    });

    const stats = await getMyStats(OPERATOR_KEY);
    expect(stats.totalLiters).toBeCloseTo(4.0, 5);
    expect(stats.totalPix).toBeCloseTo(4.8, 5);
  });

  it("retorna zeros quando não há coletas", async () => {
    mockFromReturning({ data: [], error: null });
    const stats = await getMyStats(OPERATOR_KEY);
    expect(stats.totalLiters).toBe(0);
    expect(stats.totalPix).toBe(0);
  });

  it("retorna zeros silenciosamente em caso de erro Supabase", async () => {
    mockFromReturning({ data: null, error: new Error("Connection failed") });
    const stats = await getMyStats(OPERATOR_KEY);
    expect(stats.totalLiters).toBe(0);
    expect(stats.totalPix).toBe(0);
  });
});

// ─── getGlobalStats ───────────────────────────────────────────────────────────

describe("getGlobalStats", () => {
  it("agrega coletas de múltiplos operadores", async () => {
    mockFromReturning({
      data: [
        { liters: "5.0", reward_brl: "6.00" },
        { liters: "3.0", reward_brl: "3.60" },
      ],
      error: null,
    });

    const stats = await getGlobalStats();
    expect(stats.totalLiters).toBeCloseTo(8.0, 5);
    expect(stats.totalPix).toBeCloseTo(9.6, 5);
  });

  it("retorna zeros silenciosamente em caso de erro", async () => {
    mockFromReturning({ data: null, error: new Error("Timeout") });
    const stats = await getGlobalStats();
    expect(stats).toEqual({ totalLiters: 0, totalPix: 0 });
  });
});

// ─── getMyHistory ─────────────────────────────────────────────────────────────

describe("getMyHistory", () => {
  it("retorna histórico com os campos esperados", async () => {
    const records = [
      {
        id: "uuid-1",
        citizen_phone: "11999887766",
        citizen_pix_type: "PHONE",
        reward_brl: 3.0,
        collected_at: "2026-06-01T10:00:00Z",
        pix_status: "confirmed",
      },
    ];

    mockFromReturning({ data: records, error: null });
    const history = await getMyHistory(OPERATOR_KEY);

    expect(history).toHaveLength(1);
    expect(history[0].id).toBe("uuid-1");
    expect(history[0].pix_status).toBe("confirmed");
  });

  it("retorna array vazio em caso de erro", async () => {
    mockFromReturning({ data: null, error: new Error("Not found") });
    const history = await getMyHistory(OPERATOR_KEY);
    expect(history).toEqual([]);
  });
});

// ─── prepareCollection ────────────────────────────────────────────────────────

describe("prepareCollection", () => {
  it("retorna collectionId, txBase64 e rewardBrl em sucesso", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        success: true,
        collectionId: "col-uuid",
        txBase64: "base64tx==",
        rewardBrl: 3.6,
      },
      error: null,
    } as any);

    const result = await prepareCollection({
      operatorKey: OPERATOR_KEY,
      citizenPhone: "11999887766",
      liters: 3,
    });

    expect(result.collectionId).toBe("col-uuid");
    expect(result.txBase64).toBe("base64tx==");
    expect(result.rewardBrl).toBe(3.6);
  });

  it("lança erro quando success = false", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { success: false, error: "Saldo insuficiente" },
      error: null,
    } as any);

    await expect(
      prepareCollection({ operatorKey: OPERATOR_KEY, citizenPhone: "11999887766", liters: 1 })
    ).rejects.toThrow("Saldo insuficiente");
  });

  it("lança o error da edge function quando presente", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: new Error("Edge Function timeout"),
    } as any);

    await expect(
      prepareCollection({ operatorKey: OPERATOR_KEY, citizenPhone: "11999887766", liters: 1 })
    ).rejects.toThrow("Edge Function timeout");
  });
});

// ─── processCollection ────────────────────────────────────────────────────────

describe("processCollection", () => {
  const baseInput = {
    collectionId: "col-uuid",
    partialSignedTxBase64: "signed-tx==",
    operatorKey: OPERATOR_KEY,
    citizenPhone: "11999887766",
    liters: 3,
    rewardBrl: 3.6,
  };

  it("retorna txHash e pixStatus em sucesso", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        success: true,
        collectionId: "col-uuid",
        txHash: "5xNELv...",
        pixId: "pix-end-to-end-id",
        pixStatus: "processing",
        rewardBrl: 3.6,
      },
      error: null,
    } as any);

    const result = await processCollection(baseInput);

    expect(result.txHash).toBe("5xNELv...");
    expect(result.pixStatus).toBe("processing");
    expect(result.pixId).toBe("pix-end-to-end-id");
  });

  it("lança erro quando success = false", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { success: false, error: "Blockhash expirado" },
      error: null,
    } as any);

    await expect(processCollection(baseInput)).rejects.toThrow("Blockhash expirado");
  });
});
