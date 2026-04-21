import path from "node:path";
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { PayrollPageData } from "@/actions/payroll";
import {
  expandPayrollRowsForDisplay,
  type PayrollDisplayRow,
} from "@/lib/payroll-export-display";
import { formatNorwegianMobileFromRaw } from "@/lib/norwegian-mobile";
import { formatNorwegianAddressLine } from "@/lib/address";
import { formatDate, formatPayrollProjectLabel } from "@/lib/utils";

const notoPath = path.join(
  process.cwd(),
  "node_modules/@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff",
);

let fontReady = false;
function ensureNotoFont() {
  if (fontReady) return;
  Font.register({
    family: "Noto Sans",
    src: notoPath,
  });
  // Unngå automatisk ord-deling som kan splitte e-post over to linjer.
  Font.registerHyphenationCallback((word) => [word]);
  fontReady = true;
}

function fmtHonorar(n: number | null) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("nb-NO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function oneLine(value: string | null | undefined, maxChars: number): string {
  const s = (value ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "—";
  if (s.length <= maxChars) return s;
  return `${s.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}

/**
 * Personnr./kontonr. i PDF: alle siffer med, uavhengig av mellomrom ved lagring.
 * Maskerte verdier (forhåndsvisning) vises i fullt — ikke kutt på tegnlengde før stripping.
 */
function payrollPdfDigitsColumn(
  value: string | null | undefined,
  maxDigits: number,
): string {
  const s = (value ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "—";
  if (s.includes("*")) return s;
  const digits = s.replace(/\D/g, "");
  if (!digits) return "—";
  if (digits.length <= maxDigits) return digits;
  return `${digits.slice(0, Math.max(1, maxDigits - 1))}…`;
}

function fullValue(value: string | null | undefined): string {
  const s = (value ?? "").replace(/\s+/g, " ").trim();
  return s || "—";
}

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontFamily: "Noto Sans",
    fontSize: 7,
    color: "#171717",
  },
  kicker: {
    fontSize: 7,
    letterSpacing: 1.2,
    color: "#737373",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: { fontSize: 13, fontWeight: 700, marginBottom: 3 },
  meta: { fontSize: 8, color: "#525252", marginBottom: 10 },
  pageMeta: { fontSize: 7, color: "#737373", marginBottom: 6 },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#d4d4d4",
    backgroundColor: "#f5f5f5",
    paddingVertical: 4,
    paddingHorizontal: 3,
  },
  th: {
    fontSize: 6,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 4,
    paddingHorizontal: 3,
  },
  sectionRow: {
    backgroundColor: "#f0f9ff",
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginTop: 2,
    marginBottom: 2,
  },
  segmentBanner: {
    backgroundColor: "#fafafa",
    borderBottomWidth: 1,
    borderBottomColor: "#a3a3a3",
    paddingVertical: 5,
    paddingHorizontal: 4,
    marginTop: 4,
    marginBottom: 2,
  },
  cell: { paddingRight: 4 },
  colName: { width: 96 },
  colAddr: { width: 124 },
  colHon: { width: 52 },
  colFp: { width: 32 },
  colPnr: { width: 72 },
  colBank: { width: 72 },
  colMob: { width: 62 },
  colEmail: { width: 156 },
});

const ROWS_PER_PAGE = 24;

function chunkRows<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out.length ? out : [[]];
}

function PayrollPdfRow({ item }: { item: PayrollDisplayRow }) {
  if (item.kind === "banner") {
    return (
      <View style={styles.segmentBanner} wrap={false}>
        <Text style={{ fontSize: 8, fontWeight: 700, letterSpacing: 0.5 }}>
          {item.segment === "crew" ? "Crew" : "Cast"}
        </Text>
      </View>
    );
  }
  const row = item.row;
  if (row.isSectionHeader) {
    return (
      <View style={styles.sectionRow} wrap={false}>
        <Text style={{ fontSize: 8, fontWeight: 700 }}>
          {row.sectionTitle?.trim() || "—"}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.row} wrap={false}>
      <Text style={[styles.cell, styles.colName]}>
        {fullValue(row.fullName)}
      </Text>
      <Text style={[styles.cell, styles.colAddr]}>
        {fullValue(
          formatNorwegianAddressLine({
            addressLine: row.addressLine,
            postalCode: row.postalCode,
            city: row.city,
            country: row.country,
          }),
        )}
      </Text>
      <Text style={[styles.cell, styles.colHon]}>{fmtHonorar(row.honorar)}</Text>
      <Text style={[styles.cell, styles.colFp, { textAlign: "center" }]}>
        {row.includesHolidayPay ? "Ja" : "Nei"}
      </Text>
      <Text style={[styles.cell, styles.colPnr]}>
        {payrollPdfDigitsColumn(row.nationalId, 11)}
      </Text>
      <Text style={[styles.cell, styles.colBank]}>
        {payrollPdfDigitsColumn(row.bankAccount, 11)}
      </Text>
      <Text style={[styles.cell, styles.colMob]}>
        {oneLine(
          formatNorwegianMobileFromRaw(row.mobile) ?? row.mobile?.trim() ?? "",
          12,
        )}
      </Text>
      <Text style={[styles.cell, styles.colEmail]}>
        {fullValue(row.email)}
      </Text>
    </View>
  );
}

export function PayrollPdfDocument({ data }: { data: PayrollPageData }) {
  ensureNotoFont();

  const projectLine = `${formatPayrollProjectLabel(data.project)}${
    data.submitted ? " · Innsendt" : ""
  }`;
  const dateLine = data.documentSavedAt
    ? `Dato: ${formatDate(data.documentSavedAt)}`
    : null;

  const displayRows = expandPayrollRowsForDisplay(data.rows);
  const rowChunks = chunkRows(displayRows, ROWS_PER_PAGE);
  const totalPages = rowChunks.length;

  return (
    <Document>
      {rowChunks.map((chunk, pageIndex) => (
        <Page
          key={pageIndex}
          size="A4"
          orientation="landscape"
          style={styles.page}
        >
          {pageIndex === 0 ? (
            <>
              <Text style={styles.kicker}>Lønningsliste</Text>
              <Text style={styles.title}>{projectLine}</Text>
              {dateLine ? <Text style={styles.meta}>{dateLine}</Text> : null}
            </>
          ) : (
            <Text style={styles.pageMeta}>
              {projectLine}
              {dateLine ? ` · ${dateLine}` : ""}
            </Text>
          )}
          {totalPages > 1 ? (
            <Text style={[styles.pageMeta, { marginBottom: 8 }]}>
              Side {pageIndex + 1} av {totalPages}
            </Text>
          ) : null}

          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colName]}>Navn</Text>
            <Text style={[styles.th, styles.colAddr]}>Adresse</Text>
            <Text style={[styles.th, styles.colHon]}>Honorar</Text>
            <Text style={[styles.th, styles.colFp, { textAlign: "center" }]}>
              Inkl.fp
            </Text>
            <Text style={[styles.th, styles.colPnr]}>Personnr.</Text>
            <Text style={[styles.th, styles.colBank]}>Kontonr.</Text>
            <Text style={[styles.th, styles.colMob]}>Mobil</Text>
            <Text style={[styles.th, styles.colEmail]}>E-post</Text>
          </View>

          {chunk.length === 0 ? (
            <Text style={{ marginTop: 12, color: "#737373" }}>
              Ingen rader lagret ennå.
            </Text>
          ) : null}

          {chunk.map((item) => (
            <PayrollPdfRow
              key={item.kind === "banner" ? item.id : item.row.id}
              item={item}
            />
          ))}
        </Page>
      ))}
    </Document>
  );
}
