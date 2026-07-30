import { View, Text } from "@react-pdf/renderer";
import type { LeaveReportResponse } from "@/types";
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

type Props = { data: LeaveReportResponse["data"] };

// Column widths — must sum to ≤ 100 %
const COL = {
  name:   { width: "18%", fontSize: 8.5, fontWeight: "bold" as const, color: "#111827", paddingHorizontal: 2, lineHeight: 1.3 },
  email:  { width: "24%", fontSize: 7.8, color: "#4b5563", paddingHorizontal: 2, lineHeight: 1.3 },
  role:   { width: "12%", fontSize: 7.8, textAlign: "center" as const, color: "#6b7280", fontWeight: "bold" as const },
  number: { width: "9%",  fontSize: 8,   textAlign: "center" as const, color: "#1f2937", fontWeight: "bold" as const },
};

export const LeaveReportTemplate = ({ data }: Props) => {
  const generatedAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium", timeStyle: "short",
  });

  const totalAccrued = data.records?.reduce((s, e) => s + e.accrued_leaves, 0) ?? 0;
  const totalUsed    = data.records?.reduce((s, e) => s + e.used_leaves,    0) ?? 0;
  const totalPaid    = data.records?.reduce((s, e) => s + e.paid_leaves,    0) ?? 0;
  const totalUnpaid  = data.records?.reduce((s, e) => s + e.unpaid_leaves,  0) ?? 0;

  const stats = [
    { label: "Total Accrued", value: fmtPdf(totalAccrued) },
    { label: "Total Used",    value: fmtPdf(totalUsed)    },
    { label: "Paid Leaves",   value: fmtPdf(totalPaid)    },
    { label: "Unpaid Leaves", value: fmtPdf(totalUnpaid)  },
  ];

  return (
    <View style={s.page}>

      <PdfHeader title="Employee Leave Report" subtitle="Leave Management System" />

      <PdfInfoBox
        reportType={data.report_type}
        period={buildPeriodLabel(data)}
        totalEmployees={data.total}
        generatedAt={generatedAt}
      />

      <PdfStatCards stats={stats} />

      {/* Table */}
      <View style={s.table}>

        {/* Header */}
        <View style={s.tableHeaderRow}>
          <Text style={[s.tableHeaderText, COL.name]}>NAME</Text>
          <Text style={[s.tableHeaderText, COL.email]}>EMAIL</Text>
          <Text style={[s.tableHeaderText, COL.role]}>ROLE</Text>
          <Text style={[s.tableHeaderText, COL.number]}>ACCRUED</Text>
          <Text style={[s.tableHeaderText, COL.number]}>USED</Text>
          <Text style={[s.tableHeaderText, COL.number]}>PAID</Text>
          <Text style={[s.tableHeaderText, COL.number]}>UNPAID</Text>
          <Text style={[s.tableHeaderText, COL.number]}>BALANCE</Text>
        </View>

        {/* Rows */}
        {data.records && data.records.length > 0 ? (
          data.records.map((emp, idx) => (
            <View
              key={emp.employee_id}
              style={[
                s.tableRow,
                idx % 2 !== 0          ? s.tableRowEven : {},
                idx === data.records.length - 1 ? s.tableRowLast : {},
              ]}
            >
              <Text style={COL.name}>{emp.employee_name}</Text>
              <Text style={COL.email}>{emp.email}</Text>
              <Text style={COL.role}>{emp.role}</Text>
              <Text style={COL.number}>{fmtPdf(emp.accrued_leaves)}</Text>
              <Text style={COL.number}>{fmtPdf(emp.used_leaves)}</Text>
              <Text style={COL.number}>{fmtPdf(emp.paid_leaves)}</Text>
              <Text style={COL.number}>{fmtPdf(emp.unpaid_leaves)}</Text>
              <Text style={COL.number}>{fmtPdf(emp.balance_leaves)}</Text>
            </View>
          ))
        ) : (
          <PdfEmptyState message="No employee records found for the selected period." />
        )}
      </View>

      <PdfFooter text={`Confidential Employee Leave Report  •  Generated on ${generatedAt}`} />
    </View>
  );
};
