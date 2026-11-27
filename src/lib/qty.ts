export type Qty = number;

export function roundQty(qty: number): Qty {
  return Math.round(qty * 1000) / 1000;
}

export function formatQty(qty: number): string {
  const rounded = roundQty(qty);
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}
