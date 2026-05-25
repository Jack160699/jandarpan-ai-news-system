"use client";

import { DEFAULT_SECTION_CONFIG } from "@/lib/newsroom-platform/config/sections";
import { PLATFORM_DISTRICTS } from "@/lib/newsroom-platform/config/districts";
import { PLATFORM_TOPICS } from "@/lib/newsroom-platform/config/topics";
import { MOCK_ARTICLES } from "@/lib/newsroom-platform/content/mock/articles";

export function PlatformArticlesPanel() {
  return (
    <div className="anr-panel">
      <p className="anr-meta">Mock corpus · {MOCK_ARTICLES.length} articles</p>
      <div className="anr-table-wrap">
      <table className="anr-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Priority</th>
            <th>Breaking</th>
          </tr>
        </thead>
        <tbody>
          {MOCK_ARTICLES.slice(0, 12).map((a) => (
            <tr key={a.id}>
              <td>{a.title}</td>
              <td>{a.category}</td>
              <td>{a.priority}</td>
              <td>{a.breaking ? "Yes" : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <p className="anr-meta">Wire to Supabase `articles` table when ready.</p>
    </div>
  );
}

export function PlatformDistrictsPanel() {
  return (
    <ul className="anr-list">
      {PLATFORM_DISTRICTS.map((d) => (
        <li key={d.slug}>
          <strong>{d.nameEn}</strong> — sections: {d.sections.join(", ")}
        </li>
      ))}
    </ul>
  );
}

export function PlatformTopicsPanel() {
  return (
    <ul className="anr-list">
      {PLATFORM_TOPICS.map((t) => (
        <li key={t.slug}>
          <strong>{t.titleEn}</strong> — /topics/{t.slug}
        </li>
      ))}
    </ul>
  );
}

export function PlatformSourcesPanel() {
  const sources = ["State Desk", "Raipur Bureau", "National Desk", "World Desk"];
  return (
    <ul className="anr-list">
      {sources.map((s) => (
        <li key={s}>{s} · enabled · trust 0.9</li>
      ))}
    </ul>
  );
}

export function PlatformSectionsPanel() {
  return (
    <ul className="anr-list">
      {DEFAULT_SECTION_CONFIG.map((s) => (
        <li key={s.key}>
          {s.labelEn} — {s.enabled ? "enabled" : "disabled"}
        </li>
      ))}
    </ul>
  );
}
