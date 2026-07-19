"use client";

import { useEffect, useState } from "react";
import { Masthead } from "@/features/reader-ds/components/Masthead";
import { ReaderShell } from "@/features/reader-ds/components/ReaderShell";
import { PermissionSheet } from "@/features/reader-ds/system/PermissionSheet";

function prepStorage(kind: "notify" | "location") {
  try {
    if (kind === "notify") {
      localStorage.removeItem("jd-ds-perm-notify-v1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
    } else {
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.removeItem("jd-ds-perm-loc-v1");
    }
  } catch {
    /* ignore */
  }
}

/** Force F51/F52 sheets for QA screenshots. */
export function PermissionPreview({ kind }: { kind: "notify" | "location" }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    prepStorage(kind);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- QA mount gate after localStorage prep
    setReady(true);
  }, [kind]);

  return (
    <ReaderShell activeNav="home" showPermissionSheets={false}>
      <Masthead hideActions />
      <main id="main-content" role="main" style={{ flex: 1, minHeight: 400, background: "var(--jd-paper)" }} />
      {ready ? <PermissionSheet key={kind} /> : null}
    </ReaderShell>
  );
}
