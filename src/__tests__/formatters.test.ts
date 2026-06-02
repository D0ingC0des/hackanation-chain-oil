import { describe, it, expect } from "vitest";
import {
  formatPhone,
  formatCPF,
  maskCEP,
  fmtPhone,
  fmtCPF,
  fmtPixKey,
  fmtBRL,
  fmtNumber,
  fmtDate,
  truncate,
} from "@/utils/formatters";

describe("formatPhone — máscara progressiva", () => {
  it("retorna vazio para entrada vazia", () => {
    expect(formatPhone("")).toBe("");
  });

  it("formata apenas DDD (2 dígitos)", () => {
    expect(formatPhone("11")).toBe("11");
  });

  it("formata prefixo parcial (5 dígitos)", () => {
    expect(formatPhone("11999")).toBe("(11) 999");
  });

  it("formata número completo com 11 dígitos", () => {
    expect(formatPhone("11999887766")).toBe("(11) 99988-7766");
  });

  it("remove não-dígitos antes de formatar", () => {
    expect(formatPhone("(11) 9 9988-7766")).toBe("(11) 99988-7766");
  });

  it("trunca entrada com mais de 11 dígitos", () => {
    expect(formatPhone("119998877661234")).toBe("(11) 99988-7766");
  });
});

describe("formatCPF — máscara progressiva", () => {
  it("retorna vazio para entrada vazia", () => {
    expect(formatCPF("")).toBe("");
  });

  it("formata 3 dígitos sem ponto", () => {
    expect(formatCPF("123")).toBe("123");
  });

  it("formata 6 dígitos com primeiro ponto", () => {
    expect(formatCPF("123456")).toBe("123.456");
  });

  it("formata CPF completo (11 dígitos)", () => {
    expect(formatCPF("12345678901")).toBe("123.456.789-01");
  });

  it("remove não-dígitos antes de formatar", () => {
    expect(formatCPF("123.456.789-01")).toBe("123.456.789-01");
  });
});

describe("maskCEP", () => {
  it("formata CEP completo", () => {
    expect(maskCEP("01310100")).toBe("01310-100");
  });

  it("formata CEP parcial", () => {
    expect(maskCEP("01310")).toBe("01310");
  });

  it("aceita CEP já formatado", () => {
    expect(maskCEP("01310-100")).toBe("01310-100");
  });
});

describe("fmtPhone — exibição de telefone armazenado", () => {
  it("formata celular 11 dígitos", () => {
    expect(fmtPhone("11999887766")).toBe("(11) 99988-7766");
  });

  it("formata fixo 10 dígitos", () => {
    expect(fmtPhone("1133334444")).toBe("(11) 3333-4444");
  });

  it("retorna original se não reconhecer o padrão", () => {
    expect(fmtPhone("999")).toBe("999");
  });
});

describe("fmtCPF — exibição de CPF armazenado", () => {
  it("formata CPF sem máscara", () => {
    expect(fmtCPF("12345678901")).toBe("123.456.789-01");
  });

  it("retorna original se não for 11 dígitos", () => {
    expect(fmtCPF("123")).toBe("123");
  });
});

describe("fmtPixKey", () => {
  it("formata chave tipo PHONE como telefone", () => {
    expect(fmtPixKey("11999887766", "PHONE")).toBe("(11) 99988-7766");
  });

  it("formata chave tipo CPF como CPF", () => {
    expect(fmtPixKey("12345678901", "CPF")).toBe("123.456.789-01");
  });

  it("retorna chave EVP/EMAIL sem formatação", () => {
    const evp = "chave-aleatoria-uuid";
    expect(fmtPixKey(evp, "EVP")).toBe(evp);
  });
});

describe("fmtBRL — formatação de moeda", () => {
  it("formata zero", () => {
    expect(fmtBRL(0)).toBe("R$ 0,00");
  });

  it("formata R$ 1,20", () => {
    expect(fmtBRL(1.2)).toBe("R$ 1,20");
  });

  it("formata valor alto", () => {
    expect(fmtBRL(1000.5)).toBe("R$ 1.000,50");
  });
});

describe("fmtNumber", () => {
  it("formata inteiro sem decimais", () => {
    expect(fmtNumber(1000)).toBe("1.000");
  });

  it("formata com 2 decimais", () => {
    expect(fmtNumber(1.5, 2)).toBe("1,50");
  });
});

describe("fmtDate", () => {
  it("formata data ISO no padrão dd/mm/aaaa", () => {
    // Usa UTC+0 para evitar variações de timezone no CI
    const result = fmtDate("2026-06-01T12:00:00.000Z");
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});

describe("truncate — endereços Solana", () => {
  it("trunca chave pública padrão", () => {
    const key = "VwM1cXXgCRJr3vDdAxS34WAQ7tGbDJK37juShWYqNjV";
    expect(truncate(key)).toBe("VwM1...NjV");
  });

  it("preserva strings curtas", () => {
    expect(truncate("ABCD1234")).toBe("ABCD...234");
  });
});
