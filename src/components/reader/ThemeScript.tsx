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
            var pref = null;
            var raw = localStorage.getItem(PREFS_KEY);
            if (raw) {
              try { pref = JSON.parse(raw).theme; } catch (e) {}
            }
            if (!pref) pref = localStorage.getItem('theme');
            var effective = pref || 'system';
            var resolved = effective;
            if (effective === 'system') {
              var dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              var hc = window.matchMedia('(prefers-contrast: more)').matches;
              resolved = hc ? (dark ? 'hc-dark' : 'hc-light') : (dark ? 'dark' : 'light');
            }
            document.documentElement.dataset.theme = resolved;
            if (pref) document.documentElement.dataset.themePref = pref;
            document.documentElement.classList.toggle(
              'dark',
              resolved === 'dark' || resolved === 'hc-dark'
            );
          } catch (e) {}
        `,
      }}
    />
  )
}