import type { UnitType } from "@/router/intent.schema";
import { roundQty } from "@/lib/qty";

const UNIT_ALIASES: Record<string, UnitType> = {
  kg: "kg",
  kilo: "kg",
  kilogram: "kg",
  kilograms: "kg",
  kgs: "kg",
  g: "g",
  gm: "g",
  gms: "g",
  gram: "g",
  grams: "g",
  l: "l",
  ltr: "l",
  litre: "l",
  litres: "l",
  liter: "l",
  liters: "l",
  ml: "ml",
  millilitre: "ml",
  milliliter: "ml",
  pkt: "pkt",
  packet: "pkt",
  packets: "pkt",
  pack: "pkt",
  pc: "pc",
  pcs: "pc",
  piece: "pc",
  pieces: "pc",
  pice: "pc",
  dozen: "dozen",
  doz: "dozen",
  darjan: "dozen",
  dojon: "dozen",
  box: "box",
  dabba: "box",
  bottle: "bottle",
  botal: "bottle",
  botol: "bottle",
  bag: "bag",
  bori: "bag",
  m: "m",
  meter: "m",
  metre: "m",
  unit: "unit",
};

export function canonicalUnit(raw: string): UnitType {
  const key = raw.toLowerCase().trim();
  return UNIT_ALIASES[key] ?? "unit";
}

type Family = "mass" | "volume" | "count";

const UNIT_FAMILY: Partial<Record<UnitType, { family: Family; factor: number }>> = {
  kg: { family: "mass", factor: 1000 },
  g: { family: "mass", factor: 1 },
  l: { family: "volume", factor: 1000 },
  ml: { family: "volume", factor: 1 },
  dozen: { family: "count", factor: 12 },
  pc: { family: "count", factor: 1 },
};

/**
 * Converts qty from `from` unit to `to` unit.
 * Returns null when units are incompatible (e.g. pkt <-> kg).
 */
export function convertUnit(
  qty: number,
  from: UnitType,
  to: UnitType
): number | null {
  if (from === to) return qty;
  const f = UNIT_FAMILY[from];
  const t = UNIT_FAMILY[to];
  if (!f || !t || f.family !== t.family) {
    return null;
  }
  return roundQty((qty * f.factor) / t.factor);
}

/**
 * Computes rate conversion factor: 1 `lineUnit` = factor * `memoryUnit`.
 * e.g. lineUnit="g", memoryUnit="kg" => 0.001 (so ₹52/kg * 0.001 = ₹0.052/g).
 */
export function unitRateFactor(
  lineUnit: UnitType,
  memoryUnit: UnitType
): number | null {
  if (lineUnit === memoryUnit) return 1;
  const f = UNIT_FAMILY[lineUnit];
  const t = UNIT_FAMILY[memoryUnit];
  if (!f || !t || f.family !== t.family) {
    return null;
  }
  return f.factor / t.factor;
}
