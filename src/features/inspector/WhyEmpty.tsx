import { t } from "../../i18n";

export function WhyEmpty() {
  return (
    <details className="details">
      <summary>{t("whyEmpty.heading")}</summary>
      <ul className="plain">
        <li>{t("whyEmpty.item.social")}</li>
        <li>{t("whyEmpty.item.screenshot")}</li>
        <li>{t("whyEmpty.item.export")}</li>
        <li>{t("whyEmpty.item.resave")}</li>
      </ul>
    </details>
  );
}
