import { roundHalfUp } from "@/lib/money";
import type { UnitType } from "@/router/intent.schema";
import { unitRateFactor } from "./units";
import type { Effect, ItemRecord, PriceSource } from "./types";

export function learnPrice(
  item: ItemRecord,
  newRateInLineUnit: number,
  lineUnit: UnitType,
  opts: {
    oneTime: boolean;
    source: PriceSource;
    billId: string | null;
    isNew?: boolean;
  }
): { effects: Effect[]; updatedItem: ItemRecord } {
  if (opts.oneTime) {
    return { effects: [], updatedItem: item };
  }

  const factor = unitRateFactor(item.defaultUnit, lineUnit);
  const storedUnit: UnitType = factor !== null ? item.defaultUnit : lineUnit;
  const storedRate =
    factor !== null ? roundHalfUp(newRateInLineUnit * factor) : newRateInLineUnit;

  const updatedItem: ItemRecord = {
    ...item,
    defaultUnit: storedUnit,
    pricePerUnit: storedRate,
    priceSource: opts.source,
    timesUsed: item.timesUsed + 1,
  };

  const effects: Effect[] = [
    {
      type: "upsertItem",
      item: {
        id: updatedItem.id,
        shopId: updatedItem.shopId,
        name: updatedItem.name,
        nameNorm: updatedItem.nameNorm,
        aliases: updatedItem.aliases,
        defaultUnit: updatedItem.defaultUnit,
        pricePerUnit: updatedItem.pricePerUnit,
        priceSource: updatedItem.priceSource,
        timesUsed: updatedItem.timesUsed,
        isNew: opts.isNew,
      },
    },
    {
      type: "priceHistory",
      row: {
        itemId: updatedItem.id,
        pricePerUnit: storedRate,
        unit: storedUnit,
        source: opts.source,
        billId: opts.billId,
      },
    },
  ];

  return { effects, updatedItem };
}
