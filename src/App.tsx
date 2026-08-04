import { useState, type ChangeEvent } from "react";

import { Inspector } from "./features/inspector/Inspector";
import { getLanguage, setLanguage, t, type Language } from "./i18n";

export function App() {
  const [currentLanguage, setCurrentLanguage] = useState(getLanguage);

  function changeLanguage(event: ChangeEvent<HTMLSelectElement>): void {
    const nextLanguage: Language =
      event.currentTarget.value === "ja" ? "ja" : "en";
    setLanguage(nextLanguage);
    setCurrentLanguage(nextLanguage);
  }

  return (
    <main className="app">
      <header className="stack stack--tight">
        <div className="wordmark">{t("app.name")}</div>
        <div className="tagline">{t("app.tagline")}</div>
        <select
          className="btn"
          aria-label="Language"
          value={currentLanguage}
          onChange={changeLanguage}
        >
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>
      </header>
      <Inspector />
    </main>
  );
}
