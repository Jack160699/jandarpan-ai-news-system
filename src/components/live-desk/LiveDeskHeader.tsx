"use client";

type LiveDeskHeaderProps = {
  title?: string;
  subtitle?: string;
  updateCount?: number;
  compact?: boolean;
};

export function LiveDeskHeader({
  title = "Live Desk",
  subtitle = "ताज़ा अपडेट · छत्तीसगढ़",
  updateCount = 0,
  compact = false,
}: LiveDeskHeaderProps) {
  return (
    <header
      className={`live-desk-head${compact ? " live-desk-head--compact" : ""}`}
    >
      <div className="live-desk-head__status" aria-live="polite">
        <span className="live-desk-head__pulse" aria-hidden />
        <span className="live-desk-head__label">LIVE</span>
        {updateCount > 0 ? (
          <span className="live-desk-head__count">{updateCount} updates</span>
        ) : null}
      </div>
      <h1 className="live-desk-head__title">{title}</h1>
      {!compact ? (
        <p className="live-desk-head__sub">{subtitle}</p>
      ) : null}
    </header>
  );
}
