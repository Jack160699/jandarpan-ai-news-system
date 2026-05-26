"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Command, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ALL_SEARCHABLE_SETTINGS,
  fuzzyFilterSettings,
  type SearchableSetting,
} from "@/lib/platform-admin/settings-search";

export function CommandPalette({
  open,
  onClose,
  query,
  onQueryChange,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  onSelect: (item: SearchableSetting) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(
    () => fuzzyFilterSettings(query, ALL_SEARCHABLE_SETTINGS).slice(0, 12),
    [query]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && results[activeIndex]) {
        e.preventDefault();
        onSelect(results[activeIndex]);
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, activeIndex, onClose, onSelect]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            className="anr-ps-palette-backdrop"
            aria-label="Close command palette"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="anr-ps-palette"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            <div className="anr-ps-palette__search">
              <Command size={16} aria-hidden />
              <input
                autoFocus
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search settings, modules, pipelines…"
                aria-label="Command palette search"
              />
              <button type="button" className="anr-ps-palette__close" onClick={onClose} aria-label="Close">
                <X size={14} />
              </button>
            </div>
            <ul className="anr-ps-palette__list" role="listbox">
              {results.length ? (
                results.map((item, i) => (
                  <li key={`${item.kind}-${item.id}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === activeIndex}
                      className={`anr-ps-palette__item ${i === activeIndex ? "anr-ps-palette__item--active" : ""}`}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => {
                        onSelect(item);
                        onClose();
                      }}
                    >
                      <Search size={13} aria-hidden />
                      <div>
                        <strong>{item.title}</strong>
                        <span>
                          {item.sectionTitle} · {item.description.slice(0, 56)}
                          {item.description.length > 56 ? "…" : ""}
                        </span>
                      </div>
                    </button>
                  </li>
                ))
              ) : (
                <li className="anr-ps-palette__empty">No matching settings</li>
              )}
            </ul>
            <footer className="anr-ps-palette__foot">
              <span>
                <kbd>↑</kbd> <kbd>↓</kbd> navigate
              </span>
              <span>
                <kbd>↵</kbd> select
              </span>
              <span>
                <kbd>esc</kbd> close
              </span>
            </footer>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
