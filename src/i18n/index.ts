import type { Lang } from "@/engine/types";
import { bn } from "./bn";
import { en } from "./en";
import { hi, type I18nDict } from "./hi";

const DICTS: Record<Lang, I18nDict> = { hi, bn, en };

export function getDict(lang: Lang): I18nDict {
  return DICTS[lang] ?? hi;
}

export function tFormat(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in vars ? String(vars[key]) : ""
  );
}
