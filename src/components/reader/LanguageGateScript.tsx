"use client";

import Script from "next/script";

/** Lock main chrome before React hydrates to prevent mixed-language flash */
export function LanguageGateScript() {
  return (
    <Script
      id="language-gate-script"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          try {
            document.documentElement.setAttribute('data-lang-gate', 'locked');
          } catch (e) {}
        `,
      }}
    />
  );
}
