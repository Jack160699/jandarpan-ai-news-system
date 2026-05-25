"use client";

import Script from "next/script";

/** Lock chrome only when language not yet chosen — avoids post-Continue flash */
export function LanguageGateScript() {
  return (
    <Script
      id="language-gate-script"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          try {
            var chosen = localStorage.getItem('cgb-language-chosen') === '1';
            if (!chosen) {
              document.documentElement.setAttribute('data-lang-gate', 'locked');
            }
          } catch (e) {}
        `,
      }}
    />
  );
}
