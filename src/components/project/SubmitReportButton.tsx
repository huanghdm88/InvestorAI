import { useRef, useState } from "react";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";
import { REPORT_UPLOAD_ACCEPT, reportFileError, type ReportSubmissionRequest, type ReportSubmissionResult } from "@/src/lib/report-submission";
import type { KnowledgeFile } from "@/src/types";

export function SubmitReportButton({ projectId, stage, previousSourceId, onSubmit, onSubmitted }: {
  projectId: string; stage: "diligence" | "decided"; previousSourceId?: string;
  onSubmit: (request: ReportSubmissionRequest) => ReportSubmissionResult;
  onSubmitted: (file: KnowledgeFile) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [error, setError] = useState("");
  return <>
    <button type="button" className="ic-overview-button" onClick={() => { setError(""); input.current?.click(); }}>提交新报告</button>
    <input ref={input} type="file" accept={REPORT_UPLOAD_ACCEPT} hidden aria-label="选择新的投资报告" onChange={(event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      const problem = reportFileError(file);
      setError(problem ?? "");
      if (!problem) setPending(file);
    }} />
    {error && <p className="manager-submit-error" role="alert">{error}</p>}
    <ConfirmDialog open={Boolean(pending)} onOpenChange={(open) => { if (!open) setPending(null); }} title="提交新报告" confirmLabel="确认提交"
      description={<><span className="manager-submit-filename">{pending?.name}</span><span className="manager-submit-description">{stage === "decided" ? "作为投决后补充报告保留，不替换获批基准。" : "设为当前报告，旧版保留在历史版本中。"}</span></>}
      onConfirm={() => {
        if (!pending) return;
        const result = onSubmit({ projectId, stage, file: pending, previousSourceId });
        if (result.ok) onSubmitted(result.file);
        else setError(result.error);
      }} />
  </>;
}
