import QRCode from "qrcode";
import { BILL_NO_PAD_LENGTH } from "@/config/constants";
import { paiseToDecimalString, type Money } from "@/lib/money";

export function buildUpiUri(params: {
  vpa: string;
  name: string;
  amountPaise: Money;
  billNo: number;
}): string {
  const { vpa, name, amountPaise, billNo } = params;
  const am = paiseToDecimalString(Math.max(0, amountPaise));
  const tn = `Bill ${String(billNo).padStart(BILL_NO_PAD_LENGTH, "0")}`;
  return `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(name)}&am=${am}&cu=INR&tn=${encodeURIComponent(tn)}`;
}

export async function generateQrSvg(uri: string): Promise<string> {
  return QRCode.toString(uri, { type: "svg", margin: 1, width: 240 });
}

export async function generateQrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, { margin: 1, width: 240 });
}
