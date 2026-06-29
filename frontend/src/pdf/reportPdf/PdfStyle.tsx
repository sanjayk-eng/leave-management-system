import { StyleSheet } from "@react-pdf/renderer";

export const stylesPDF = StyleSheet.create({
  // ── Page ─────────────────────────────────────
  page: {
    paddingTop: 28,
    paddingBottom: 36,
    paddingHorizontal: 28,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    color: "#1f2937",
  },

  // ── Header ───────────────────────────────────
  headerContainer: {
    marginBottom: 20,
    paddingBottom: 12,
    borderBottom: "3px solid #e5e7eb",
  },

  header: {
    fontSize: 20,
    textAlign: "center",
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },

  subHeader: {
    textAlign: "center",
    fontSize: 9,
    color: "#6b7280",
  },

  // ── Report Info ──────────────────────────────
  infoContainer: {
    marginBottom: 18,
    padding: 12,
    border: "1px solid #d1d5db",
    borderRadius: 2,
    backgroundColor: "#f9fafb",
  },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  infoItem: {
    width: "48%",
    marginBottom: 6,
  },

  infoText: {
    fontSize: 8.5,
    color: "#374151",
    lineHeight: 1.4,
  },

  infoLabel: {
    fontWeight: "bold",
    color: "#111827",
  },

  // ── Stats ────────────────────────────────────
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  statCard: {
    width: "18%",
    paddingVertical: 8,
    paddingHorizontal: 5,
    backgroundColor: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: 2,
    alignItems: "center",
  },

  statValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 2,
  },

  statLabel: {
    fontSize: 7,
    color: "#6b7280",
    textAlign: "center",
  },

  // ── Table ────────────────────────────────────
  table: {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: 2,
    overflow: "hidden",
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottom: "1px solid #d1d5db",
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: "center",
  },

  tableHeaderText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#374151",
  },

  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottom: "1px solid #f1f5f9",
    alignItems: "center",
  },

  evenRow: {
    backgroundColor: "#fafafa",
  },

  lastRow: {
    borderBottom: "none",
  },

  // ── Columns ──────────────────────────────────
  colName: {
    width: "18%",
    fontSize: 8.5,
    paddingHorizontal: 2,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "left",
    lineHeight: 1.3,
  },

  colEmail: {
    width: "24%",
    fontSize: 7.8,
    paddingHorizontal: 2,
    color: "#4b5563",
    lineHeight: 1.3,
  },

  colRole: {
    width: "12%",
    fontSize: 7.8,
    textAlign: "center",
    color: "#6b7280",
    fontWeight: "bold",
  },

  colNumber: {
    width: "9%",
    fontSize: 8,
    textAlign: "center",
    color: "#1f2937",
    fontWeight: "bold",
  },

  // ── Empty State ──────────────────────────────
  emptyState: {
    paddingVertical: 36,
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 10,
  },

  // ── Footer ───────────────────────────────────
  footer: {
    marginTop: 20,
    paddingTop: 10,
    borderTop: "1px solid #e5e7eb",
    textAlign: "center",
    fontSize: 7.5,
    color: "#9ca3af",
  },

  footerBold: {
    fontWeight: "bold",
    color: "#6b7280",
  },

  // ── Page Number ──────────────────────────────
  pageNumber: {
    position: "absolute",
    bottom: 14,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 7,
    color: "#9ca3af",
  },
});