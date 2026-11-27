import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { SHOP_TIMEZONE } from "@/config/constants";

export function getShopDayBounds(
  now: Date = new Date(),
  tz: string = SHOP_TIMEZONE
): { start: Date; end: Date } {
  const zoned = toZonedTime(now, tz);
  const year = zoned.getFullYear();
  const month = zoned.getMonth();
  const day = zoned.getDate();

  const startLocal = new Date(year, month, day, 0, 0, 0, 0);
  const endLocal = new Date(year, month, day + 1, 0, 0, 0, 0);

  return {
    start: fromZonedTime(startLocal, tz),
    end: fromZonedTime(endLocal, tz),
  };
}

export function formatBillTimestamp(
  date: Date,
  tz: string = SHOP_TIMEZONE
): string {
  return formatInTimeZone(date, tz, "d MMM yyyy, h:mm a");
}

export function daysBetween(older: Date, newer: Date = new Date()): number {
  const diffMs = Math.max(0, newer.getTime() - older.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
