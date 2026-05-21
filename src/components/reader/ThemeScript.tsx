import {
  LANGUAGE_CHOSEN_KEY,
  LANGUAGE_STORAGE_KEY,
} from "@/lib/i18n/storage";
import { PREFS_STORAGE_KEY } from "@/lib/reader-preferences";

const script = `
(function() {
  try {
    var root = document.documentElement;
    var lang = localStorage.getItem("${LANGUAGE_STORAGE_KEY}");
    if (!lang) {
      var raw = localStorage.getItem("${PREFS_STORAGE_KEY}");
      if (raw) {
        var p = JSON.parse(raw);
        if (p.language) lang = p.language;
      }
    }
    if (lang === "en" || lang === "hi" || lang === "cg") {
      root.setAttribute("data-language", lang);
      root.lang = lang === "en" ? "en" : "hi";
    }
    var rawPrefs = localStorage.getItem("${PREFS_STORAGE_KEY}");
    if (rawPrefs) {
      var prefs = JSON.parse(rawPrefs);
      if (prefs.theme) root.setAttribute("data-theme", prefs.theme);
      if (prefs.readingMode) root.setAttribute("data-reading-mode", prefs.readingMode);
    }
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}
