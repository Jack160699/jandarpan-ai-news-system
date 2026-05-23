/**
 * Parse generated editorial markdown into structured story content
 */

export type StoryBlock =
  | { type: "paragraph"; text: string }
  | { type: "image"; src: string; alt: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "stat"; value: string; label: string };

export type StorySection = {
  id: string;
  title: string;
  paragraphs: string[];
  blocks: StoryBlock[];
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
  plainBlocks: StoryBlock[];
  highlights: string[];
};

const HIGHLIGHT_SECTION_RE =
  /key\s*(points|takeaways|highlights)|highlights|at\s+a\s+glance|मुख्य|मुख्य\s+बातें|सारांश/i;

const TIMELINE_SECTION_RE =
  /key development|मुख्य|घटनाक्रम|timeline|updates|क्रम/i;

const IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;
const BULLET_LINE_RE = /^[-*•]\s+/;

function slugifyHeading(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48);
}

function parseBlocks(text: string): StoryBlock[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const lines = trimmed.split("\n");
  const blocks: StoryBlock[] = [];
  let listBuffer: string[] = [];
  let paraBuffer: string[] = [];

  const flushPara = () => {
    if (!paraBuffer.length) return;
    const joined = paraBuffer.join(" ").trim();
    paraBuffer = [];
    if (!joined) return;
    blocks.push(...splitParagraphWithImages(joined));
  };

  const flushList = () => {
    if (!listBuffer.length) return;
    blocks.push({ type: "list", items: [...listBuffer] });
    listBuffer = [];
  };

  for (const line of lines) {
    const row = line.trim();
    if (!row) {
      flushList();
      flushPara();
      continue;
    }

    if (row.startsWith(">")) {
      flushList();
      flushPara();
      const quoteText = row.replace(/^>\s*/, "").trim();
      const attrMatch = quoteText.match(/^(.+?)\s*[—–-]\s*(.+)$/);
      if (attrMatch && attrMatch[1].length > 12) {
        blocks.push({
          type: "quote",
          text: attrMatch[1].replace(/^["']|["']$/g, "").trim(),
          attribution: attrMatch[2].trim(),
        });
      } else {
        blocks.push({
          type: "quote",
          text: quoteText.replace(/^["']|["']$/g, "").trim(),
        });
      }
      continue;
    }

    const statDirective = row.match(/^::stat\s+(.+)$/i);
    if (statDirective) {
      flushList();
      flushPara();
      const parts = statDirective[1].split("|").map((p) => p.trim());
      blocks.push({
        type: "stat",
        value: parts[0] ?? statDirective[1],
        label: parts[1] ?? "Key figure",
      });
      continue;
    }

    const statInline = row.match(/^(\d[\d,.]*%?)\s*[|·–-]\s*(.+)$/);
    if (statInline && row.length < 100) {
      flushList();
      flushPara();
      blocks.push({
        type: "stat",
        value: statInline[1].trim(),
        label: statInline[2].trim(),
      });
      continue;
    }

    if (BULLET_LINE_RE.test(row)) {
      flushPara();
      listBuffer.push(row.replace(BULLET_LINE_RE, "").trim());
      continue;
    }

    if (row.startsWith("![")) {
      flushList();
      flushPara();
      const imageBlocks = splitParagraphWithImages(row);
      blocks.push(...imageBlocks);
      continue;
    }

    flushList();
    paraBuffer.push(row);
  }

  flushList();
  flushPara();
  return blocks;
}

function splitParagraphWithImages(text: string): StoryBlock[] {
  const blocks: StoryBlock[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const re = new RegExp(IMAGE_RE.source, "g");
  while ((match = re.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim();
    if (before) blocks.push({ type: "paragraph", text: before });
    blocks.push({
      type: "image",
      alt: match[1]?.trim() ?? "",
      src: match[2]?.trim() ?? "",
    });
    lastIndex = match.index + match[0].length;
  }

  const after = text.slice(lastIndex).trim();
  if (after) blocks.push({ type: "paragraph", text: after });
  if (!blocks.length && text.trim()) {
    blocks.push({ type: "paragraph", text: text.trim() });
  }

  return blocks;
}

function blocksToParagraphs(blocks: StoryBlock[]): string[] {
  return blocks
    .filter((b): b is { type: "paragraph"; text: string } => b.type === "paragraph")
    .map((b) => b.text);
}

function extractHighlightsFromSections(sections: StorySection[]): string[] {
  const highlightSection = sections.find((s) =>
    HIGHLIGHT_SECTION_RE.test(s.title)
  );

  if (highlightSection) {
    const fromLists = highlightSection.blocks
      .filter((b): b is { type: "list"; items: string[] } => b.type === "list")
      .flatMap((b) => b.items);
    if (fromLists.length) return fromLists.slice(0, 6);

    return highlightSection.paragraphs
      .flatMap((p) => {
        if (BULLET_LINE_RE.test(p)) return [p.replace(BULLET_LINE_RE, "").trim()];
        return p
          .split(/\n/)
          .map((line) => line.replace(BULLET_LINE_RE, "").trim())
          .filter((line) => line.length > 12);
      })
      .slice(0, 6);
  }

  for (const section of sections) {
    if (TIMELINE_SECTION_RE.test(section.title)) continue;
    const items = section.blocks
      .filter((b): b is { type: "list"; items: string[] } => b.type === "list")
      .flatMap((b) => b.items);
    if (items.length >= 2) return items.slice(0, 6);
  }

  const first = sections.find((s) => !TIMELINE_SECTION_RE.test(s.title));
  if (!first) return [];

  return first.paragraphs
    .map((p) => p.replace(BULLET_LINE_RE, "").trim())
    .filter((p) => p.length > 40 && p.length < 220)
    .slice(0, 4);
}

export function parseStoryMarkdown(body: string): ParsedStoryContent {
  const trimmed = body.trim();
  if (!trimmed) {
    return {
      sections: [],
      plainParagraphs: [],
      plainBlocks: [],
      highlights: [],
    };
  }

  const chunks = trimmed.split(/^##\s+/m).filter(Boolean);
  if (chunks.length <= 1 && !trimmed.startsWith("##")) {
    const plainBlocks = parseBlocks(trimmed);
    const plainParagraphs = blocksToParagraphs(plainBlocks).filter(
      (p) => p.length > 20
    );
    return {
      sections: [],
      plainParagraphs,
      plainBlocks,
      highlights: plainParagraphs.slice(0, 4),
    };
  }

  const sections: StorySection[] = [];

  for (const chunk of chunks) {
    const lines = chunk.split("\n");
    const title = lines[0]?.trim() ?? "Section";
    const bodyText = lines.slice(1).join("\n").trim();
    const blocks = parseBlocks(bodyText);
    const paragraphs = blocksToParagraphs(blocks).filter((p) => p.length > 10);

    if (!paragraphs.length && !blocks.some((b) => b.type === "image" || b.type === "list")) {
      continue;
    }

    sections.push({
      id: slugifyHeading(title),
      title,
      paragraphs,
      blocks,
    });
  }

  const highlights = extractHighlightsFromSections(sections);

  return {
    sections,
    plainParagraphs: [],
    plainBlocks: [],
    highlights,
  };
}

const TIME_PREFIX_RE =
  /^(\d{1,2}(:\d{2})?\s*(am|pm)?|\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|\d{4}-\d{2}-\d{2})/i;

export function buildTimelineFromSections(
  sections: StorySection[]
): StoryTimelineEvent[] {
  const dev =
    sections.find((s) => TIMELINE_SECTION_RE.test(s.title)) ?? sections[0];

  if (!dev) return [];

  const events: StoryTimelineEvent[] = [];
  const listItems = dev.blocks
    .filter((b): b is { type: "list"; items: string[] } => b.type === "list")
    .flatMap((b) => b.items);

  const sources = listItems.length ? listItems : dev.paragraphs;

  for (let i = 0; i < sources.length; i++) {
    const text = sources[i];
    const bulletParts = text.split(/[.;]\s+/).filter((p) => p.length > 24);
    const parts = bulletParts.length > 1 ? bulletParts : [text];

    for (let j = 0; j < parts.length && events.length < 6; j++) {
      const part = parts[j].trim();
      const timeMatch = part.match(TIME_PREFIX_RE);
      events.push({
        id: `evt-${events.length}`,
        label: timeMatch
          ? part.slice(0, timeMatch[0].length).trim()
          : `Update ${events.length + 1}`,
        detail: timeMatch ? part.slice(timeMatch[0].length).trim() : part,
        order: events.length,
      });
    }
  }

  return events.slice(0, 6);
}

/** Sections to render in body (exclude highlight-only sections duplicated elsewhere) */
export function bodySections(sections: StorySection[]): StorySection[] {
  return sections.filter((s) => !HIGHLIGHT_SECTION_RE.test(s.title));
}
