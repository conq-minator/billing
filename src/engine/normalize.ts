import Sanscript from "@indic-transliteration/sanscript";
import type { Lang } from "./types";
import { HI_FILLERS } from "./lexicon/hi";
import { BN_FILLERS } from "./lexicon/bn";

const DEVANAGARI_RE = /[\u0900-\u097F]/;
const BENGALI_RE = /[\u0980-\u09FF]/;

/**
 * Transliterates Devanagari/Bengali script to Latin, lowercases,
 * strips common Hinglish/Bengali fillers and punctuation.
 */
export function normalizeText(input: string, lang?: Lang): string {
  let text = input.trim();
  if (!text) return "";

  if (DEVANAGARI_RE.test(text)) {
    text = Sanscript.t(text, "devanagari", "iast");
  }
  if (BENGALI_RE.test(text)) {
    text = Sanscript.t(text, "bengali", "iast");
  }

  // Strip IAST diacritics to plain ASCII Latin
  text = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  // Unify common phonetic spellings
  text = text
    .replace(/[-_]+/g, " ")
    .replace(/[^\w\s.%]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!lang) return text;

  const fillers = lang === "bn" ? BN_FILLERS : HI_FILLERS;
  const tokens = text.split(" ").filter((t) => t && !fillers.has(t));
  return tokens.join(" ");
}

export function normalizeItemName(input: string): string {
  let text = input.trim();
  if (!text) return "";

  if (DEVANAGARI_RE.test(text)) {
    text = Sanscript.t(text, "devanagari", "iast");
  }
  if (BENGALI_RE.test(text)) {
    text = Sanscript.t(text, "bengali", "iast");
  }

  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
