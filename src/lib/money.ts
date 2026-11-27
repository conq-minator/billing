import { ROUND_OFF_TO_PAISE } from "@/config/constants";

export type Money = number; // integer paise

export function roundHalfUp(value: number): number {
  if (value >= 0) {
    return Math.floor(value + 0.5 + 1e-9);
  }
  return -Math.floor(-value + 0.5 + 1e-9);
}

export function rupeesToPaise(rupees: number): Money {
  return roundHalfUp(rupees * 100);
}

export function paiseToRupees(paise: Money): number {
  return paise / 100;
}

export function paiseToDecimalString(paise: Money): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(Math.round(paise));
  const rupees = Math.floor(abs / 100);
  const rem = abs % 100;
  return `${sign}${rupees}.${rem.toString().padStart(2, "0")}`;
}

export function formatInr(paise: Money, decimals: 0 | 2 = 2): string {
  const sign = paise < 0 ? "-" : "";
  const absRupees = Math.abs(paise) / 100;
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(absRupees);
  return `${sign}₹${formatted}`;
}

export function formatInrCompact(paise: Money): string {
  const abs = Math.abs(Math.round(paise));
  return formatInr(paise, abs % 100 === 0 ? 0 : 2);
}

export function roundToPaiseStep(
  paise: Money,
  step: number = ROUND_OFF_TO_PAISE
): Money {
  if (step <= 1) return Math.round(paise);
  return roundHalfUp(paise / step) * step;
}
