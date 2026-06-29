import { PDFDownloadLink } from "@react-pdf/renderer";
import { FileDown } from "lucide-react";
import { LeaveReportPDF } from "./LeavePdf";
import type { LeaveReportResponse } from "@/types";

type Props = {
  data: LeaveReportResponse["data"];
};

export const DownloadReportButton = ({ data }: Props) => {
  return (
    <PDFDownloadLink
      document={<LeaveReportPDF data={data} />}
      fileName="leave-report.pdf"
      className="
        inline-flex
        items-center
        gap-1.5
        h-8
        px-3
        rounded-md
        border
        border-red-200
        bg-red-50
        hover:bg-red-100
        text-red-700
        text-xs
        font-medium
        shadow-sm
        transition-all
        duration-200
      "
    >
      {({ loading }) => (
        <>
          <FileDown className="h-3.5 w-3.5" />
          {loading ? "Preparing..." : "Export PDF"}
        </>
      )}
    </PDFDownloadLink>
  );
};