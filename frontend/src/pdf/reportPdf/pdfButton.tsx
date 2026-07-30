/**
 * DownloadReportButton — thin wrapper around PdfDownloadButton for the
 * Leave Summary Report. Kept so existing import paths don't break.
 */
import { PdfDownloadButton } from "./PdfDownloadButton";
import { LeaveReportPDF } from "./LeavePdf";
import type { LeaveReportResponse } from "@/types";

type Props = { data: LeaveReportResponse["data"] };

export const DownloadReportButton = ({ data }: Props) => (
  <PdfDownloadButton
    document={<LeaveReportPDF data={data} />}
    fileName="leave-report.pdf"
  />
);
