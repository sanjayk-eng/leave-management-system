/**
 * pdfShared.tsx
 *
 * Single source of truth for all react-pdf styles and layout primitives.
 * Both LeaveReport and PolicyReport templates import from here.
 *
 * react-pdf CSS notes:
 *  - No gap shorthand  → use marginRight on children
 *  - No textTransform  → call .toUpperCase() in JSX
 *  - No overflow:hidden on View
 *  - border shorthand unreliable → always use borderWidth/Color/Style per side
 */

import { StyleSheet, View, Text } from "@react-pdf/renderer";

// ─────────────────────────────────────────────────────────────────────────────
// 1. DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────

const COLOR = {
  white:       "#ffffff",
  bodyText:    "#1f2937",
  headingText: "#111827",
  mutedText:   "#6b7280",
  subtleText:  "#9ca3af",
  labelText:   "#374151",
  border:      "#e5e7eb",
  borderLight: "#f1f5f9",
  borderInfo:  "#d1d5db",
  bgPage:      "#ffffff",
  bgInfo:      "#f9fafb",
  bgStat:      "#f8fafc",
  bgTableHead: "#f3f4f6",
  bgTableAlt:  "#fafafa",
  bgBadge:     "#e5e7eb",
  orange:      "#b45309",
  green:       "#047857",
  paid:        "#15803d",
  unpaid:      "#dc2626",
  early:       "#b45309",
  dash:        "#9ca3af",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 2. SHARED STYLESHEET
// ─────────────────────────────────────────────────────────────────────────────

export const pdfStyles = StyleSheet.create({

  // ── Page ──────────────────────────────────────────────────────────────────
  page: {
    paddingTop: 28,
    paddingBottom: 48,
    paddingHorizontal: 28,
    fontSize: 9,
    fontFamily: "Helvetica",
    backgroundColor: COLOR.bgPage,
    color: COLOR.bodyText,
  },

  // ── Document header (title + subtitle) ────────────────────────────────────
  headerContainer: {
    marginBottom: 18,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: COLOR.border,
    borderBottomStyle: "solid",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    color: COLOR.headingText,
    marginBottom: 3,
  },
  headerSub: {
    fontSize: 8.5,
    textAlign: "center",
    color: COLOR.mutedText,
  },

  // ── Info metadata box ──────────────────────────────────────────────────────
  infoBox: {
    marginBottom: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: COLOR.borderInfo,
    borderStyle: "solid",
    borderRadius: 2,
    backgroundColor: COLOR.bgInfo,
  },
  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  infoItem:  { width: "48%", marginBottom: 5 },
  infoText:  { fontSize: 8, color: COLOR.labelText, lineHeight: 1.4 },
  infoLabel: { fontWeight: "bold", color: COLOR.headingText },

  // ── Stat cards row ─────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    marginRight: 6,          // replaces gap — override last card with statCardLast
    paddingVertical: 7,
    paddingHorizontal: 4,
    backgroundColor: COLOR.bgStat,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderStyle: "solid",
    borderRadius: 2,
    alignItems: "center",
  },
  statCardLast: { marginRight: 0 },
  statValue: {
    fontSize: 13,
    fontWeight: "bold",
    color: COLOR.headingText,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 6.5,
    color: COLOR.mutedText,
    textAlign: "center",
  },

  // ── Generic table primitives ───────────────────────────────────────────────
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: COLOR.borderInfo,
    borderStyle: "solid",
    borderRadius: 2,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: COLOR.bgTableHead,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.borderInfo,
    borderBottomStyle: "solid",
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  tableHeaderText: {
    fontSize: 7,
    fontWeight: "bold",
    color: COLOR.mutedText,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.borderLight,
    borderBottomStyle: "solid",
    alignItems: "center",
  },
  tableRowEven:  { backgroundColor: COLOR.bgTableAlt },
  tableRowLast:  { borderBottomWidth: 0 },

  // ── Common column helpers ──────────────────────────────────────────────────
  colBold:  { fontWeight: "bold", color: COLOR.headingText },
  colMuted: { color: COLOR.mutedText },
  colRight: { textAlign: "right" },
  colCenter:{ textAlign: "center" },
  colOrange:{ color: COLOR.orange },
  colGreen: { color: COLOR.green },
  colDash:  { color: COLOR.dash },

  // ── Leave type badge colours (text only in PDF) ────────────────────────────
  typePaid:   { color: COLOR.paid,   fontWeight: "bold" },
  typeUnpaid: { color: COLOR.unpaid, fontWeight: "bold" },
  typeEarly:  { color: COLOR.early,  fontWeight: "bold" },

  // ── Role badge ─────────────────────────────────────────────────────────────
  roleBadge: {
    fontSize: 7,
    color: COLOR.labelText,
    fontWeight: "bold",
    paddingHorizontal: 5,
    paddingVertical: 2,
    backgroundColor: COLOR.bgBadge,
    borderRadius: 2,
  },

  // ── Empty state ────────────────────────────────────────────────────────────
  emptyState: {
    paddingVertical: 36,
    textAlign: "center",
    color: COLOR.subtleText,
    fontSize: 10,
  },

  // ── Footer (absolute — sticks to bottom of every page) ────────────────────
  footer: {
    position: "absolute",
    bottom: 18,
    left: 28,
    right: 28,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: COLOR.border,
    borderTopStyle: "solid",
    textAlign: "center",
    fontSize: 7,
    color: COLOR.subtleText,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. SHARED HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const PDF_MONTHS = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** Format a leave number: "—" for zero, integer or 1-decimal string otherwise. */
export function fmtPdf(n: number): string {
  if (n === 0) return "—";
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

// Builds a human-readable period string from the from/to month+year fields.
export function buildPeriodLabel(d: {
  report_type: string;
  from_month: number; from_year: number;
  to_month: number;   to_year: number;
}): string {
  if (d.report_type === "monthly")
    return `${PDF_MONTHS[d.from_month]} ${d.from_year}`;
  if (d.report_type === "yearly")
    return String(d.from_year);
  return `${PDF_MONTHS[d.from_month]} ${d.from_year} – ${PDF_MONTHS[d.to_month]} ${d.to_year}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SHARED PDF LAYOUT COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const s = pdfStyles; // local alias for brevity

/** Page title + subtitle band. */
export function PdfHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={s.headerContainer}>
      <Text style={s.headerTitle}>{title}</Text>
      <Text style={s.headerSub}>{subtitle}</Text>
    </View>
  );
}

/** 2-column metadata grid (report type, period, total employees, generated-at). */
export function PdfInfoBox(props: {
  reportType: string;
  period: string;
  totalEmployees: number;
  generatedAt: string;
}) {
  const items = [
    { label: "Report Type",      value: props.reportType.toUpperCase() },
    { label: "Period",           value: props.period },
    { label: "Total Employees",  value: String(props.totalEmployees) },
    { label: "Generated",        value: props.generatedAt },
  ];
  return (
    <View style={s.infoBox}>
      <View style={s.infoRow}>
        {items.map((item) => (
          <View key={item.label} style={s.infoItem}>
            <Text style={s.infoText}>
              <Text style={s.infoLabel}>{item.label + ": "}</Text>
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Row of stat cards. Each card: { label, value }. */
export function PdfStatCards({ stats }: { stats: { label: string; value: string }[] }) {
  return (
    <View style={s.statsRow}>
      {stats.map((stat, idx) => (
        <View
          key={stat.label}
          style={[s.statCard, idx === stats.length - 1 ? s.statCardLast : {}]}
        >
          <Text style={s.statValue}>{stat.value}</Text>
          <Text style={s.statLabel}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** Absolute footer line on every page. */
export function PdfFooter({ text }: { text: string }) {
  return <Text style={s.footer}>{text}</Text>;
}

/** Empty-state centred message. */
export function PdfEmptyState({ message }: { message: string }) {
  return (
    <View style={{ paddingVertical: 36, alignItems: "center" }}>
      <Text style={{ color: "#9ca3af", fontSize: 10 }}>{message}</Text>
    </View>
  );
}
