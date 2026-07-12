"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useModalA11y } from "@/design-system/hooks/useModalA11y";
import { cn } from "@/design-system/utils/cn";
import { addSearchHistory } from "@/lib/search/history";
import {
  SEARCH_COMMAND_GROUP_LABELS,
  SEARCH_DEBOUNCE_MS,
  buildSearchCommandItems,
  filterSearchCommandItems,
  groupSearchCommandItems,
  useSearchKeyboard,
} from "@/features/search-v3/core";
import { fetchSearch } from "@/features/search-v3/core/api";
import { useShell } from "../AppShell/ShellProvider";
import type { CommandItem } from "../types";

/**
 * Global command palette — Cmd+K / Ctrl+K.
 * Searches articles, districts, topics, live updates, and commands.
 */
export function CommandPalette() {
  const router = useRouter();
  const { commandOpen, closeCommandPalette } = useShell();
  const [query, setQuery] = useState("");
  const [articles, setArticles] = useState<CommandItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const staticItems = useMemo<CommandItem[]>(
    () => (commandOpen ? buildSearchCommandItems() : []),
    [commandOpen]
  );

  const filtered = useMemo(() => {
    const pool = [...articles, ...staticItems];
    return filterSearchCommandItems(pool, query);
  }, [query, articles, staticItems]);

  const grouped = useMemo(
    () => groupSearchCommandItems(filtered),
    [filtered]
  );

  const selectItem = useCallback(
    (item: CommandItem) => {
      if (item.href) {
        if (item.group === "recent" || item.group === "articles") {
          addSearchHistory(item.label);
        }
        router.push(item.href);
      }
      item.onSelect?.();
      closeCommandPalette();
      setQuery("");
    },
    [router, closeCommandPalette]
  );

  const { activeIndex, setActiveIndex } = useSearchKeyboard({
    itemCount: filtered.length,
    enabled: commandOpen && filtered.length > 0,
    listId: "jdp-cmd",
    mode: "clamp",
    onSelect: (index) => {
      const item = filtered[index];
      if (item) selectItem(item);
    },
  });

  useModalA11y({
    open: commandOpen,
    onClose: closeCommandPalette,
    panelRef,
    initialFocusSelector: ".jdp-cmd__input",
  });

  useEffect(() => {
    if (!commandOpen) return;
    setActiveIndex(0);
    setQuery("");
  }, [commandOpen, setActiveIndex]);

  useEffect(() => {
    if (!commandOpen) return;
    const q = query.trim();
    if (q.length < 2) {
      setArticles([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchSearch({ query: q, limit: 6 }, controller.signal);
        setArticles(
          (data.hits ?? []).map((hit) => ({
            id: hit.id,
            label: hit.headline,
            href: `/story/${hit.slug}`,
            group: "articles" as const,
            meta: hit.section,
          }))
        );
      } catch {
        /* ignore aborted / network */
      } finally {
        setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, commandOpen]);

  if (!commandOpen) return null;

  let itemIndex = -1;

  return (
    <div
      className="jdp-cmd"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <button
        type="button"
        className="jdp-cmd__backdrop"
        aria-label="Close command palette"
        onClick={closeCommandPalette}
      />
      <div ref={panelRef} className="jdp-cmd__panel">
        <input
          ref={inputRef}
          type="search"
          className="jdp-cmd__input"
          placeholder="Search articles, districts, topics…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          aria-autocomplete="list"
          aria-controls="jdp-cmd-list"
          aria-activedescendant={
            filtered[activeIndex]
              ? `jdp-cmd-item-${filtered[activeIndex].id}`
              : undefined
          }
        />
        <div
          id="jdp-cmd-list"
          className="jdp-cmd__list"
          role="listbox"
        >
          {loading && (
            <p className="jdp-cmd__group-label">Searching…</p>
          )}
          {Array.from(grouped.entries()).map(([group, items]) => (
            <div key={group}>
              <p className="jdp-cmd__group-label">
                {SEARCH_COMMAND_GROUP_LABELS[group]}
              </p>
              {items.map((item) => {
                itemIndex += 1;
                const idx = itemIndex;
                return (
                  <button
                    key={item.id}
                    id={`jdp-cmd-item-${item.id}`}
                    type="button"
                    role="option"
                    aria-selected={idx === activeIndex}
                    className={cn(
                      "jdp-cmd__item",
                      idx === activeIndex && "jdp-cmd__item--active"
                    )}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => selectItem(item)}
                  >
                    <span>{item.label}</span>
                    {item.meta && (
                      <span className="jdp-cmd__meta">{item.meta}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <p className="jdp-cmd__group-label">No results</p>
          )}
        </div>
      </div>
    </div>
  );
}
