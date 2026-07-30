/**
 * PdfDownloadButton — single, generic PDF export button.
 *
 * Usage:
 *   <PdfDownloadButton document={<LeaveReportPDF data={data} />} fileName="leave-report.pdf" />
 *   <PdfDownloadButton document={<PolicyReportPDF data={data} />} fileName="policy-report.pdf" />
 */
import React from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { FileDown } from "lucide-react";

const BUTTON_CLASS =
  "inline-flex items-center gap-1.5 h-8 px-3 rounded-md " +
  "border border-red-200 bg-red-50 hover:bg-red-100 " +
  "text-red-700 text-xs font-medium shadow-sm transition-all duration-200";

interface Props {
  /** A rendered react-pdf Document element, e.g. <LeaveReportPDF data={...} /> */
  document: React.ReactElement;
  fileName: string;
}

export const PdfDownloadButton = ({ document, fileName }: Props) => (
  <PDFDownloadLink document={document} fileName={fileName} className={BUTTON_CLASS}>
    {({ loading }) => (
      <>
        <FileDown className="h-3.5 w-3.5" />
        {loading ? "Preparing…" : "Export PDF"}
      </>
    )}
  </PDFDownloadLink>
);
