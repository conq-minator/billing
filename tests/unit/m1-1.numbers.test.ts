import { describe, expect, it } from "vitest";
import { normalizeItemName, normalizeText } from "@/engine/normalize";
import { parseQtyWords } from "@/engine/numbers";

describe("M1.1 normalize & transliteration", () => {
  it("transliterates Devanagari and Bengali to Latin lowercase", () => {
    expect(normalizeItemName("अरहर दाल")).toBe("arahara dala");
    expect(normalizeItemName("আটা")).toBe("ata");
    expect(normalizeText("आटा 5 किलो जी", "hi")).toContain("5");
  });

  it("strips filler words when language is provided", () => {
    expect(normalizeText("dal ek kilo dena bhaiya ji", "hi")).toBe("dal ek kilo");
    expect(normalizeText("chal ek kilo dao dada", "bn")).toBe("chal ek kilo");
  });
});

describe("M1.1 PRD FR-5.2 number words (hi + bn)", () => {
  it.each([
    [["ek"], "hi", 1],
    [["do"], "hi", 2],
    [["teen"], "hi", 3],
    [["chaar"], "hi", 4],
    [["paanch"], "hi", 5],
    [["chhe"], "hi", 6],
    [["saat"], "hi", 7],
    [["aath"], "hi", 8],
    [["nau"], "hi", 9],
    [["das"], "hi", 10],
    [["aadha"], "hi", 0.5],
    [["paav"], "hi", 0.25],
    [["sawa"], "hi", 1.25],
    [["sawa", "do"], "hi", 2.25],
    [["dedh"], "hi", 1.5],
    [["dhai"], "hi", 2.5],
    [["saadhe", "teen"], "hi", 3.5],
    [["paune", "do"], "hi", 1.75],
    [["sau"], "hi", 100],
    [["do", "sau"], "hi", 200],
    [["dhai", "sau"], "hi", 250],
  ] as const)("Hindi: %j -> %s", (tokens, lang, expected) => {
    const res = parseQtyWords([...tokens], lang);
    expect(res?.qty).toBe(expected);
  });

  it.each([
    [["ek"], "bn", 1],
    [["dui"], "bn", 2],
    [["tin"], "bn", 3],
    [["char"], "bn", 4],
    [["panch"], "bn", 5],
    [["chhoy"], "bn", 6],
    [["saat"], "bn", 7],
    [["aat"], "bn", 8],
    [["noy"], "bn", 9],
    [["dosh"], "bn", 10],
    [["adh"], "bn", 0.5],
    [["poa"], "bn", 0.25],
    [["soa"], "bn", 1.25],
    [["soa", "dui"], "bn", 2.25],
    [["der"], "bn", 1.5],
    [["aarai"], "bn", 2.5],
    [["saare", "tin"], "bn", 3.5],
    [["poune", "dui"], "bn", 1.75],
    [["sho"], "bn", 100],
    [["dui", "sho"], "bn", 200],
    [["aarai", "sho"], "bn", 250],
  ] as const)("Bengali: %j -> %s", (tokens, lang, expected) => {
    const res = parseQtyWords([...tokens], lang);
    expect(res?.qty).toBe(expected);
  });

  it("provides unitHint for paav/poa (kg) and sau/sho (g)", () => {
    expect(parseQtyWords(["paav"], "hi")).toEqual({ qty: 0.25, unitHint: "kg" });
    expect(parseQtyWords(["poa"], "bn")).toEqual({ qty: 0.25, unitHint: "kg" });
    expect(parseQtyWords(["do", "sau"], "hi")).toEqual({ qty: 200, unitHint: "g" });
    expect(parseQtyWords(["aarai", "sho"], "bn")).toEqual({ qty: 250, unitHint: "g" });
  });
});
