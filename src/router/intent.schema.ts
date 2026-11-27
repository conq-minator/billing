import { z } from "zod";

export const Unit = z.enum([
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

export type UnitType = z.infer<typeof Unit>;

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
        unit: Unit.nullable(),
        price: z.number().nonnegative().nullable(),
        price_basis: z.enum(["per_unit", "line_total"]).nullable(),
      })
    )
    .default([]),
  target_line: z
    .object({
      ref: z.enum(["last", "name"]),
      name: z.string().nullable(),
    })
    .nullable(),
  changes: z
    .object({
      qty: z.number().positive().nullable(),
      unit: Unit.nullable(),
      price: z.number().nonnegative().nullable(),
      one_time: z.boolean().default(false),
      remove_discount: z.boolean().default(false),
    })
    .nullable(),
  discount: z
    .object({
      kind: z.enum(["percent", "flat", "target_total"]),
      value: z.number().nonnegative(),
      scope: z.enum(["whole", "items", "unspecified"]),
      item_names: z.array(z.string()).default([]),
      is_correction: z.boolean().default(false),
    })
    .nullable(),
  customer: z.object({ name: z.string() }).nullable(),
  payment: z
    .object({
      mode: z.enum(["cash", "upi", "due", "split"]),
      amount: z.number().nonnegative().nullable(),
    })
    .nullable(),
  query: z
    .object({
      type: z.enum([
        "today_summary",
        "dues_list",
        "customer_balance",
        "item_price_history",
        "top_items",
      ]),
      customer: z.string().nullable(),
      item: z.string().nullable(),
    })
    .nullable(),
  answer: z
    .object({
      price: z.number().nullable(),
      scope: z.enum(["whole", "items"]).nullable(),
      item_names: z.array(z.string()).default([]),
      customer: z.string().nullable(),
    })
    .nullable(),
  language: z.enum(["hi", "hinglish", "bn", "en"]),
  confidence: z.number().min(0).max(1),
});

export type Intent = z.infer<typeof IntentSchema>;
