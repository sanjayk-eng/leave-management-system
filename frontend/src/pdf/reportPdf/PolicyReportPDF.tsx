import { Document } from "@react-pdf/renderer";
import { PolicyReportTemplate } from "./PolicyReportTemplate";
import type { LeavePolicyReportResponse } from "@/types";

type Props = {
  data: LeavePolicyReportResponse["data"];
};

export const PolicyReportPDF = ({ data }: Props) => (
  <Document>
    <PolicyReportTemplate data={data} />
  </Document>
);
