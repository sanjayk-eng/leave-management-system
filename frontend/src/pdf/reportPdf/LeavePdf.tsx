import { Document, Page } from "@react-pdf/renderer";
import { LeaveReportTemplate } from "./Template";
import { LeaveReportResponse } from "@/types";

type Props = {
  data: LeaveReportResponse["data"]
};

export const LeaveReportPDF = ({ data }: Props) => {
  return (
    <Document>
      <Page size="A4" style={{ padding: 20 }}>
        <LeaveReportTemplate data={data} />
      </Page>
    </Document>
  );
};