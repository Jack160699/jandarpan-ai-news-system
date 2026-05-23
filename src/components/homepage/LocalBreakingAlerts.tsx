import Link from "next/link";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";

type LocalBreakingAlertsProps = {
  alerts: GeneratedHomepageFeed["localBreakingAlerts"];
};

export function LocalBreakingAlerts({ alerts }: LocalBreakingAlertsProps) {
  if (!alerts.length) return null;

  return (
    <section className="nr-alerts" aria-label="Local breaking alerts">
      <div className="nr-wrap">
        <ul className="nr-alerts__list">
          {alerts.slice(0, 5).map((alert) => (
            <li key={alert.slug}>
              <Link href={`/story/${alert.slug}`} className="nr-alerts__link">
                {alert.district ? (
                  <span className="nr-alerts__district">{alert.district}</span>
                ) : null}
                <span>{alert.headline}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
