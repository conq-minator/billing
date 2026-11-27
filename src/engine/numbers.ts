import type { UnitType } from "@/router/intent.schema";
import type { Lang } from "./types";
import { HI_FRACTIONS, HI_MODIFIERS, HI_NUMBERS } from "./lexicon/hi";
import { BN_FRACTIONS, BN_MODIFIERS, BN_NUMBERS } from "./lexicon/bn";
import { roundQty } from "@/lib/qty";

export type QtyParseResult = {
  qty: number;
  unitHint?: UnitType;
};

function lookupBaseNumber(token: string, lang: Lang): number | null {
  const numeric = Number(token);
  if (!Number.isNaN(numeric) && numeric > 0) {
    return numeric;
  }
  if (lang === "bn") {
    if (token in BN_NUMBERS) return BN_NUMBERS[token];
    if (token in HI_NUMBERS) return HI_NUMBERS[token];
  } else {
    if (token in HI_NUMBERS) return HI_NUMBERS[token];
    if (token in BN_NUMBERS) return BN_NUMBERS[token];
  }
  return null;
}

function lookupFraction(token: string, lang: Lang): number | null {
  if (lang === "bn") {
    if (token in BN_FRACTIONS)
      return BN_FRACTIONS[token as keyof typeof BN_FRACTIONS];
    if (token in HI_FRACTIONS)
      return HI_FRACTIONS[token as keyof typeof HI_FRACTIONS];
  } else {
    if (token in HI_FRACTIONS)
      return HI_FRACTIONS[token as keyof typeof HI_FRACTIONS];
    if (token in BN_FRACTIONS)
      return BN_FRACTIONS[token as keyof typeof BN_FRACTIONS];
  }
  return null;
}

function lookupModifier(token: string, lang: Lang): number | null {
  if (lang === "bn") {
    if (token in BN_MODIFIERS)
      return BN_MODIFIERS[token as keyof typeof BN_MODIFIERS];
    if (token in HI_MODIFIERS)
      return HI_MODIFIERS[token as keyof typeof HI_MODIFIERS];
  } else {
    if (token in HI_MODIFIERS)
      return HI_MODIFIERS[token as keyof typeof HI_MODIFIERS];
    if (token in BN_MODIFIERS)
      return BN_MODIFIERS[token as keyof typeof BN_MODIFIERS];
  }
  return null;
}

/**
 * Parses Hindi/Bengali/numeric quantity words from a token list.
 * Supports:
 * - "aadha" (0.5), "paav" / "poa" (0.25, unitHint "kg")
 * - "dedh" / "der" (1.5), "dhai" / "aarai" (2.5)
 * - "sawa" alone (1.25), "sawa N" (N + 0.25)
 * - "saadhe N" / "saare N" (N + 0.5)
 * - "paune N" / "poune N" (N - 0.25)
 * - "sau" / "sho" (100), "do sau" / "dui sho" (200), "dhai sau" / "aarai sho" (250)
 */
export function parseQtyWords(
  tokens: string[],
  lang: Lang = "hi"
): QtyParseResult | null {
  const clean = tokens
    .map((t) => t.toLowerCase().trim())
    .filter((t) => t.length > 0);
  if (clean.length === 0) return null;

  const first = clean[0];
  const second = clean[1];

  // Check modifiers: sawa / saadhe / paune + N
  const mod = lookupModifier(first, lang);
  if (mod !== null) {
    if (second) {
      const base = lookupBaseNumber(second, lang);
      if (base !== null) {
        const val = roundQty(base + mod);
        if (val > 0) return { qty: val };
      }
    }
    // "sawa" alone = 1.25
    if (mod === 0.25) {
      return { qty: 1.25 };
    }
    return null;
  }

  // Check hundreds: "do sau" (200), "dhai sau" (250), "dui sho" (200), "aarai sho" (250)
  if (second && (second === "sau" || second === "so" || second === "sho" || second === "shoto")) {
    const mult = lookupFraction(first, lang) ?? lookupBaseNumber(first, lang);
    if (mult !== null) {
      return { qty: roundQty(mult * 100), unitHint: "g" };
    }
  }

  // Check standalone fraction words: aadha, paav, dedh, dhai, adh, poa, der, aarai
  const frac = lookupFraction(first, lang);
  if (frac !== null) {
    if (first === "paav" || first === "pav" || first === "poa" || first === "poya") {
      return { qty: frac, unitHint: "kg" };
    }
    return { qty: frac };
  }

  // Check base number: "ek", "do", ..., "sau", "sho", or numeric "5", "0.5"
  const base = lookupBaseNumber(first, lang);
  if (base !== null) {
    if (first === "sau" || first === "so" || first === "sho" || first === "shoto") {
      return { qty: base, unitHint: "g" };
    }
    return { qty: roundQty(base) };
  }

  return null;
}
