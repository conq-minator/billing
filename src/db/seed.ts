import { eq } from "drizzle-orm";
import type { AppDb } from "./client";
import { closeDb, getDb } from "./client";
import {
  billLines,
  bills,
  billVersions,
  customers,
  items,
  payments,
  preferences,
  priceHistory,
  shop,
  voiceEvents,
  type DiscountScopeHistoryEntry,
} from "./schema";

export type DemoProfile = "fresh" | "trained";

export const DEMO_SHOP_ID = "00000000-0000-4000-8000-000000000001";

function norm(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

type SeedItem = {
  name: string;
  aliases: string[];
  defaultUnit: string;
  pricePerUnit: number; // paise
};

export const SEED_ITEMS: SeedItem[] = [
  {
    name: "Aashirvaad Atta",
    aliases: ["atta", "aashirvaad atta", "ashirvad atta", "gehu atta", "aata", "আটা"],
    defaultUnit: "kg",
    pricePerUnit: 5200,
  },
  {
    name: "Toor Dal",
    aliases: ["dal", "daal", "arhar dal", "arhar", "toor", "tur dal", "ডাল", "তুর ডাল"],
    defaultUnit: "kg",
    pricePerUnit: 16000,
  },
  {
    name: "Maggi 70g",
    aliases: ["maggi", "maggie", "maggi noodles", "ম্যাগি"],
    defaultUnit: "pkt",
    pricePerUnit: 1400,
  },
  {
    name: "Amul Taaza 500ml",
    aliases: ["doodh", "dudh", "amul doodh", "amul taaza", "milk", "দুধ"],
    defaultUnit: "unit",
    pricePerUnit: 2800,
  },
  {
    name: "Surf Excel 1kg",
    aliases: ["surf", "surf excel", "detergent", "washing powder", "সার্ফ"],
    defaultUnit: "unit",
    pricePerUnit: 14000,
  },
  {
    name: "Basmati Chawal",
    aliases: ["chawal", "chaaval", "chal", "rice", "basmati", "চাল"],
    defaultUnit: "kg",
    pricePerUnit: 9000,
  },
  {
    name: "Jeera",
    aliases: ["jeera", "jira", "cumin", "জিরে"],
    defaultUnit: "kg",
    pricePerUnit: 60000,
  },
  {
    name: "Parle-G",
    aliases: ["parle g", "parle-g", "parleg", "biscuit", "পারলে জি"],
    defaultUnit: "pkt",
    pricePerUnit: 1000,
  },
  {
    name: "Cheeni (Sugar)",
    aliases: ["cheeni", "chini", "sugar", "চিনি"],
    defaultUnit: "kg",
    pricePerUnit: 4600,
  },
  {
    name: "Sarso Tel (Mustard Oil)",
    aliases: ["tel", "sarso tel", "mustard oil", "sorser tel", "সর্ষের তেল"],
    defaultUnit: "l",
    pricePerUnit: 16500,
  },
  {
    name: "Tata Namak (Salt)",
    aliases: ["namak", "salt", "tata namak", "noon", "নুন"],
    defaultUnit: "pkt",
    pricePerUnit: 2800,
  },
  {
    name: "Tata Tea Gold 250g",
    aliases: ["chai", "chai patti", "tea", "cha", "চা"],
    defaultUnit: "pkt",
    pricePerUnit: 14500,
  },
  {
    name: "Lux Soap",
    aliases: ["sabun", "lux", "soap", "saban", "সাবান"],
    defaultUnit: "pc",
    pricePerUnit: 3500,
  },
  {
    name: "Colgate Toothpaste 100g",
    aliases: ["colgate", "toothpaste", "manjan", "মাজন"],
    defaultUnit: "pc",
    pricePerUnit: 6500,
  },
  {
    name: "Lifebuoy Soap",
    aliases: ["lifebuoy", "laifbuoy"],
    defaultUnit: "pc",
    pricePerUnit: 3200,
  },
  {
    name: "Haldi Powder 100g",
    aliases: ["haldi", "turmeric", "holud", "হলুদ"],
    defaultUnit: "pkt",
    pricePerUnit: 3800,
  },
  {
    name: "Lal Mirch Powder 100g",
    aliases: ["mirch", "lal mirch", "chilli powder", "lonka", "লঙ্কা"],
    defaultUnit: "pkt",
    pricePerUnit: 4500,
  },
  {
    name: "Dhaniya Powder 100g",
    aliases: ["dhaniya", "coriander", "dhone", "ধনে"],
    defaultUnit: "pkt",
    pricePerUnit: 3400,
  },
  {
    name: "Besan 500g",
    aliases: ["besan", "gram flour", "বেসন"],
    defaultUnit: "pkt",
    pricePerUnit: 5500,
  },
  {
    name: "Suji 500g",
    aliases: ["suji", "sooji", "rava", "সুজি"],
    defaultUnit: "pkt",
    pricePerUnit: 3200,
  },
  {
    name: "Poha 500g",
    aliases: ["poha", "chire", "চিঁড়ে"],
    defaultUnit: "pkt",
    pricePerUnit: 3600,
  },
  {
    name: "Rajma",
    aliases: ["rajma", "kidney beans", "রাজমা"],
    defaultUnit: "kg",
    pricePerUnit: 15000,
  },
  {
    name: "Chana Dal",
    aliases: ["chana dal", "cholar dal", "ছোলার ডাল"],
    defaultUnit: "kg",
    pricePerUnit: 11000,
  },
  {
    name: "Moong Dal",
    aliases: ["moong dal", "mug dal", "মুগ ডাল"],
    defaultUnit: "kg",
    pricePerUnit: 13500,
  },
  {
    name: "Masoor Dal",
    aliases: ["masoor dal", "musur dal", "মসুর ডাল"],
    defaultUnit: "kg",
    pricePerUnit: 12000,
  },
  {
    name: "Kabuli Chana",
    aliases: ["kabuli chana", "chole", "কাবুলি ছোলা"],
    defaultUnit: "kg",
    pricePerUnit: 14500,
  },
  {
    name: "Fortune Refined Oil 1L",
    aliases: ["refined oil", "fortune oil", "sada tel", "সাদা তেল"],
    defaultUnit: "l",
    pricePerUnit: 14000,
  },
  {
    name: "Amul Ghee 500ml",
    aliases: ["ghee", "amul ghee", "ঘি"],
    defaultUnit: "bottle",
    pricePerUnit: 32500,
  },
  {
    name: "Amul Butter 100g",
    aliases: ["butter", "makhan", "মাখন"],
    defaultUnit: "pkt",
    pricePerUnit: 5800,
  },
  {
    name: "Bread",
    aliases: ["bread", "pav", "pauruti", "পাউরুটি"],
    defaultUnit: "pkt",
    pricePerUnit: 4000,
  },
  {
    name: "Anda (Eggs)",
    aliases: ["anda", "eggs", "dim", "ডিম"],
    defaultUnit: "dozen",
    pricePerUnit: 8400,
  },
  {
    name: "Matchbox (Maachis)",
    aliases: ["maachis", "machis", "matchbox", "deshlai", "দেশলাই"],
    defaultUnit: "pkt",
    pricePerUnit: 1000,
  },
  {
    name: "Agarbatti",
    aliases: ["agarbatti", "dhupkathi", "ধূপকাঠি"],
    defaultUnit: "pkt",
    pricePerUnit: 2500,
  },
  {
    name: "Vim Bar",
    aliases: ["vim", "vim bar", "bartan sabun"],
    defaultUnit: "pc",
    pricePerUnit: 2000,
  },
  {
    name: "Harpic 500ml",
    aliases: ["harpic", "toilet cleaner"],
    defaultUnit: "bottle",
    pricePerUnit: 9900,
  },
  {
    name: "Dettol 125ml",
    aliases: ["dettol", "antiseptic"],
    defaultUnit: "bottle",
    pricePerUnit: 6500,
  },
  {
    name: "Good Day Biscuit",
    aliases: ["good day", "goodday"],
    defaultUnit: "pkt",
    pricePerUnit: 2000,
  },
  {
    name: "Marie Gold",
    aliases: ["marie", "marie gold", "mari"],
    defaultUnit: "pkt",
    pricePerUnit: 3000,
  },
  {
    name: "Parachute Coconut Oil 200ml",
    aliases: ["parachute", "nariyal tel", "narikel tel", "নারকেল তেল"],
    defaultUnit: "bottle",
    pricePerUnit: 9500,
  },
  {
    name: "Odomos Cream",
    aliases: ["odomos", "mosquito cream"],
    defaultUnit: "pc",
    pricePerUnit: 7500,
  },
];

export const SEED_CUSTOMERS = [
  { name: "Sharma ji", phone: "9830011111", balanceDue: 120000 },
  { name: "Gupta ji", phone: "9830022222", balanceDue: 85000 },
  { name: "Rina di", phone: "9830033333", balanceDue: 45000 },
  { name: "Verma ji", phone: null, balanceDue: 32000 },
  { name: "Bose babu", phone: "9830055555", balanceDue: 60000 },
];

export function buildTrainedHistory(now = new Date()): DiscountScopeHistoryEntry[] {
  return Array.from({ length: 5 }, (_, i) => ({
    scope: "whole" as const,
    ts: new Date(now.getTime() - (5 - i) * 60_000).toISOString(),
    correction: false,
  }));
}

export async function seedDatabase(
  db: AppDb,
  profile: DemoProfile = "fresh"
): Promise<void> {
  const existingShop = await db
    .select()
    .from(shop)
    .where(eq(shop.id, DEMO_SHOP_ID));

  if (existingShop.length > 0) {
    // Idempotent: if already seeded, only ensure profile preference matches if requested
    return;
  }

  await db.insert(shop).values({
    id: DEMO_SHOP_ID,
    name: "Sharma General Store",
    address: "12 MG Road, Kolkata",
    phone: "9830012345",
    upiVpa: "sharmastore@okaxis",
    languagePrimary: "hi",
    languageSecondary: "bn",
    nextBillNo: 143,
  });

  const insertedItems = await db
    .insert(items)
    .values(
      SEED_ITEMS.map((item) => ({
        shopId: DEMO_SHOP_ID,
        name: item.name,
        nameNorm: norm(item.name),
        aliases: item.aliases,
        defaultUnit: item.defaultUnit,
        pricePerUnit: item.pricePerUnit,
        priceSource: "owner_spoken",
        timesUsed: 5,
      }))
    )
    .returning();

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  await db.insert(priceHistory).values(
    insertedItems.slice(0, 10).map((it) => ({
      itemId: it.id,
      pricePerUnit: it.pricePerUnit ?? 0,
      unit: it.defaultUnit,
      source: "owner_spoken",
      createdAt: threeDaysAgo,
    }))
  );

  const insertedCustomers = await db
    .insert(customers)
    .values(
      SEED_CUSTOMERS.map((c) => ({
        shopId: DEMO_SHOP_ID,
        name: c.name,
        nameNorm: norm(c.name),
        phone: c.phone,
        balanceDue: c.balanceDue,
      }))
    )
    .returning();

  const isTrained = profile === "trained";
  await db.insert(preferences).values({
    shopId: DEMO_SHOP_ID,
    discountScopeHistory: isTrained ? buildTrainedHistory() : [],
    discountScopeLearned: isTrained ? "whole" : null,
    otherPrefs: {},
  });

  // Seed one finalised bill from earlier today so Aaj ka hisaab has data
  const atta = insertedItems[0];
  const dal = insertedItems[1];
  const sharma = insertedCustomers[0];

  const [sampleBill] = await db
    .insert(bills)
    .values({
      shopId: DEMO_SHOP_ID,
      billNo: 142,
      publicId: "demo00000142",
      customerId: sharma.id,
      status: "final",
      subtotal: 42000,
      total: 42000,
      paidUpi: 42000,
      balanceDue: 0,
      finalizedAt: new Date(),
    })
    .returning();

  await db.insert(billLines).values([
    {
      billId: sampleBill.id,
      lineNo: 1,
      itemId: atta.id,
      nameSnapshot: atta.name,
      qty: "5",
      unit: "kg",
      rate: 5200,
      amount: 26000,
      flags: ["auto"],
    },
    {
      billId: sampleBill.id,
      lineNo: 2,
      itemId: dal.id,
      nameSnapshot: dal.name,
      qty: "1",
      unit: "kg",
      rate: 16000,
      amount: 16000,
      flags: ["auto"],
    },
  ]);

  await db.insert(payments).values({
    shopId: DEMO_SHOP_ID,
    customerId: sharma.id,
    billId: sampleBill.id,
    amount: 42000,
    mode: "upi",
  });
}

export async function resetDatabase(
  db: AppDb,
  profile: DemoProfile = "fresh"
): Promise<void> {
  await db.delete(voiceEvents);
  await db.delete(billVersions);
  await db.delete(payments);
  await db.delete(billLines);
  await db.delete(bills);
  await db.delete(priceHistory);
  await db.delete(preferences);
  await db.delete(customers);
  await db.delete(items);
  await db.delete(shop);

  await seedDatabase(db, profile);
}

if (require.main === module) {
  const db = getDb();
  const profileArg = (process.argv[2] as DemoProfile) || "fresh";
  seedDatabase(db, profileArg)
    .then(async () => {
      console.log(`Seeded database (profile: ${profileArg}).`);
      await closeDb();
    })
    .catch(async (err) => {
      console.error("Seed failed:", err);
      await closeDb();
      process.exit(1);
    });
}
