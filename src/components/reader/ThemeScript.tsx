'use client'

import Script from 'next/script'

export function ThemeScript() {
  return (
    <Script
      id="theme-script"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          try {
            var PREFS_KEY = 'cgb-reader-prefs';
            var theme = null;
            var raw = localStorage.getItem(PREFS_KEY);
            if (raw) {
              try { theme = JSON.parse(raw).theme; } catch (e) {}
            }
            if (!theme) theme = localStorage.getItem('theme');
            var dark =
              theme === 'dark' ||
              (!theme &&
                window.matchMedia('(prefers-color-scheme: dark)').matches);
            document.documentElement.dataset.theme = dark ? 'dark' : 'light';
            document.documentElement.classList.toggle('dark', dark);
          } catch (e) {}
        `,
      }}
    />
  )
}