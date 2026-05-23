import Link from "next/link";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";

type LocalBreakingAlertsProps = {
  alerts: GeneratedHomepageFeed["localBreakingAlerts"];
};

export function LocalBreakingAlerts({ alerts }: LocalBreakingAlertsProps) {
  if (!alerts.length) return null;

  return (
    <section className="local-strip" aria-label="Local updates">
      <div className="nr-wrap">
        <h2 className="local-strip__title">CG updates</h2>
        <ul className="local-strip__list" role="list">
          {alerts.slice(0, 5).map((alert) => (
            <li key={alert.slug}>
              <Link
                href={`/story/${alert.slug}`}
                className="local-strip__row tap-target"
              >
                {alert.district ? (
                  <span className="local-strip__loc">{alert.district}</span>
                ) : null}
                <span className="local-strip__headline">{alert.headline}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
