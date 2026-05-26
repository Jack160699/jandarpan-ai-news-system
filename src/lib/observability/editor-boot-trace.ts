export type EditorBootTag =
  | "EDITOR_BOOT"
  | "EDITOR_QUERY"
  | "EDITOR_READY"
  | "EDITOR_TIMEOUT"
  | "EDITOR_IMPORT"
  | "EDITOR_ERROR";

function enabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ADMIN_DEBUG === "1" ||
    process.env.NEXT_PUBLIC_ADMIN_DEBUG === "1"
  );
}

export function traceEditorBoot(
  tag: EditorBootTag,
  detail: string,
  extra?: Record<string, unknown>
): void {
  if (!enabled()) return;
  const payload = extra ? ` ${JSON.stringify(extra)}` : "";
  console.log(`[${tag}]`, `${detail}${payload}`);
}

