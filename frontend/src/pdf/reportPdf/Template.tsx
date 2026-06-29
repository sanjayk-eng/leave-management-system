import { View, Text } from "@react-pdf/renderer";
import type { LeaveReportResponse } from "@/types";
import { stylesPDF } from "./PdfStyle";

type Props = {
  data: LeaveReportResponse["data"];
};

const MONTHS = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const LeaveReportTemplate = ({ data }: Props) => {
  const generatedAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  // ── Summary ─────────────────────────────
  const totalAccrued =
    data.records?.reduce(
      (sum, emp) => sum + emp.accrued_leaves,
      0
    ) || 0;

  const totalUsed =
    data.records?.reduce(
      (sum, emp) => sum + emp.used_leaves,
      0
    ) || 0;

  const totalPaid =
    data.records?.reduce(
      (sum, emp) => sum + emp.paid_leaves,
      0
    ) || 0;

  const totalUnpaid =
    data.records?.reduce(
      (sum, emp) => sum + emp.unpaid_leaves,
      0
    ) || 0;

  // ── Period Format ──────────────────────
  let periodText = "";

  if (data.report_type === "monthly") {
    periodText = `${MONTHS[data.from_month]} ${data.from_year}`;
  } else if (data.report_type === "yearly") {
    periodText = `${data.from_year}`;
  } else {
    periodText = `${MONTHS[data.from_month]} ${data.from_year} to ${MONTHS[data.to_month]} ${data.to_year}`;
  }

  return (
    <View style={stylesPDF.page}>

      {/* HEADER */}
      <View style={stylesPDF.headerContainer}>
        <Text style={stylesPDF.header}>
          Employee Leave Report
        </Text>

        <Text style={stylesPDF.subHeader}>
          Leave Management System
        </Text>
      </View>

      {/* REPORT INFO */}
      <View style={stylesPDF.infoContainer}>
        <View style={stylesPDF.infoGrid}>

          <View style={stylesPDF.infoItem}>
            <Text style={stylesPDF.infoText}>
              <Text style={stylesPDF.infoLabel}>
                Report Type:
              </Text>{" "}
              {data.report_type.toUpperCase()}
            </Text>
          </View>

          <View style={stylesPDF.infoItem}>
            <Text style={stylesPDF.infoText}>
              <Text style={stylesPDF.infoLabel}>
                Total Employees:
              </Text>{" "}
              {data.total}
            </Text>
          </View>

          <View style={stylesPDF.infoItem}>
            <Text style={stylesPDF.infoText}>
              <Text style={stylesPDF.infoLabel}>
                Period:
              </Text>{" "}
              {periodText}
            </Text>
          </View>

          <View style={stylesPDF.infoItem}>
            <Text style={stylesPDF.infoText}>
              <Text style={stylesPDF.infoLabel}>
                Generated:
              </Text>{" "}
              {generatedAt}
            </Text>
          </View>

        </View>
      </View>

      {/* SUMMARY */}
      <View style={stylesPDF.statsContainer}>

        <View style={stylesPDF.statCard}>
          <Text style={stylesPDF.statValue}>
            {totalAccrued}
          </Text>

          <Text style={stylesPDF.statLabel}>
            Total Accrued
          </Text>
        </View>

        <View style={stylesPDF.statCard}>
          <Text style={stylesPDF.statValue}>
            {totalUsed}
          </Text>

          <Text style={stylesPDF.statLabel}>
            Total Used
          </Text>
        </View>

        <View style={stylesPDF.statCard}>
          <Text style={stylesPDF.statValue}>
            {totalPaid}
          </Text>

          <Text style={stylesPDF.statLabel}>
            Paid Leaves
          </Text>
        </View>

        <View style={stylesPDF.statCard}>
          <Text style={stylesPDF.statValue}>
            {totalUnpaid}
          </Text>

          <Text style={stylesPDF.statLabel}>
            Unpaid Leaves
          </Text>
        </View>

      </View>

      {/* TABLE */}
      <View style={stylesPDF.table}>

        {/* HEADER */}
        <View style={stylesPDF.tableHeader}>
          <Text style={stylesPDF.colName}>NAME</Text>
          <Text style={stylesPDF.colEmail}>EMAIL</Text>
          <Text style={stylesPDF.colRole}>ROLE</Text>
          <Text style={stylesPDF.colNumber}>ACCRUED</Text>
          <Text style={stylesPDF.colNumber}>USED</Text>
          <Text style={stylesPDF.colNumber}>PAID</Text>
          <Text style={stylesPDF.colNumber}>UNPAID</Text>
          <Text style={stylesPDF.colNumber}>BALANCE</Text>
        </View>

        {/* ROWS */}
        {data?.records && data.records.length > 0 ? (
          data.records.map((emp, index) => (
            <View
              key={emp.employee_id}
              style={[
                stylesPDF.tableRow,
                index % 2 === 0 &&
                  stylesPDF.evenRow,
                index ===
                  data.records.length - 1 &&
                  stylesPDF.lastRow,
              ]}
            >
              <Text style={stylesPDF.colName}>
                {emp.employee_name}
              </Text>

              <Text style={stylesPDF.colEmail}>
                {emp.email}
              </Text>

              <Text style={stylesPDF.colRole}>
                {emp.role}
              </Text>

              <Text style={stylesPDF.colNumber}>
                {emp.accrued_leaves}
              </Text>

              <Text style={stylesPDF.colNumber}>
                {emp.used_leaves}
              </Text>

              <Text style={stylesPDF.colNumber}>
                {emp.paid_leaves}
              </Text>

              <Text style={stylesPDF.colNumber}>
                {emp.unpaid_leaves}
              </Text>

              <Text style={stylesPDF.colNumber}>
                {emp.balance_leaves}
              </Text>
            </View>
          ))
        ) : (
          <View style={stylesPDF.emptyState}>
            <Text>
              No employee records found for the selected period.
            </Text>
          </View>
        )}

      </View>

      {/* FOOTER */}
      <Text style={stylesPDF.footer}>
        Confidential Employee Leave Report • Generated on {generatedAt}
      </Text>

    </View>
  );
};