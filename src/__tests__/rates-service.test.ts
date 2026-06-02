import { describe, it, expect, vi, beforeEach } from "vitest";
import { getRatePerLiter, getRateConfig, updateRatePerLiter } from "@/services/rates-service";
import { supabase } from "@/lib/supabase";

// Mock completo do módulo Supabase — evita o throw por env vars ausentes
vi.mock("@/lib/supabase", () => {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "update", "single", "maybeSingle", "insert", "order", "limit"];
  for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain);

  return {
    supabase: { from: vi.fn(() => chain), functions: { invoke: vi.fn() } },
    supabaseAnonKey: "test-anon-key",
  };
});

// Acesso ao mock interno da chain
const getChain = () => vi.mocked(supabase.from).mock.results[0]?.value as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getRatePerLiter", () => {
  it("retorna o valor parseado da tabela oil_config", async () => {
    vi.mocked(supabase.from).mockImplementationOnce(() => {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { value: "1.5000" }, error: null }),
      } as any;
    });

    const rate = await getRatePerLiter();
    expect(rate).toBe(1.5);
  });

  it("retorna 1.2 como fallback quando há erro", async () => {
    vi.mocked(supabase.from).mockImplementationOnce(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error("Network error") }),
    } as any));

    const rate = await getRatePerLiter();
    expect(rate).toBe(1.2);
  });

  it("retorna 1.2 como fallback quando data é null", async () => {
    vi.mocked(supabase.from).mockImplementationOnce(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any));

    const rate = await getRatePerLiter();
    expect(rate).toBe(1.2);
  });
});

describe("getRateConfig", () => {
  it("retorna null quando há erro", async () => {
    vi.mocked(supabase.from).mockImplementationOnce(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error("Not found") }),
    } as any));

    const config = await getRateConfig();
    expect(config).toBeNull();
  });

  it("retorna o registro completo", async () => {
    const mockConfig = {
      key: "rate_per_liter",
      value: "1.2000",
      updated_by: "admin-wallet",
      updated_at: "2026-06-01T00:00:00.000Z",
    };

    vi.mocked(supabase.from).mockImplementationOnce(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockConfig, error: null }),
    } as any));

    const config = await getRateConfig();
    expect(config).toEqual(mockConfig);
  });
});

describe("updateRatePerLiter", () => {
  it("chama update com valor formatado em 4 casas decimais", async () => {
    const updateMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockImplementationOnce(() => ({
      update: updateMock,
      eq: eqMock,
    } as any));

    await updateRatePerLiter(1.5, "operator-wallet-key");

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ value: "1.5000" })
    );
  });

  it("lança erro quando Supabase retorna error", async () => {
    vi.mocked(supabase.from).mockImplementationOnce(() => ({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: new Error("Permission denied") }),
    } as any));

    await expect(updateRatePerLiter(1.5, "wallet")).rejects.toThrow("Permission denied");
  });
});
