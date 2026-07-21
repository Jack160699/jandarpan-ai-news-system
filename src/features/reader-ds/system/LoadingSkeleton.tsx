import type { CSSProperties } from "react";
import "../styles";
import { readerDsFontClassName } from "../fonts";
import { Masthead } from "../components/Masthead";
import { UtilityRow } from "../components/UtilityRow";
import { BottomNav } from "../components/BottomNav";
import { DesktopPrimaryNav } from "../components/DesktopPrimaryNav";

function Skel({
  w,
  h = 12,
  style,
}: {
  w: string | number;
  h?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden
      className="jd-skel"
      style={{
        width: w,
        height: h,
        borderRadius: 3,
        marginBottom: 8,
        ...style,
      }}
    />
  );
}

/** F46 — content-shaped shimmer skeleton (no spinner). */
export function LoadingSkeleton() {
  return (
    <div
      className={`jd-ds jd-ds--stage ${readerDsFontClassName}`}
      style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--jd-paper)" }}
      aria-busy="true"
      aria-label="लोड हो रहा है"
    >
      <Masthead hideActions />
      <DesktopPrimaryNav active="home" />
      <UtilityRow disableLiveWeather />
      <main id="main-content" role="main" className="jd-shell" style={{ flex: 1, padding: 14 }}>
        <Skel w="100%" h={180} style={{ marginBottom: 12, borderRadius: 2 }} />
        <Skel w="40%" h={10} />
        <Skel w="92%" h={18} />
        <Skel w="80%" h={18} />
        <div aria-hidden style={{ height: 1, background: "var(--jd-line-2)", margin: "14px 0" }} />
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <Skel w="30%" h={9} />
              <Skel w="100%" h={13} />
              <Skel w="70%" h={13} />
            </div>
            <Skel w={96} h={66} style={{ flexShrink: 0, borderRadius: 2, marginBottom: 0 }} />
          </div>
        ))}
      </main>
      <BottomNav active="home" />
    </div>
  );
}
