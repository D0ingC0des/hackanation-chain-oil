import { describe, it, expect, vi, beforeEach } from "vitest";
import { getProfile, createProfile, touchWalletLogin } from "@/services/profileService";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn(), functions: { invoke: vi.fn() } },
  supabaseAnonKey: "test-anon-key",
}));

const PUBLIC_KEY = "VwM1cXXgCRJr3vDdAxS34WAQ7tGbDJK37juShWYqNjV";

const MOCK_PROFILE = {
  id: "profile-uuid",
  public_key: PUBLIC_KEY,
  name: "Posto Shell Centro",
  email: "posto@shell.com",
  phone: "11999887766",
  business_name: "Shell Combustíveis Ltda",
  cnpj: "12345678000190",
  cep: "01310-100",
  street: "Av Paulista",
  neighborhood: "Bela Vista",
  city: "São Paulo",
  state: "SP",
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getProfile ───────────────────────────────────────────────────────────────

describe("getProfile", () => {
  it("retorna o perfil quando encontrado", async () => {
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_PROFILE, error: null }),
    } as any);

    const profile = await getProfile(PUBLIC_KEY);
    expect(profile).toEqual(MOCK_PROFILE);
    expect(profile?.public_key).toBe(PUBLIC_KEY);
  });

  it("retorna null quando perfil não existe (maybeSingle → data null)", async () => {
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any);

    const profile = await getProfile(PUBLIC_KEY);
    expect(profile).toBeNull();
  });

  it("retorna null silenciosamente em caso de erro", async () => {
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error("RLS denied") }),
    } as any);

    const profile = await getProfile(PUBLIC_KEY);
    expect(profile).toBeNull();
  });
});

// ─── createProfile ────────────────────────────────────────────────────────────

describe("createProfile", () => {
  const INPUT = {
    public_key: PUBLIC_KEY,
    name: "Posto Shell Centro",
    email: "posto@shell.com",
    phone: "11999887766",
    business_name: "Shell Combustíveis Ltda",
    cep: "01310-100",
    city: "São Paulo",
    state: "SP",
  };

  it("cria e retorna o novo perfil", async () => {
    vi.mocked(supabase.from).mockReturnValueOnce({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_PROFILE, error: null }),
    } as any);

    const profile = await createProfile(INPUT);
    expect(profile.public_key).toBe(PUBLIC_KEY);
    expect(profile.name).toBe("Posto Shell Centro");
  });

  it("lança erro quando Supabase retorna error no insert", async () => {
    vi.mocked(supabase.from).mockReturnValueOnce({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: new Error("duplicate key value violates unique constraint"),
      }),
    } as any);

    await expect(createProfile(INPUT)).rejects.toThrow(
      "duplicate key value violates unique constraint"
    );
  });

  it("lança erro genérico quando data é null e error também é null", async () => {
    vi.mocked(supabase.from).mockReturnValueOnce({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any);

    await expect(createProfile(INPUT)).rejects.toThrow("Failed to create profile");
  });
});

// ─── touchWalletLogin ─────────────────────────────────────────────────────────

describe("touchWalletLogin", () => {
  it("chama update com updated_at e não lança erro em sucesso", async () => {
    const updateMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockReturnValueOnce({
      update: updateMock,
      eq: eqMock,
    } as any);

    await expect(touchWalletLogin(PUBLIC_KEY)).resolves.toBeUndefined();
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ updated_at: expect.any(String) })
    );
  });
});
