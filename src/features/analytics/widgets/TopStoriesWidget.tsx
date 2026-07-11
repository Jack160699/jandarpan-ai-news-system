import { WidgetShell } from "../components/WidgetShell";
import type { ExecutiveAnalyticsData } from "../types";

function formatCount(n: number) {
  return n.toLocaleString("en-IN");
}

export type TopStoriesWidgetProps = {
  stories: ExecutiveAnalyticsData["topStories"];
};

export function TopStoriesWidget({ stories }: TopStoriesWidgetProps) {
  return (
    <WidgetShell title="Top Stories" subtitle="Most read in the last 24 hours" span="wide">
      <div className="av3-table-wrap">
        <table className="av3-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Headline</th>
              <th scope="col">District</th>
              <th scope="col">Views</th>
              <th scope="col">Change</th>
            </tr>
          </thead>
          <tbody>
            {stories.map((story) => (
              <tr key={story.id}>
                <td>
                  <span className={`av3-rank${story.rank === 1 ? " av3-rank--1" : ""}`}>
                    {story.rank}
                  </span>
                </td>
                <td className="av3-table__headline">{story.headline}</td>
                <td>{story.district}</td>
                <td className="av3-table__num">{formatCount(story.views)}</td>
                <td>
                  <span
                    className={
                      story.changePct >= 0 ? "av3-change av3-change--up" : "av3-change av3-change--down"
                    }
                  >
                    {story.changePct >= 0 ? "+" : ""}
                    {story.changePct}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WidgetShell>
  );
}
