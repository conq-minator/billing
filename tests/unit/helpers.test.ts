import { describe, expect, it } from "vitest";
import {
  formatInr,
  formatInrCompact,
  paiseToDecimalString,
  roundHalfUp,
  roundToPaiseStep,
  rupeesToPaise,
} from "@/lib/money";
import { formatQty, roundQty } from "@/lib/qty";
import { daysBetween, getShopDayBounds } from "@/lib/time";

describe("money helpers", () => {
  it("converts rupees to paise with half-up rounding", () => {
    expect(rupeesToPaise(52)).toBe(5200);
    expect(rupeesToPaise(19.995)).toBe(2000);
    expect(roundHalfUp(2.5)).toBe(3);
    expect(roundHalfUp(2.49)).toBe(2);
    expect(roundHalfUp(-2.5)).toBe(-3);
  });

  it("formats paise as decimal string and en-IN currency", () => {
    expect(paiseToDecimalString(62300)).toBe("623.00");
    expect(paiseToDecimalString(-20)).toBe("-0.20");
    expect(formatInr(184000)).toBe("₹1,840.00");
    expect(formatInrCompact(184000)).toBe("₹1,840");
    expect(formatInrCompact(62350)).toBe("₹623.50");
  });

  it("rounds to nearest rupee (100 paise) half-up", () => {
    expect(roundToPaiseStep(62320, 100)).toBe(62300);
    expect(roundToPaiseStep(62350, 100)).toBe(62400);
    expect(roundToPaiseStep(62320, 1)).toBe(62320);
  });
});

describe("qty helpers", () => {
  it("rounds quantities to 3 decimals and formats cleanly", () => {
    expect(roundQty(0.1234)).toBe(0.123);
    expect(roundQty(1.25)).toBe(1.25);
    expect(formatQty(5.0)).toBe("5");
    expect(formatQty(0.25)).toBe("0.25");
  });
});

describe("time helpers", () => {
  it("computes Asia/Kolkata day bounds correctly across UTC midnight", () => {
    // 2026-11-27 20:00 UTC = 2026-11-28 01:30 IST
    const utcEvening = new Date("2026-11-27T20:00:00.000Z");
    const { start, end } = getShopDayBounds(utcEvening, "Asia/Kolkata");
    expect(start.toISOString()).toBe("2026-11-27T18:30:00.000Z");
    expect(end.toISOString()).toBe("2026-11-28T18:30:00.000Z");
  });

  it("computes days between dates", () => {
    const older = new Date("2026-11-24T10:00:00.000Z");
    const newer = new Date("2026-11-27T12:00:00.000Z");
    expect(daysBetween(older, newer)).toBe(3);
  });
});
