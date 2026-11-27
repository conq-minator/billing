import { describe, expect, it } from "vitest";
import { canonicalUnit, convertUnit, unitRateFactor } from "@/engine/units";
import { resolveItem } from "@/engine/resolveItem";
import type { ItemRecord } from "@/engine/types";
import { roundHalfUp } from "@/lib/money";

const CATALOGUE: ItemRecord[] = [
  {
    id: "1",
    shopId: "s1",
    name: "Aashirvaad Atta",
    nameNorm: "aashirvaad atta",
    aliases: ["atta", "gehu atta", "aata", "আটা"],
    defaultUnit: "kg",
    pricePerUnit: 5200,
    priceSource: "owner_spoken",
    timesUsed: 5,
    lastUpdated: new Date(),
  },
  {
    id: "2",
    shopId: "s1",
    name: "Toor Dal",
    nameNorm: "toor dal",
    aliases: ["dal", "arhar dal", "arhar", "ডাল"],
    defaultUnit: "kg",
    pricePerUnit: 16000,
    priceSource: "owner_spoken",
    timesUsed: 5,
    lastUpdated: new Date(),
  },
  {
    id: "3",
    shopId: "s1",
    name: "Surf Excel 1kg",
    nameNorm: "surf excel 1kg",
    aliases: ["surf", "surf excel", "সার্ফ"],
    defaultUnit: "unit",
    pricePerUnit: 14000,
    priceSource: "owner_spoken",
    timesUsed: 5,
    lastUpdated: new Date(),
  },
  {
    id: "4",
    shopId: "s1",
    name: "Amul Taaza 500ml",
    nameNorm: "amul taaza 500ml",
    aliases: ["doodh", "dudh", "amul doodh", "milk", "দুধ"],
    defaultUnit: "unit",
    pricePerUnit: 2800,
    priceSource: "owner_spoken",
    timesUsed: 5,
    lastUpdated: new Date(),
  },
];

describe("M1.2 units & conversion", () => {
  it("normalizes unit aliases", () => {
    expect(canonicalUnit("kilo")).toBe("kg");
    expect(canonicalUnit("gram")).toBe("g");
    expect(canonicalUnit("litre")).toBe("l");
    expect(canonicalUnit("packet")).toBe("pkt");
    expect(canonicalUnit("darjan")).toBe("dozen");
  });

  it("converts 500 g @ ₹52/kg = ₹26.00", () => {
    const factor = unitRateFactor("g", "kg");
    expect(factor).toBe(0.001);
    const amount = roundHalfUp(5200 * factor! * 500);
    expect(amount).toBe(2600);
  });

  it("returns null for incompatible units (pkt <-> kg)", () => {
    expect(convertUnit(1, "pkt", "kg")).toBeNull();
    expect(unitRateFactor("pkt", "kg")).toBeNull();
  });

  it("converts dozen <-> pc and l <-> ml", () => {
    expect(convertUnit(1, "dozen", "pc")).toBe(12);
    expect(convertUnit(500, "ml", "l")).toBe(0.5);
  });
});

describe("M1.3 resolveItem", () => {
  it("resolves aliases and fuzzy matches", () => {
    const r1 = resolveItem("arhar dal", CATALOGUE);
    expect("item" in r1 && r1.item.name).toBe("Toor Dal");

    const r2 = resolveItem("Surf", CATALOGUE);
    expect("item" in r2 && r2.item.name).toBe("Surf Excel 1kg");

    const r3 = resolveItem("doodh", CATALOGUE);
    expect("item" in r3 && r3.item.name).toBe("Amul Taaza 500ml");

    const r4 = resolveItem("Ashirvad Atta", CATALOGUE);
    expect("item" in r4 && r4.item.name).toBe("Aashirvaad Atta");
  });

  it("returns newItem when item is not in catalogue", () => {
    const res = resolveItem("Kurkure", CATALOGUE);
    expect("newItem" in res).toBe(true);
    if ("newItem" in res) {
      expect(res.newItem.name).toBe("Kurkure");
      expect(res.newItem.nameNorm).toBe("kurkure");
    }
  });
});
