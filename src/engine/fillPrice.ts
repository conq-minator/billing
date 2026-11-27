import { roundHalfUp, rupeesToPaise } from "@/lib/money";
import type { UnitType } from "@/router/intent.schema";
import { learnPrice } from "./learnPrice";
import { unitRateFactor } from "./units";
import type { Effect, ItemRecord, LineFlag } from "./types";

export type FillPriceInput = {
  qty: number;
  lineUnit: UnitType;
  item: ItemRecord;
  isNewItem: boolean;
  billId: string | null;
  spokenPriceRupees?: number | null;
  spokenBasis?: "per_unit" | "line_total" | null;
  oneTime?: boolean;
};

export type FillPriceOutput = {
  rate: number | null;
  amount: number;
  flags: LineFlag[];
  effects: Effect[];
  updatedItem: ItemRecord;
};

export function resolveSpokenBasis(
  spokenPaise: number,
  qty: number,
  lineUnit: UnitType,
  item: ItemRecord,
  explicitBasis?: "per_unit" | "line_total" | null
): "per_unit" | "line_total" {
  if (explicitBasis) return explicitBasis;
  if (qty === 1) return "per_unit";

  if (item.pricePerUnit !== null) {
    const factor = unitRateFactor(lineUnit, item.defaultUnit);
    if (factor !== null) {
      const memRateInLineUnit = item.pricePerUnit * factor;
      if (spokenPaise > memRateInLineUnit * qty * 0.5) {
        return "line_total";
      }
      return "per_unit";
    }
  }

  return qty > 1 ? "line_total" : "per_unit";
}

export function fillPrice(input: FillPriceInput): FillPriceOutput {
  const {
    qty,
    lineUnit,
    item,
    isNewItem,
    billId,
    spokenPriceRupees,
    spokenBasis,
    oneTime = false,
  } = input;

  const baseFlags: LineFlag[] = isNewItem ? ["new_item"] : [];

  // 1. Spoken price present
  if (spokenPriceRupees !== null && spokenPriceRupees !== undefined) {
    const spokenPaise = rupeesToPaise(spokenPriceRupees);
    const basis = resolveSpokenBasis(
      spokenPaise,
      qty,
      lineUnit,
      item,
      spokenBasis
    );
    const rate =
      basis === "line_total" ? roundHalfUp(spokenPaise / qty) : spokenPaise;
    const amount = roundHalfUp(rate * qty);
    const flags: LineFlag[] = oneTime
      ? [...baseFlags, "one_time"]
      : baseFlags;

    const { effects, updatedItem } = learnPrice(item, rate, lineUnit, {
      oneTime,
      source: "owner_spoken",
      billId,
      isNew: isNewItem,
    });

    return { rate, amount, flags, effects, updatedItem };
  }

  // 2. Remembered price
  if (item.pricePerUnit !== null) {
    const factor = unitRateFactor(lineUnit, item.defaultUnit);
    if (factor !== null) {
      const rate = roundHalfUp(item.pricePerUnit * factor);
      const amount = roundHalfUp(rate * qty);
      return {
        rate,
        amount,
        flags: [...baseFlags, "auto"],
        effects: [],
        updatedItem: item,
      };
    }
  }

  // 3. Unknown / incompatible unit -> price_needed
  return {
    rate: null,
    amount: 0,
    flags: [...baseFlags, "price_needed"],
    effects: [],
    updatedItem: item,
  };
}
