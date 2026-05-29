export const WATER_PER_LITER = 1000;
export const CO2_PER_LITER = 1.5;
export const CAR_DAYS_PER_LITER = 3;

export function calcWater(liters: number): number {
  return liters * WATER_PER_LITER;
}

export function calcCO2(liters: number): number {
  return liters * CO2_PER_LITER;
}
