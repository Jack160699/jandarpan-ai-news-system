type CinematicBridgeProps = {
  variant?: "default" | "deep" | "light";
};

export function CinematicBridge({ variant = "default" }: CinematicBridgeProps) {
  return (
    <div
      className={`cinematic-bridge ${
        variant === "deep"
          ? "cinematic-bridge--deep"
          : variant === "light"
            ? "cinematic-bridge--light"
            : ""
      }`}
      aria-hidden
    >
      <div className="cinematic-bridge__veil" />
    </div>
  );
}
