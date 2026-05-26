/**
 * Editor lifecycle tracing (admin).
 * Enable: NEXT_PUBLIC_ADMIN_DEBUG=1 or ADMIN_DEBUG=1
 */

function enabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ADMIN_DEBUG === "1" ||
    process.env.NEXT_PUBLIC_ADMIN_DEBUG === "1"
  );
}

export function traceEditorLifecycle(
  tag:
    | "EDITOR_DESTROY"
    | "EDITOR_UNMOUNT"
    | "AUTOSAVE_CANCEL"
    | "UPLOAD_ABORT"
    | "EDITOR_MEMORY",
  detail: string,
  extra?: Record<string, unknown>
): void {
  if (!enabled()) return;
  const payload = extra ? ` ${JSON.stringify(extra)}` : "";
  console.log(`[${tag}]`, `${detail}${payload}`);
}

