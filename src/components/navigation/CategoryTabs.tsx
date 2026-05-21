"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { NAV_CATEGORIES } from "@/lib/navigation";
import { useLanguage } from "@/providers/LanguageProvider";

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

export function CategoryTabs() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [active, setActive] = useState("top-news");

  const scrollTo = useCallback(
    (href: string, id: string) => {
      setActive(id);
      if (!href.startsWith("#")) return;

      if (pathname !== "/") {
        window.location.href = `/${href}`;
        return;
      }

      const el = document.querySelector(href);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [pathname]
  );

  useEffect(() => {
    if (pathname !== "/") return;

    const ids = NAV_CATEGORIES.map((c) => c.href.replace("#", "")).filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) {
          const match = NAV_CATEGORIES.find(
            (c) => c.href === `#${visible.target.id}`
          );
          if (match) setActive(match.id);
        }
      },
      { rootMargin: "-40% 0px -45% 0px", threshold: [0, 0.15, 0.4] }
    );

    ids.forEach((id) => {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [pathname]);

  return (
    <nav className="category-tabs" aria-label="News categories">
      <div className="category-tabs__scroll">
        {NAV_CATEGORIES.map((cat) => {
          const key = NAV_KEYS[cat.id];
          const label = key ? t.nav[key] : cat.label;
          return (
            <button
              key={cat.id}
              type="button"
              className={`category-tab tap-target ${active === cat.id ? "is-active" : ""}`}
              aria-current={active === cat.id ? "true" : undefined}
              onClick={() => scrollTo(cat.href, cat.id)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
