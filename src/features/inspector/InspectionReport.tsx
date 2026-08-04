import { t } from "../../i18n";
import type { ProvenanceReport } from "../provenance";
import { Details } from "./Details";
import { OptionalChecks } from "./OptionalChecks";
import { ResultPanel } from "./ResultPanel";
import { Summary } from "./Summary";
import { WhyEmpty } from "./WhyEmpty";

export function InspectionReport({ report }: { report: ProvenanceReport }) {
  const results = Object.values(report.results);
  const showWhyEmpty =
    report.verdict === "NO_PROVENANCE_INFORMATION" &&
    results.every(
      (result) => result.status !== "not-checked" && result.status !== "error",
    );

  return (
    <div className="stack">
      <div className="filemeta">
        {t("file.metadata", {
          name: report.file.name,
          size: report.file.size.toLocaleString("en-US"),
        })}
      </div>
      <Summary report={report} />
      <ResultPanel report={report} />
      <p className="disclaimer">{t("disclaimer.always")}</p>
      {showWhyEmpty ? <WhyEmpty /> : null}
      <OptionalChecks />
      <Details report={report} />
    </div>
  );
}
