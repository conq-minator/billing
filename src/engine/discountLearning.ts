import {
  DISCOUNT_LEARN_AGREEMENT,
  DISCOUNT_LEARN_MIN_ANSWERS,
} from "@/config/constants";
import type { DiscountScopeHistoryEntry } from "@/db/schema";
import type { PreferencesRecord } from "./types";

export function evaluateLearnedScope(
  history: DiscountScopeHistoryEntry[]
): "whole" | "items" | null {
  if (history.length < DISCOUNT_LEARN_MIN_ANSWERS) return null;

  let wholeCount = 0;
  let itemsCount = 0;
  for (const h of history) {
    if (h.scope === "whole") wholeCount++;
    else itemsCount++;
  }

  const total = history.length;
  const wholeShare = wholeCount / total;
  const itemsShare = itemsCount / total;

  if (wholeShare >= DISCOUNT_LEARN_AGREEMENT) return "whole";
  if (itemsShare >= DISCOUNT_LEARN_AGREEMENT) return "items";
  return null;
}

export function recordDiscountScopeAnswer(
  prefs: PreferencesRecord,
  scope: "whole" | "items",
  wasCorrection: boolean,
  now: Date
): PreferencesRecord {
  const nextHistory: DiscountScopeHistoryEntry[] = [
    ...prefs.discountScopeHistory,
    { scope, ts: now.toISOString(), correction: wasCorrection },
  ];

  // If this was a correction against a previously learned scope,
  // add a strong counter-vote so agreement reflects the correction (PRD FR-7.2).
  if (wasCorrection) {
    nextHistory.push({
      scope,
      ts: now.toISOString(),
      correction: true,
    });
  }

  return {
    ...prefs,
    discountScopeHistory: nextHistory,
    discountScopeLearned: evaluateLearnedScope(nextHistory),
  };
}

export function resetDiscountPrefs(
  prefs: PreferencesRecord
): PreferencesRecord {
  return {
    ...prefs,
    discountScopeHistory: [],
    discountScopeLearned: null,
  };
}
