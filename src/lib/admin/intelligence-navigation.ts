/**
 * Unified Intelligence Navigation — contextual links from existing routes only.
 * Pure metadata projection; no queries, no mutations.
 */

import type { EventViewModel } from "@/lib/events/event-view-model";
import type { EditorArticleRecord } from "@/lib/editorial-editor/types";
import { knowledgeSearchHref } from "@/lib/story/story-knowledge-navigation";
import type { StoryKnowledgeVm } from "@/lib/story/story-knowledge";
import type { EditorialMetadata } from "@/lib/types/newsroom";

export type IntelligenceNavLink = {
  label: string;
  href: string;
  ariaLabel: string;
  external?: boolean;
};

export type IntelligenceSectionNav = {
  links: IntelligenceNavLink[];
};

export type IntelligenceNavigationVm = {
  editorial: IntelligenceSectionNav | null;
  trust: IntelligenceSectionNav | null;
  knowledge: IntelligenceSectionNav | null;
  event: IntelligenceSectionNav | null;
  decision: IntelligenceSectionNav | null;
  workflow: IntelligenceSectionNav | null;
  version: IntelligenceSectionNav | null;
  generation: IntelligenceSectionNav | null;
  hasLayer: boolean;
};

export type BuildIntelligenceNavigationInput = {
  article: EditorArticleRecord;
  meta: EditorialMetadata;
  knowledge?: StoryKnowledgeVm | null;
  eventViewModel?: EventViewModel | null;
};

function link(
  label: string,
  href: string,
  ariaLabel: string,
  external = false
): IntelligenceNavLink {
  return { label, href, ariaLabel, external };
}

function section(links: IntelligenceNavLink[]): IntelligenceSectionNav | null {
  const unique: IntelligenceNavLink[] = [];
  const seen = new Set<string>();

  for (const entry of links) {
    if (!entry.href?.trim()) continue;
    const key = `${entry.href}|${entry.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(entry);
  }

  return unique.length ? { links: unique } : null;
}

function isExternalUrl(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function buildEditorialNavigation(
  article: EditorArticleRecord
): IntelligenceSectionNav | null {
  const links: IntelligenceNavLink[] = [];

  if (article.id?.trim()) {
    links.push(
      link(
        "Open in editor",
        `/admin/editor/${article.id.trim()}`,
        "Open generated article in editor"
      )
    );
  }

  if (article.slug?.trim()) {
    links.push(
      link(
        "View story",
        `/story/${article.slug.trim()}`,
        "Open public story page"
      )
    );
  }

  return section(links);
}

function buildTrustNavigation(meta: EditorialMetadata): IntelligenceSectionNav | null {
  const sources = Array.isArray(meta.source_attribution)
    ? meta.source_attribution
    : [];
  const links: IntelligenceNavLink[] = [];

  for (const source of sources.slice(0, 3)) {
    const url = source.article_url?.trim();
    const name = source.source?.trim() || source.provider?.trim() || "Source";
    if (!url || !isExternalUrl(url)) continue;
    links.push(
      link(
        `Source: ${name}`,
        url,
        `View source attribution for ${name}`,
        true
      )
    );
  }

  if (!links.length && sources.length > 0) {
    const first = sources[0];
    const query = first.source?.trim() || first.provider?.trim();
    if (query) {
      links.push(
        link(
          "Search sources",
          knowledgeSearchHref(query),
          `Search newsroom for ${query}`
        )
      );
    }
  }

  return section(links);
}

function buildKnowledgeNavigation(
  knowledge?: StoryKnowledgeVm | null
): IntelligenceSectionNav | null {
  if (!knowledge?.nav) return null;

  const nav = knowledge.nav;
  const links: IntelligenceNavLink[] = [];

  if (nav.category) links.push(nav.category);
  if (nav.district) links.push(nav.district);

  for (const topic of nav.topics.slice(0, 2)) {
    links.push(topic);
  }

  for (const person of nav.people.slice(0, 2)) {
    links.push(person);
  }

  if (!links.length && knowledge.primaryTopic?.trim()) {
    links.push(
      link(
        `Search: ${knowledge.primaryTopic.trim()}`,
        knowledgeSearchHref(knowledge.primaryTopic),
        `Search for ${knowledge.primaryTopic.trim()}`
      )
    );
  }

  return section(links);
}

function buildEventNavigation(
  eventViewModel?: EventViewModel | null
): IntelligenceSectionNav | null {
  if (!eventViewModel) return null;

  const links: IntelligenceNavLink[] = [];
  const coverageSlug = eventViewModel.coverage_slug?.trim();

  if (coverageSlug) {
    links.push(
      link(
        "Open live coverage",
        `/live/${coverageSlug}`,
        "Open live event coverage page"
      )
    );
  }

  links.push(
    link(
      "Open live wire",
      "/admin/live-wire",
      "Open admin live wire desk"
    )
  );

  const title = eventViewModel.canonical_title?.trim();
  if (title) {
    links.push(
      link(
        "Search event",
        knowledgeSearchHref(title),
        `Search newsroom for ${title}`
      )
    );
  }

  return section(links);
}

function buildWorkflowBoardNavigation(): IntelligenceSectionNav | null {
  return section([
    link("Open workflow board", "/admin/workflow", "Open editorial workflow board"),
  ]);
}

function buildEditorArticleNavigation(
  article: EditorArticleRecord
): IntelligenceSectionNav | null {
  if (!article.id?.trim()) return null;
  return section([
    link(
      "Open editor article",
      `/admin/editor/${article.id.trim()}`,
      "Open article in editorial editor"
    ),
  ]);
}

function buildDecisionNavigation(
  article: EditorArticleRecord
): IntelligenceSectionNav | null {
  const links: IntelligenceNavLink[] = [
    link("Open workflow board", "/admin/workflow", "Open editorial workflow board"),
  ];

  if (article.id?.trim()) {
    links.push(
      link(
        "Review in editor",
        `/admin/editor/${article.id.trim()}`,
        "Review article in editor"
      )
    );
  }

  return section(links);
}

export function buildIntelligenceNavigation(
  input: BuildIntelligenceNavigationInput
): IntelligenceNavigationVm {
  const { article, meta, knowledge, eventViewModel } = input;

  const editorial = buildEditorialNavigation(article);
  const trust = buildTrustNavigation(meta);
  const knowledgeNav = buildKnowledgeNavigation(knowledge);
  const event = buildEventNavigation(eventViewModel);
  const decision = buildDecisionNavigation(article);
  const workflow = buildWorkflowBoardNavigation();
  const version = buildEditorArticleNavigation(article);
  const generation = buildEditorArticleNavigation(article);

  const vm: IntelligenceNavigationVm = {
    editorial,
    trust,
    knowledge: knowledgeNav,
    event,
    decision,
    workflow,
    version,
    generation,
    hasLayer: false,
  };

  vm.hasLayer = Boolean(
    editorial ||
      trust ||
      knowledgeNav ||
      event ||
      decision ||
      workflow ||
      version ||
      generation
  );

  return vm;
}

export function buildNewsroomHealthNavigation(): IntelligenceSectionNav {
  return {
    links: [
      link("Open health dashboard", "/admin/health", "Open newsroom health dashboard"),
      link(
        "Open editorial queues",
        "/admin/editorial",
        "Open editorial overview and queues"
      ),
      link("Open workflow board", "/admin/workflow", "Open editorial workflow board"),
    ],
  };
}

/** Static health desk links — reused across admin health strips. */
export const NEWSROOM_HEALTH_NAVIGATION = buildNewsroomHealthNavigation();
