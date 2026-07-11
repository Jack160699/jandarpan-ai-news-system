import { WidgetShell } from "../components/WidgetShell";
import type { ExecutiveAnalyticsData } from "../types";

export type RevenuePlaceholderProps = {
  data: ExecutiveAnalyticsData["revenue"];
};

export function RevenuePlaceholder({ data }: RevenuePlaceholderProps) {
  return (
    <WidgetShell
      title="Revenue"
      subtitle="Monetization overview"
      action={<span className="av3-badge av3-badge--placeholder">Coming soon</span>}
    >
      <div className="av3-placeholder-panel">
        <div className="av3-placeholder-panel__icon" aria-hidden>
          ₹
        </div>
        <p className="av3-placeholder-panel__message">{data.message}</p>
        <ul className="av3-placeholder-panel__list">
          <li>Subscription conversions</li>
          <li>Sponsored content revenue</li>
          <li>Newsletter monetization</li>
        </ul>
      </div>
    </WidgetShell>
  );
}
