import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { generateQrSvg } from "@/bill/upi";
import { toBillViewModel } from "@/bill/viewModel";
import { getDb } from "@/db/client";
import { getShopRow, loadBillById } from "@/db/repo/bills";
import { bills } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function PublicBillPage(props: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = props.params ? await props.params : { publicId: "" };
  const db = getDb();
  const [row] = await db
    .select({ id: bills.id })
    .from(bills)
    .where(eq(bills.publicId, publicId));
  if (!row) notFound();

  const bill = await loadBillById(db, row.id);
  if (!bill) notFound();

  const shopRow = await getShopRow(db, bill.shopId);
  if (!shopRow) notFound();

  const vm = toBillViewModel(bill, shopRow, "hi");
  const qrSvg = await generateQrSvg(vm.upiUri);

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-stone-50 p-4">
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
        <div className="text-center">
          <h1 className="text-xl font-bold text-stone-900">{vm.shopName}</h1>
          <p className="text-xs text-stone-500">
            {vm.shopAddress} · {vm.shopPhone}
          </p>
          <span className="mt-1 inline-block rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-700">
            {vm.title}
          </span>
        </div>

        <div className="my-4 flex justify-between border-y border-stone-200 py-2 text-xs text-stone-600">
          <span>Bill #{vm.billNoFormatted}</span>
          <span>{vm.customerName}</span>
          <span>{vm.timestamp}</span>
        </div>

        <ul className="divide-y divide-stone-100 text-sm">
          {vm.lines.map((l) => (
            <li key={l.lineNo} className="flex justify-between py-2">
              <div>
                <div className="font-medium text-stone-900">{l.name}</div>
                <div className="text-xs text-stone-500">
                  {l.qtyText} × {l.rateText}
                </div>
              </div>
              <div className="font-semibold tabular-nums text-stone-900">
                {l.amountText}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-1 border-t border-stone-200 pt-3 text-sm">
          <div className="flex justify-between text-stone-600">
            <span>Subtotal</span>
            <span className="tabular-nums">{vm.subtotalText}</span>
          </div>
          {vm.billDiscountText && (
            <div className="flex justify-between text-emerald-700">
              <span>{vm.billDiscountLabel}</span>
              <span className="tabular-nums">{vm.billDiscountText}</span>
            </div>
          )}
          {vm.roundOffText && (
            <div className="flex justify-between text-xs text-stone-500">
              <span>Round off</span>
              <span className="tabular-nums">{vm.roundOffText}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-stone-200 pt-2 text-lg font-bold text-stone-900">
            <span>TOTAL</span>
            <span className="tabular-nums">{vm.totalText}</span>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center gap-3">
          <div
            className="h-48 w-48 rounded-xl border border-stone-200 p-2"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <a
            href={vm.upiUri}
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-orange-600 px-4 text-sm font-bold text-white hover:bg-orange-700"
          >
            Pay {vm.totalText} with UPI
          </a>
        </div>

        <p className="mt-4 text-center text-xs text-stone-400">
          Thank you! Phir aaiye · Made with Boli-Quote
        </p>
      </div>
    </main>
  );
}
