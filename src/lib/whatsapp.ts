import { formatInr } from "@/lib/money";

export function buildWhatsAppBillMessage(params: {
  shopName: string;
  billNo: number;
  totalPaise: number;
  publicUrl: string;
}): string {
  const num = String(params.billNo).padStart(4, "0");
  return `${params.shopName} — Bill #${num}\nTotal: ${formatInr(params.totalPaise)}\nView & Pay: ${params.publicUrl}`;
}

export function buildWhatsAppUrl(params: {
  phone?: string | null;
  text: string;
}): string {
  const digits = params.phone?.replace(/\D/g, "") ?? "";
  const target = digits
    ? digits.startsWith("91")
      ? digits
      : `91${digits}`
    : "";
  return `https://wa.me/${target}?text=${encodeURIComponent(params.text)}`;
}
