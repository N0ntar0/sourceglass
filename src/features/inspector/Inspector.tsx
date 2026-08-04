import { useRef, useState } from "react";

import { inspectImage, type ProvenanceReport } from "../provenance";
import { t } from "../../i18n";
import { createFileAnalysisInput } from "../../platform/fileAnalysisInput";
import { DropZone } from "./DropZone";
import { InspectionReport } from "./InspectionReport";

export function Inspector() {
  const [report, setReport] = useState<ProvenanceReport>();
  const [busy, setBusy] = useState(false);
  const latestAnalysis = useRef(0);

  async function inspect(file: File): Promise<void> {
    const analysisId = latestAnalysis.current + 1;
    latestAnalysis.current = analysisId;
    setBusy(true);
    setReport(undefined);
    const nextReport = await inspectImage(createFileAnalysisInput(file));
    if (latestAnalysis.current === analysisId) {
      setReport(nextReport);
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <DropZone busy={busy} onSelect={(file) => void inspect(file)} />
      <div className="privacy-line">{t("privacy.badge")}</div>
      {report === undefined ? null : <InspectionReport report={report} />}
    </div>
  );
}
