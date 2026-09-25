import type { CSSProperties } from "react";
import "../styles";
import { readerDsFontClassName } from "../fonts";
import { Masthead } from "../components/Masthead";

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

/** Content-only shaped shimmer skeleton — preserves layout dimensions without remounting header/nav. */
export function ContentLoadingSkeleton() {
  return (
    <main
      id="main-content"
      role="main"
      className="jd-shell"
      style={{
        flex: 1,
        padding: "16px 14px",
        maxWidth: 960,
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
      }}
      aria-busy="true"
      aria-label="लोड हो रहा है"
    >
      <Skel w="100%" h={220} style={{ marginBottom: 14, borderRadius: 3 }} />
      <Skel w="35%" h={12} style={{ marginBottom: 8 }} />
      <Skel w="94%" h={22} style={{ marginBottom: 8 }} />
      <Skel w="78%" h={22} style={{ marginBottom: 16 }} />
      <div aria-hidden style={{ height: 1.5, background: "var(--jd-line)", margin: "18px 0" }} />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{ display: "flex", gap: 14, marginBottom: 18, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Skel w="25%" h={10} style={{ marginBottom: 6 }} />
            <Skel w="100%" h={15} style={{ marginBottom: 6 }} />
            <Skel w="75%" h={15} style={{ marginBottom: 6 }} />
            <Skel w="40%" h={10} style={{ marginBottom: 0 }} />
          </div>
          <Skel w={104} h={76} style={{ flexShrink: 0, borderRadius: 3, marginBottom: 0 }} />
        </div>
      ))}
    </main>
  );
}

/** Full-page shimmer skeleton for initial hard SSR document loads. */
export function LoadingSkeleton({ activeNav }: { activeNav?: string | null } = {}) {
  return (
    <div
      className={`jd-ds jd-ds--stage ${readerDsFontClassName}`}
      style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--jd-paper)" }}
      aria-busy="true"
      aria-label="लोड हो रहा है"
    >
      <Masthead />
      <ContentLoadingSkeleton />
    </div>
  );
}

