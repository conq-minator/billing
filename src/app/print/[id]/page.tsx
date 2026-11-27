import { notFound } from "next/navigation";
import { generateQrSvg } from "@/bill/upi";
import { toBillViewModel } from "@/bill/viewModel";
import { PrintTrigger } from "@/components/PrintTrigger";
import { getDb } from "@/db/client";
import { getShopRow, loadBillById } from "@/db/repo/bills";

export const dynamic = "force-dynamic";

export default async function PrintBillPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const db = getDb();
  const bill = await loadBillById(db, id);
  if (!bill) notFound();

  const shopRow = await getShopRow(db, bill.shopId);
  if (!shopRow) notFound();

  const vm = toBillViewModel(bill, shopRow, "hi");
  const qrSvg = await generateQrSvg(vm.upiUri);

  return (
    <div className="mx-auto w-[58mm] bg-white p-2 font-mono text-[11px] leading-tight text-black">
      <PrintTrigger />
      <div className="text-center">
        <div className="text-sm font-bold uppercase">{vm.shopName}</div>
        <div>{vm.shopAddress}</div>
        <div>{vm.shopPhone}</div>
      </div>

      <div className="my-2 border-y border-dashed border-black py-1 text-[10px]">
        <div>Bill No: {vm.billNoFormatted}</div>
        <div>{vm.timestamp}</div>
        <div>Customer: {vm.customerName}</div>
      </div>

      <table className="w-full text-[10px]">
        <thead>
          <tr className="border-b border-dashed border-black text-left">
            <th>Item</th>
            <th className="text-right">Qty</th>
            <th className="text-right">Amt</th>
          </tr>
        </thead>
        <tbody>
          {vm.lines.map((l) => (
            <tr key={l.lineNo}>
              <td className="pr-1">{l.name}</td>
              <td className="text-right whitespace-nowrap">{l.qtyText}</td>
              <td className="text-right whitespace-nowrap">{l.amountText}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-2 border-t border-dashed border-black pt-1 space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{vm.subtotalText}</span>
        </div>
        {vm.billDiscountText && (
          <div className="flex justify-between">
            <span>{vm.billDiscountLabel}</span>
            <span>{vm.billDiscountText}</span>
          </div>
        )}
        {vm.roundOffText && (
          <div className="flex justify-between">
            <span>Round off</span>
            <span>{vm.roundOffText}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-black pt-1 text-xs font-bold">
          <span>TOTAL</span>
          <span>{vm.totalText}</span>
        </div>
      </div>

      <div className="mt-2 flex flex-col items-center">
        <div
          className="h-28 w-28"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <div className="mt-1 text-[10px]">Scan to Pay · Boli-Quote</div>
      </div>
    </div>
  );
}
