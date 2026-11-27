import type { Money } from "@/lib/money";
import type { Qty } from "@/lib/qty";
import type { UnitType } from "@/router/intent.schema";
import type { DiscountScopeHistoryEntry, SessionState } from "@/db/schema";

export type Lang = "hi" | "bn" | "en";

export type PriceSource = "owner_spoken" | "owner_edited" | "auto";
export type LineFlag = "auto" | "new_item" | "price_needed" | "one_time";
export type DiscountKind = "percent" | "flat" | "target_total";

export type ItemRecord = {
  id: string;
  shopId: string;
  name: string;
  nameNorm: string;
  aliases: string[];
  defaultUnit: UnitType;
  pricePerUnit: Money | null;
  priceSource: PriceSource | null;
  timesUsed: number;
  lastUpdated: Date;
};

export type CustomerRecord = {
  id: string;
  shopId: string;
  name: string;
  nameNorm: string;
  phone: string | null;
  balanceDue: Money;
};

export type PreferencesRecord = {
  shopId: string;
  discountScopeHistory: DiscountScopeHistoryEntry[];
  discountScopeLearned: "whole" | "items" | null;
};

export type BillLine = {
  id: string;
  lineNo: number;
  itemId: string;
  nameSnapshot: string;
  qty: Qty;
  unit: UnitType;
  rate: Money | null;
  amount: Money;
  lineDiscountType: "percent" | "flat" | null;
  lineDiscountValue: number | null;
  lineDiscountAmount: Money;
  flags: LineFlag[];
};

export type Bill = {
  id: string;
  shopId: string;
  billNo: number;
  publicId: string;
  customerId: string | null;
  customerName: string | null;
  status: "open" | "final" | "edited";
  sessionState: SessionState;
  clientSeq: number;
  version: number;
  lines: BillLine[];
  subtotal: Money;
  itemDiscountTotal: Money;
  billDiscountType: DiscountKind | null;
  billDiscountValue: number | null;
  billDiscountAmount: Money;
  roundOff: Money;
  total: Money;
  paidCash: Money;
  paidUpi: Money;
  balanceDue: Money;
  createdAt: Date;
  finalizedAt: Date | null;
  editedAt: Date | null;
};

export type Question = {
  kind: "price" | "discount_scope" | "discount_items" | "udhaar_customer";
  text: string;
  lineId?: string;
  itemId?: string;
  itemName?: string;
  unit?: UnitType;
};

export type LedgerCard = {
  type:
    | "today_summary"
    | "dues_list"
    | "customer_balance"
    | "item_price_history"
    | "top_items";
  title: string;
  data: Record<string, unknown>;
};

export type ItemDraft = {
  id: string;
  shopId: string;
  name: string;
  nameNorm: string;
  aliases: string[];
  defaultUnit: UnitType;
  pricePerUnit: Money | null;
  priceSource: PriceSource | null;
  timesUsed: number;
  isNew?: boolean;
};

export type PriceHistoryDraft = {
  itemId: string;
  pricePerUnit: Money;
  unit: UnitType;
  source: PriceSource;
  billId: string | null;
};

export type CustomerDraft = {
  id: string;
  shopId: string;
  name: string;
  nameNorm: string;
  phone: string | null;
  balanceDue: Money;
  isNew?: boolean;
};

export type PaymentDraft = {
  shopId: string;
  customerId: string | null;
  billId: string | null;
  amount: Money;
  mode: "cash" | "upi";
};

export type Effect =
  | { type: "upsertItem"; item: ItemDraft }
  | { type: "priceHistory"; row: PriceHistoryDraft }
  | { type: "savePrefs"; prefs: PreferencesRecord }
  | { type: "upsertCustomer"; c: CustomerDraft }
  | { type: "payment"; row: PaymentDraft }
  | { type: "customerBalanceDelta"; customerId: string; delta: Money };

export type EngineContext = {
  bill: Bill;
  catalogue: ItemRecord[];
  customers: CustomerRecord[];
  prefs: PreferencesRecord;
  lang: Lang;
  now: Date;
  shopId: string;
};

export type EngineResult = {
  bill: Bill;
  effects: Effect[];
  readback?: { text: string; lang: Lang };
  toast?: string;
  question?: Question;
  clarify?: { transcript: string; suggestion?: string };
  queryResult?: LedgerCard;
};
