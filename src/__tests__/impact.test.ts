import { describe, it, expect } from "vitest";
import {
  calcWater,
  calcCO2,
  WATER_PER_LITER,
  CO2_PER_LITER,
  CAR_DAYS_PER_LITER,
} from "@/constants/impact";

describe("impacto ambiental — constantes", () => {
  it("WATER_PER_LITER = 1000 L água por litro de óleo", () => {
    expect(WATER_PER_LITER).toBe(1000);
  });

  it("CO2_PER_LITER = 1.5 kg CO₂ por litro de óleo", () => {
    expect(CO2_PER_LITER).toBe(1.5);
  });

  it("CAR_DAYS_PER_LITER = 3 dias de carro por litro de óleo", () => {
    expect(CAR_DAYS_PER_LITER).toBe(3);
  });
});

describe("calcWater — litros de água preservados", () => {
  it("0 litros → 0 litros de água", () => {
    expect(calcWater(0)).toBe(0);
  });

  it("1 litro → 1000 litros de água", () => {
    expect(calcWater(1)).toBe(1000);
  });

  it("2.5 litros → 2500 litros de água", () => {
    expect(calcWater(2.5)).toBe(2500);
  });

  it("10 litros → 10000 litros de água", () => {
    expect(calcWater(10)).toBe(10_000);
  });

  it("valores grandes: 100 litros → 100000 L", () => {
    expect(calcWater(100)).toBe(100_000);
  });
});

describe("calcCO2 — kg de CO₂ evitados", () => {
  it("0 litros → 0 kg CO₂", () => {
    expect(calcCO2(0)).toBe(0);
  });

  it("1 litro → 1.5 kg CO₂", () => {
    expect(calcCO2(1)).toBe(1.5);
  });

  it("2 litros → 3 kg CO₂", () => {
    expect(calcCO2(2)).toBe(3);
  });

  it("10 litros → 15 kg CO₂", () => {
    expect(calcCO2(10)).toBe(15);
  });

  it("mantém proporção linear para qualquer valor", () => {
    const liters = 7.3;
    expect(calcCO2(liters)).toBeCloseTo(liters * CO2_PER_LITER, 10);
  });
});
