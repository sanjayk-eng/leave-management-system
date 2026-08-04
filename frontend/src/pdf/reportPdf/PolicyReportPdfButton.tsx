/**
 * DownloadPolicyReportButton — thin wrapper around PdfDownloadButton for the
 * Leave Policy Report. Kept so existing import paths don't break.
 */
import { PdfDownloadButton } from "./PdfDownloadButton";
import { PolicyReportPDF } from "./PolicyReportPDF";
import type { LeavePolicyReportResponse } from "@/types";

type Props = { data: LeavePolicyReportResponse["data"] };

export const DownloadPolicyReportButton = ({ data }: Props) => (
  <PdfDownloadButton
    document={<PolicyReportPDF data={data} />}
    fileName="leave-policy-report.pdf"
  />
);
