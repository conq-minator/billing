import {
  Document,
  Image,
  Page,
  renderToBuffer,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { BillViewModel } from "./viewModel";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10, fontFamily: "Helvetica", color: "#1c1917" },
  header: { textAlign: "center", marginBottom: 12 },
  shopName: { fontSize: 16, fontWeight: "bold" },
  sub: { fontSize: 9, color: "#57534e", marginTop: 2 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#d6d3d1",
    paddingVertical: 6,
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#d6d3d1",
    paddingBottom: 4,
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderColor: "#e7e5e4",
  },
  colIdx: { width: "7%" },
  colItem: { width: "43%" },
  colQty: { width: "16%" },
  colRate: { width: "16%", textAlign: "right" },
  colAmt: { width: "18%", textAlign: "right" },
  totals: { marginTop: 10, alignItems: "flex-end" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "55%",
    paddingVertical: 2,
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "55%",
    borderTopWidth: 1,
    borderColor: "#1c1917",
    paddingTop: 5,
    marginTop: 4,
    fontSize: 13,
    fontWeight: "bold",
  },
  qrBox: { marginTop: 16, alignItems: "center" },
  qrImg: { width: 110, height: 110 },
  footer: { marginTop: 14, textAlign: "center", fontSize: 9, color: "#57534e" },
});

export function BillPdf({
  vm,
  qrDataUrl,
}: {
  vm: BillViewModel;
  qrDataUrl: string;
}) {
  return (
    <Document>
      <Page size="A5" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.shopName}>{vm.shopName}</Text>
          <Text style={styles.sub}>
            {vm.shopAddress} · {vm.shopPhone}
          </Text>
          <Text style={styles.sub}>{vm.title}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text>Bill No: {vm.billNoFormatted}</Text>
          <Text>Customer: {vm.customerName}</Text>
          <Text>{vm.timestamp}</Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colIdx}>#</Text>
          <Text style={styles.colItem}>Item</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colRate}>Rate</Text>
          <Text style={styles.colAmt}>Amount</Text>
        </View>

        {vm.lines.map((l) => (
          <View key={l.lineNo} style={styles.row}>
            <Text style={styles.colIdx}>{l.lineNo}</Text>
            <Text style={styles.colItem}>{l.name}</Text>
            <Text style={styles.colQty}>{l.qtyText}</Text>
            <Text style={styles.colRate}>{l.rateText}</Text>
            <Text style={styles.colAmt}>{l.amountText}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{vm.subtotalText}</Text>
          </View>
          {vm.billDiscountText && (
            <View style={styles.totalRow}>
              <Text>{vm.billDiscountLabel}</Text>
              <Text>{vm.billDiscountText}</Text>
            </View>
          )}
          {vm.roundOffText && (
            <View style={styles.totalRow}>
              <Text>Round off</Text>
              <Text>{vm.roundOffText}</Text>
            </View>
          )}
          <View style={styles.grandTotal}>
            <Text>TOTAL</Text>
            <Text>{vm.totalText}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Paid: {vm.paidText}</Text>
            <Text>Due: {vm.balanceDueText}</Text>
          </View>
        </View>

        {qrDataUrl ? (
          <View style={styles.qrBox}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={qrDataUrl} style={styles.qrImg} />
            <Text style={styles.sub}>Scan to pay via UPI</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>
          Thank you! Phir aaiye · Made with Boli-Quote
        </Text>
      </Page>
    </Document>
  );
}

export async function renderBillPdfBuffer(
  vm: BillViewModel,
  qrDataUrl: string
): Promise<Buffer> {
  return renderToBuffer(<BillPdf vm={vm} qrDataUrl={qrDataUrl} />);
}
