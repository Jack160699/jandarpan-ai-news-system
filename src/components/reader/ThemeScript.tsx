import { PREFS_STORAGE_KEY } from "@/lib/reader-preferences";

const script = `
(function() {
  try {
    var raw = localStorage.getItem("${PREFS_STORAGE_KEY}");
    if (!raw) return;
    var p = JSON.parse(raw);
    var root = document.documentElement;
    if (p.theme) root.setAttribute("data-theme", p.theme);
    if (p.readingMode) root.setAttribute("data-reading-mode", p.readingMode);
    if (p.language) {
      root.setAttribute("data-language", p.language);
      root.lang = p.language === "en" ? "en" : "hi";
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
