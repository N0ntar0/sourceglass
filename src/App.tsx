import { Inspector } from "./features/inspector/Inspector";
import { t } from "./i18n";

export function App() {
  return (
    <main className="app">
      <header className="stack stack--tight">
        <div className="wordmark">{t("app.name")}</div>
        <div className="tagline">{t("app.tagline")}</div>
      </header>
      <Inspector />
    </main>
  );
}
