"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  categoryHref,
  isCategoryActive,
  resolveNavHref,
} from "@/lib/navigation/active";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { useTenant } from "@/providers/TenantProvider";
import { triggerHaptic } from "@/lib/mobile/haptics";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { NAV_CATEGORIES, type NavCategory } from "@/lib/navigation";

const NAV_KEYS: Record<string, keyof ReturnType<typeof useLanguage>["t"]["nav"]> = {
  "top-news": "topNews",
  chhattisgarh: "chhattisgarh",
  raipur: "raipur",
  politics: "politics",
  crime: "crime",
  sports: "sports",
  business: "business",
  education: "education",
};

function labelFor(
  cat: NavCategory,
  t: ReturnType<typeof useLanguage>["t"],
  language: NewsroomLanguage
) {
  const key = NAV_KEYS[cat.id];
  if (key) return t.nav[key];
  return pickBilingualLabel(language, cat.label, cat.labelHi ?? cat.label);
}

export function CategoryTabs() {
  const router = useRouter();
  const { pathname, hash, startNavigation } = useNavigation();
  const { t, language } = useLanguage();
  const { navCategories } = useTenant();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const categories = navCategories.length ? navCategories : NAV_CATEGORIES;

  const activeId =
    categories.find((c) => isCategoryActive(c, pathname, hash))?.id ??
    "top-news";

  const updateIndicator = useCallback(() => {
    const root = scrollRef.current;
    if (!root) return;
    const activeEl = root.querySelector<HTMLElement>(
      `[data-cat-id="${activeId}"]`
    );
    if (!activeEl) return;
    setIndicator({
      left: activeEl.offsetLeft,
      width: activeEl.offsetWidth,
    });
  }, [activeId]);

  useEffect(() => {
    updateIndicator();
    const root = scrollRef.current;
    if (!root) return;
    const ro = new ResizeObserver(updateIndicator);
    ro.observe(root);
    return () => ro.disconnect();
  }, [updateIndicator, categories.length]);

  useEffect(() => {
    const root = scrollRef.current;
    const activeEl = root?.querySelector<HTMLElement>(
      `[data-cat-id="${activeId}"]`
    );
    activeEl?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeId]);

  const onHashSection = useCallback(
    (href: string) => {
      triggerHaptic("selection");
      startNavigation(href);
      if (pathname !== "/") {
        router.push(resolveNavHref(href, pathname));
        return;
      }
      const el = document.querySelector(href);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState(null, "", href);
      }
    },
    [pathname, router, startNavigation]
  );

  if (!categories.length) return null;

  return (
    <nav className="category-tabs" aria-label="News categories">
      <div ref={scrollRef} className="category-tabs__scroll">
        <span
          className="category-tabs__indicator"
          style={{
            transform: `translateX(${indicator.left}px)`,
            width: indicator.width,
          }}
          aria-hidden
        />
        {categories.map((cat) => {
          const active = cat.id === activeId;
          const label = labelFor(cat, t, language);
          const href = categoryHref(cat);
          const isHash = href.startsWith("#");

          if (isHash) {
            return (
              <button
                key={cat.id}
                type="button"
                data-cat-id={cat.id}
                className={`category-tab tap-press motion-tab${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => onHashSection(href)}
              >
                {label}
              </button>
            );
          }

          const linkHref = resolveNavHref(href, pathname);

          return (
            <Link
              key={cat.id}
              href={linkHref}
              data-cat-id={cat.id}
              prefetch={cat.id === "top-news"}
              className={`category-tab tap-press motion-tab${active ? " is-active" : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={() => {
                triggerHaptic("selection");
                startNavigation(linkHref);
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
