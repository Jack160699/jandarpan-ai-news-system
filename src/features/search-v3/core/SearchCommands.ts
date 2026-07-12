import { getSearchHistory } from "@/lib/search/history";
import {
  SHELL_COMMANDS,
  SHELL_DISTRICTS,
  SHELL_TOPICS,
} from "@/layouts/constants";
import type { CommandItem } from "@/layouts/types";
import { SEARCH_HISTORY_RECENT_LIMIT } from "./SearchHistory";

export const SEARCH_COMMAND_GROUP_LABELS: Record<CommandItem["group"], string> = {
  recent: "Recent",
  articles: "Articles",
  districts: "Districts",
  topics: "Topics",
  live: "Live",
  commands: "Commands",
};

/** Build static command-palette items from shell constants + recent history. */
export function buildSearchCommandItems(): CommandItem[] {
  const recent = getSearchHistory()
    .slice(0, SEARCH_HISTORY_RECENT_LIMIT)
    .map((q, i) => ({
      id: `recent-${i}`,
      label: q,
      href: `/search?q=${encodeURIComponent(q)}`,
      group: "recent" as const,
    }));

  const districts = SHELL_DISTRICTS.map((d) => ({
    id: d.id,
    label: d.label,
    href: d.href,
    group: "districts" as const,
  }));

  const topics = SHELL_TOPICS.map((t) => ({
    id: t.id,
    label: t.label,
    href: t.href,
    group: "topics" as const,
  }));

  const commands = SHELL_COMMANDS.map((c) => ({
    id: c.id,
    label: c.label,
    href: c.href,
    group: c.group as CommandItem["group"],
  }));

  return [...recent, ...districts, ...topics, ...commands];
}

export function filterSearchCommandItems(
  items: CommandItem[],
  query: string,
  limit = 16
): CommandItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items.slice(0, limit);
  return items.filter((item) => item.label.toLowerCase().includes(q)).slice(0, limit);
}

export function groupSearchCommandItems(
  items: CommandItem[]
): Map<CommandItem["group"], CommandItem[]> {
  const map = new Map<CommandItem["group"], CommandItem[]>();
  for (const item of items) {
    const list = map.get(item.group) ?? [];
    list.push(item);
    map.set(item.group, list);
  }
  return map;
}
