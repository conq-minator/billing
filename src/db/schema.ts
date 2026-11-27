import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export type SessionState = {
  phase?: "OPEN" | "FINISHING" | "AWAITING_PAYMENT";
  pendingQueue?: Array<{
    kind: "price" | "discount_scope" | "discount_items" | "udhaar_customer";
    lineId?: string;
    itemId?: string;
    itemName?: string;
    unit?: string;
  }>;
  askedAt?: string;
  lastLineId?: string;
  lastAutoScope?: {
    discountKind: "percent" | "flat" | "target_total";
    discountValue: number;
  };
};

export type DiscountScopeHistoryEntry = {
  scope: "whole" | "items";
  ts: string;
  correction: boolean;
};

export const shop = pgTable("shop", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  upiVpa: text("upi_vpa").notNull(),
  gstin: text("gstin"),
  languagePrimary: text("language_primary").notNull().default("hi"),
  languageSecondary: text("language_secondary").notNull().default("bn"),
  nextBillNo: integer("next_bill_no").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const items = pgTable(
  "items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shop.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    nameNorm: text("name_norm").notNull(),
    aliases: text("aliases")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    defaultUnit: text("default_unit").notNull().default("unit"),
    pricePerUnit: bigint("price_per_unit", { mode: "number" }),
    priceSource: text("price_source"),
    timesUsed: integer("times_used").notNull().default(0),
    lastUpdated: timestamp("last_updated", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("items_shop_name_norm_uq").on(table.shopId, table.nameNorm),
    index("items_aliases_gin_idx").using("gin", table.aliases),
    index("items_name_norm_idx").on(table.nameNorm),
    check(
      "items_price_source_chk",
      sql`${table.priceSource} IS NULL OR ${table.priceSource} IN ('owner_spoken', 'owner_edited', 'auto')`
    ),
  ]
);

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shop.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  nameNorm: text("name_norm").notNull(),
  phone: text("phone"),
  balanceDue: bigint("balance_due", { mode: "number" }).notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const bills = pgTable(
  "bills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shop.id, { onDelete: "cascade" }),
    billNo: integer("bill_no").notNull(),
    publicId: text("public_id").notNull().unique(),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("open"),
    sessionState: jsonb("session_state")
      .$type<SessionState>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    clientSeq: integer("client_seq").notNull().default(0),
    version: integer("version").notNull().default(1),
    subtotal: bigint("subtotal", { mode: "number" }).notNull().default(0),
    itemDiscountTotal: bigint("item_discount_total", { mode: "number" })
      .notNull()
      .default(0),
    billDiscountType: text("bill_discount_type"),
    billDiscountValue: numeric("bill_discount_value", {
      precision: 12,
      scale: 3,
    }),
    billDiscountAmount: bigint("bill_discount_amount", { mode: "number" })
      .notNull()
      .default(0),
    roundOff: bigint("round_off", { mode: "number" }).notNull().default(0),
    total: bigint("total", { mode: "number" }).notNull().default(0),
    paidCash: bigint("paid_cash", { mode: "number" }).notNull().default(0),
    paidUpi: bigint("paid_upi", { mode: "number" }).notNull().default(0),
    balanceDue: bigint("balance_due", { mode: "number" }).notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    editedAt: timestamp("edited_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("bills_shop_bill_no_uq").on(table.shopId, table.billNo),
    index("bills_shop_created_idx").on(table.shopId, table.createdAt),
    check(
      "bills_status_chk",
      sql`${table.status} IN ('open', 'final', 'edited')`
    ),
    check(
      "bills_discount_type_chk",
      sql`${table.billDiscountType} IS NULL OR ${table.billDiscountType} IN ('percent', 'flat', 'target_total')`
    ),
  ]
);

export const billLines = pgTable("bill_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  billId: uuid("bill_id")
    .notNull()
    .references(() => bills.id, { onDelete: "cascade" }),
  lineNo: integer("line_no").notNull(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id),
  nameSnapshot: text("name_snapshot").notNull(),
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
  unit: text("unit").notNull(),
  rate: bigint("rate", { mode: "number" }),
  amount: bigint("amount", { mode: "number" }).notNull().default(0),
  lineDiscountType: text("line_discount_type"),
  lineDiscountValue: numeric("line_discount_value", {
    precision: 12,
    scale: 3,
  }),
  lineDiscountAmount: bigint("line_discount_amount", { mode: "number" })
    .notNull()
    .default(0),
  flags: text("flags")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
});

export const priceHistory = pgTable(
  "price_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    pricePerUnit: bigint("price_per_unit", { mode: "number" }).notNull(),
    unit: text("unit").notNull(),
    source: text("source").notNull(),
    billId: uuid("bill_id").references(() => bills.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("price_history_item_created_idx").on(
      table.itemId,
      table.createdAt.desc()
    ),
  ]
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shop.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    billId: uuid("bill_id").references(() => bills.id, {
      onDelete: "set null",
    }),
    amount: bigint("amount", { mode: "number" }).notNull(),
    mode: text("mode").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("payments_mode_chk", sql`${table.mode} IN ('cash', 'upi')`),
  ]
);

export const preferences = pgTable("preferences", {
  shopId: uuid("shop_id")
    .primaryKey()
    .references(() => shop.id, { onDelete: "cascade" }),
  discountScopeHistory: jsonb("discount_scope_history")
    .$type<DiscountScopeHistoryEntry[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  discountScopeLearned: text("discount_scope_learned"),
  otherPrefs: jsonb("other_prefs")
    .$type<Record<string, unknown>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
});

export const voiceEvents = pgTable(
  "voice_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shop.id, { onDelete: "cascade" }),
    billId: uuid("bill_id").references(() => bills.id, {
      onDelete: "set null",
    }),
    transcript: text("transcript").notNull(),
    lang: text("lang").notNull(),
    route: text("route").notNull(),
    intentJson: jsonb("intent_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    outcome: text("outcome").notNull(),
    latencyMs: jsonb("latency_ms")
      .$type<Record<string, number>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "voice_events_route_chk",
      sql`${table.route} IN ('fast', 'llm', 'fallback')`
    ),
    check(
      "voice_events_outcome_chk",
      sql`${table.outcome} IN ('applied', 'clarify', 'error')`
    ),
  ]
);

export const billVersions = pgTable("bill_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  billId: uuid("bill_id")
    .notNull()
    .references(() => bills.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
