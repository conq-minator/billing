import Fuse from "fuse.js";
import { FUSE_ITEM_THRESHOLD } from "@/config/constants";
import { normalizeItemName } from "./normalize";
import type { ItemRecord } from "./types";

export type ResolveItemResult =
  | { item: ItemRecord; score: number }
  | { newItem: { name: string; nameNorm: string } };

function toDisplayName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

export function resolveItem(
  spokenName: string,
  catalogue: ItemRecord[]
): ResolveItemResult {
  const norm = normalizeItemName(spokenName);
  if (!norm) {
    return { newItem: { name: spokenName.trim() || "Item", nameNorm: "item" } };
  }

  // 1. Exact nameNorm match
  const exactName = catalogue.find((it) => it.nameNorm === norm);
  if (exactName) {
    return { item: exactName, score: 0 };
  }

  // 2. Exact alias match
  for (const it of catalogue) {
    for (const alias of it.aliases) {
      if (normalizeItemName(alias) === norm) {
        return { item: it, score: 0 };
      }
    }
  }

  // 3. Fuse.js fuzzy match over nameNorm + normalized aliases
  const searchable = catalogue.map((it) => ({
    item: it,
    nameNorm: it.nameNorm,
    aliasesNorm: it.aliases.map((a) => normalizeItemName(a)),
  }));

  const fuse = new Fuse(searchable, {
    keys: [
      { name: "nameNorm", weight: 0.6 },
      { name: "aliasesNorm", weight: 0.4 },
    ],
    threshold: FUSE_ITEM_THRESHOLD,
    includeScore: true,
    ignoreLocation: true,
  });

  const results = fuse.search(norm);
  if (results.length > 0 && (results[0].score ?? 1) <= FUSE_ITEM_THRESHOLD) {
    return {
      item: results[0].item.item,
      score: results[0].score ?? 0,
    };
  }

  return {
    newItem: {
      name: toDisplayName(spokenName),
      nameNorm: norm,
    },
  };
}
