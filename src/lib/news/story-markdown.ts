/**
 * Parse generated editorial markdown into structured story content
 */

export type StorySection = {
  id: string;
  title: string;
  paragraphs: string[];
};

export type StoryTimelineEvent = {
  id: string;
  label: string;
  detail: string;
  order: number;
};

export type ParsedStoryContent = {
  sections: StorySection[];
  plainParagraphs: string[];
};

function slugifyHeading(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48);
}

export function parseStoryMarkdown(body: string): ParsedStoryContent {
  const trimmed = body.trim();
  if (!trimmed) {
    return { sections: [], plainParagraphs: [] };
  }

  const chunks = trimmed.split(/^##\s+/m).filter(Boolean);
  if (chunks.length <= 1 && !trimmed.startsWith("##")) {
    const plainParagraphs = trimmed
      .split(/\n{2,}|\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 20);
    return { sections: [], plainParagraphs };
  }

  const sections: StorySection[] = [];

  for (const chunk of chunks) {
    const lines = chunk.split("\n");
    const title = lines[0]?.trim() ?? "Section";
    const bodyText = lines.slice(1).join("\n").trim();
    const paragraphs = bodyText
      .split(/\n{2,}|\n/)
      .map((p) => p.replace(/^[-*•]\s+/, "").trim())
      .filter((p) => p.length > 10);

    if (!paragraphs.length) continue;

    sections.push({
      id: slugifyHeading(title),
      title,
      paragraphs,
    });
  }

  return { sections, plainParagraphs: [] };
}

const TIME_PREFIX_RE =
  /^(\d{1,2}(:\d{2})?\s*(am|pm)?|\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|\d{4}-\d{2}-\d{2})/i;

export function buildTimelineFromSections(
  sections: StorySection[]
): StoryTimelineEvent[] {
  const dev =
    sections.find((s) =>
      /key development|मुख्य|घटनाक्रम|timeline|updates/i.test(s.title)
    ) ?? sections[0];

  if (!dev) return [];

  const events: StoryTimelineEvent[] = [];

  for (let i = 0; i < dev.paragraphs.length; i++) {
    const text = dev.paragraphs[i];
    const bulletParts = text.split(/[.;]\s+/).filter((p) => p.length > 24);
    const parts = bulletParts.length > 1 ? bulletParts : [text];

    for (let j = 0; j < parts.length && events.length < 6; j++) {
      const part = parts[j].trim();
      const timeMatch = part.match(TIME_PREFIX_RE);
      events.push({
        id: `evt-${events.length}`,
        label: timeMatch ? part.slice(0, timeMatch[0].length).trim() : `Update ${events.length + 1}`,
        detail: timeMatch ? part.slice(timeMatch[0].length).trim() : part,
        order: events.length,
      });
    }
  }

  return events.slice(0, 6);
}
