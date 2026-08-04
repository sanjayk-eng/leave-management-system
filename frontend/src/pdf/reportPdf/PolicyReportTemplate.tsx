import { View, Text, Page } from "@react-pdf/renderer";
import type { LeavePolicyReportResponse, LeavePolicyEntry } from "@/types";
import {
  pdfStyles as s,
  fmtPdf,
  buildPeriodLabel,
  PdfHeader,
  PdfInfoBox,
  PdfStatCards,
  PdfFooter,
  PdfEmptyState,
} from "./pdfShared";

type ReportData = LeavePolicyReportResponse["data"];

// ── Policy-specific column widths ─────────────────────────────────────────────

const PC = {
  policy:   { width: "38%", fontSize: 8,   color: "#111827" },
  type:     { width: "14%", fontSize: 7.5, textAlign: "center" as const },
  used:     { width: "16%", fontSize: 8,   textAlign: "right"  as const },
  balance:  { width: "16%", fontSize: 8,   textAlign: "right"  as const },
  usagePct: { width: "16%", fontSize: 7.5, textAlign: "right"  as const, color: "#6b7280" },
};

// ── Usage percentage ──────────────────────────────────────────────────────────

function usagePct(used: number, balance: number): string {
  const total = used + balance;
  if (total === 0) return "0%";
  return `${Math.min(100, Math.round((used / total) * 100))}%`;
}

// ── Policy type text cell ─────────────────────────────────────────────────────

function TypeCell({ policy }: { policy: LeavePolicyEntry }) {
  const typeStyle = policy.is_early ? s.typeEarly : policy.is_paid ? s.typePaid : s.typeUnpaid;
  const label     = policy.is_early ? "Early"     : policy.is_paid ? "Paid"     : "Unpaid";
  return <Text style={[PC.type, typeStyle]}>{label}</Text>;
}

// ── Per-employee block ────────────────────────────────────────────────────────

function EmployeeBlock({ record }: { record: ReportData["records"][0] }) {
  const sorted = [...record.policies].sort((a, b) => a.policy_id - b.policy_id);

  return (
    <View
      style={{
        marginBottom: 10,
        borderWidth: 1, borderColor: "#e5e7eb", borderStyle: "solid", borderRadius: 2,
      }}
      wrap={false}
    >
      {/* Header: name/email left, totals + role right */}
      <View style={{
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingVertical: 7, paddingHorizontal: 10,
        backgroundColor: "#f3f4f6",
        borderBottomWidth: 1, borderBottomColor: "#e5e7eb", borderBottomStyle: "solid",
      }}>
        <View>
          <Text style={{ fontSize: 9.5, fontWeight: "bold", color: "#111827" }}>
            {record.employee_name}
          </Text>
          <Text style={{ fontSize: 7.5, color: "#6b7280", marginTop: 1 }}>
            {record.email}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontSize: 7.5, color: "#374151", marginRight: 10 }}>
            {"Used: "}
            <Text style={{ fontWeight: "bold", color: "#111827" }}>{fmtPdf(record.total_used)}</Text>
          </Text>
          <Text style={{ fontSize: 7.5, color: "#374151", marginRight: 10 }}>
            {"Balance: "}
            <Text style={{ fontWeight: "bold", color: "#111827" }}>{fmtPdf(record.total_balance)}</Text>
          </Text>
          <Text style={s.roleBadge}>{record.role}</Text>
        </View>
      </View>

      {/* Policy sub-table */}
      <View>
        {/* Column headers */}
        <View style={[s.tableHeaderRow, { paddingHorizontal: 10 }]}>
          <Text style={[s.tableHeaderText, PC.policy]}>POLICY</Text>
          <Text style={[s.tableHeaderText, PC.type]}>TYPE</Text>
          <Text style={[s.tableHeaderText, PC.used]}>USED</Text>
          <Text style={[s.tableHeaderText, PC.balance]}>BALANCE</Text>
          <Text style={[s.tableHeaderText, PC.usagePct]}>USAGE</Text>
        </View>

        {/* Data rows */}
        {sorted.map((p, idx) => (
          <View
            key={p.policy_id}
            style={[
              s.tableRow,
              { paddingHorizontal: 10 },
              idx % 2 !== 0              ? s.tableRowEven : {},
              idx === sorted.length - 1  ? s.tableRowLast : {},
            ]}
          >
            <Text style={PC.policy}>{p.policy_name}</Text>
            <TypeCell policy={p} />
            <Text style={[PC.used,     s.colOrange, p.used_days === 0 ? s.colDash : {}]}>
              {fmtPdf(p.used_days)}
            </Text>
            <Text style={[PC.balance,  s.colGreen,  p.balance   === 0 ? s.colDash : {}]}>
              {fmtPdf(p.balance)}
            </Text>
            <Text style={PC.usagePct}>{usagePct(p.used_days, p.balance)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Main page export ──────────────────────────────────────────────────────────

export function PolicyReportTemplate({ data }: { data: ReportData }) {
  const generatedAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium", timeStyle: "short",
  });

  const totalUsed    = data.records.reduce((acc, r) => acc + r.total_used,    0);
  const totalBalance = data.records.reduce((acc, r) => acc + r.total_balance, 0);
  const policyCount  = data.records[0]?.policies.length ?? 0;

  const stats = [
    { label: "Employees",      value: String(data.total)    },
    { label: "Leave Policies", value: String(policyCount)   },
    { label: "Total Used",     value: fmtPdf(totalUsed)     },
    { label: "Total Balance",  value: fmtPdf(totalBalance)  },
  ];

  return (
    <Page size="A4" style={s.page}>

      <PdfHeader title="Leave Policy Report" subtitle="Leave Management System" />

      <PdfInfoBox
        reportType={data.report_type}
        period={buildPeriodLabel(data)}
        totalEmployees={data.total}
        generatedAt={generatedAt}
      />

      <PdfStatCards stats={stats} />

      {data.records.length === 0 ? (
        <PdfEmptyState message="No leave records found for the selected period." />
      ) : (
        data.records.map((record) => (
          <EmployeeBlock key={record.employee_id} record={record} />
        ))
      )}

      <PdfFooter text={`Confidential Leave Policy Report  •  Generated on ${generatedAt}`} />
    </Page>
  );
}
