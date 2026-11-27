import { z } from "zod";

export const RawUnitEnum = z.enum([
  "kg",
  "g",
  "l",
  "ml",
  "pkt",
  "pc",
  "dozen",
  "box",
  "bottle",
  "bag",
  "m",
  "unit",
]);

export const Unit = z.preprocess((val) => {
  if (typeof val !== "string") return val;
  const v = val.toLowerCase().trim();
  if (v === "kilo" || v === "kg" || v === "kilogram" || v === "kgs" || v === "kilos") return "kg";
  if (v === "gram" || v === "gm" || v === "g" || v === "gms" || v === "grams") return "g";
  if (v === "liter" || v === "litre" || v === "ltr" || v === "l" || v === "litres" || v === "liters") return "l";
  if (v === "ml" || v === "milliliter" || v === "millilitre") return "ml";
  if (v === "packet" || v === "pkt" || v === "pack" || v === "pkts" || v === "packets" || v === "pouch") return "pkt";
  if (v === "pc" || v === "piece" || v === "pcs" || v === "pieces" || v === "ta" || v === "ti") return "pc";
  if (v === "dozen" || v === "darjan" || v === "doz") return "dozen";
  if (v === "box" || v === "dabba" || v === "boxes") return "box";
  if (v === "bottle" || v === "botal" || v === "bottles") return "bottle";
  if (v === "bag" || v === "bora" || v === "bags") return "bag";
  if (v === "m" || v === "meter" || v === "metre") return "m";
  if (v === "unit" || v === "units") return "unit";
  return v;
}, RawUnitEnum);

export type UnitType = z.infer<typeof RawUnitEnum>;
export const UnitOptions = RawUnitEnum.options;

// Attach .options so existing code using Unit.options works seamlessly
(Unit as unknown as { options: readonly UnitType[] }).options = RawUnitEnum.options;

export const IntentSchema = z.object({
  intent: z.enum([
    "ADD_ITEMS",
    "EDIT_LINE",
    "REMOVE_LINE",
    "SET_PRICE",
    "APPLY_DISCOUNT",
    "SET_CUSTOMER",
    "FINISH_BILL",
    "RECORD_PAYMENT",
    "QUERY_LEDGER",
    "QUERY_PRICE",
    "SEND_REMINDER",
    "READ_BILL",
    "ANSWER_PENDING_QUESTION",
    "UNKNOWN",
  ]),
  items: z
    .array(
      z.object({
        name: z.string(),
        qty: z.number().positive().default(1),
        unit: Unit.nullish().default(null),
        price: z.number().nonnegative().nullish().default(null),
        price_basis: z.enum(["per_unit", "line_total"]).nullish().default(null),
      })
    )
    .default([]),
  target_line: z
    .object({
      ref: z.enum(["last", "name"]),
      name: z.string().nullish().default(null),
    })
    .nullish()
    .default(null),
  changes: z
    .object({
      name: z.string().nullish().default(null),
      qty: z.number().positive().nullish().default(null),
      unit: Unit.nullish().default(null),
      price: z.number().nonnegative().nullish().default(null),
      one_time: z.boolean().default(false),
      remove_discount: z.boolean().default(false),
    })
    .nullish()
    .default(null),
  discount: z
    .object({
      kind: z.enum(["percent", "flat", "target_total"]),
      value: z.number().nonnegative(),
      scope: z.enum(["whole", "items", "unspecified"]),
      item_names: z.array(z.string()).default([]),
      is_correction: z.boolean().default(false),
    })
    .nullish()
    .default(null),
  customer: z.object({ name: z.string() }).nullish().default(null),
  payment: z
    .object({
      mode: z.enum(["cash", "upi", "due", "split"]),
      amount: z.number().nonnegative().nullish().default(null),
    })
    .nullish()
    .default(null),
  query: z
    .object({
      type: z.enum([
        "today_summary",
        "dues_list",
        "customer_balance",
        "item_price_history",
        "top_items",
      ]),
      customer: z.string().nullish().default(null),
      item: z.string().nullish().default(null),
    })
    .nullish()
    .default(null),
  answer: z
    .object({
      price: z.number().nullish().default(null),
      scope: z.enum(["whole", "items"]).nullish().default(null),
      item_names: z.array(z.string()).default([]),
      customer: z.string().nullish().default(null),
    })
    .nullish()
    .default(null),
  language: z.enum(["hi", "hinglish", "bn", "en"]),
  confidence: z.number().min(0).max(1),
});

export type Intent = z.infer<typeof IntentSchema>;
