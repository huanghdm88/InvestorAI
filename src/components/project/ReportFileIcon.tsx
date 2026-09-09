import { FilePdfFilled } from "@ant-design/icons";
import { AppIcon } from "@/src/components/ui/app-icon";
import { IconFileText } from "@/src/lib/icons";

export function ReportFileIcon({ name = "" }: { name?: string }) {
  const pdf = /\.pdf$/i.test(name);
  return <span className={`ic-shell-report-icon${pdf ? " report-file-pdf" : ""}`}><AppIcon icon={pdf ? FilePdfFilled : IconFileText} size={pdf ? 27 : 19} color={pdf ? "#d9363e" : undefined} /></span>;
}
