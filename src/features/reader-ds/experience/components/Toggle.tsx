"use client";

type ToggleProps = {
  on: boolean;
  onChange?: (next: boolean) => void;
  label?: string;
};

/** Design atom — green when on. */
export function Toggle({ on, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange?.(!on)}
      style={{
        width: 40,
        height: 23,
        borderRadius: 23,
        background: on ? "var(--jd-green)" : "var(--jd-line)",
        position: "relative",
        flexShrink: 0,
        border: "none",
        cursor: "pointer",
        padding: 0,
        minHeight: 44,
        minWidth: 44,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 2,
          left: on ? 19 : 2,
          width: 19,
          height: 19,
          borderRadius: 19,
          background: "#fff",
          boxShadow: "0 1px 2px rgba(0,0,0,.2)",
          transition: "left 120ms ease",
        }}
      />
    </button>
  );
}
