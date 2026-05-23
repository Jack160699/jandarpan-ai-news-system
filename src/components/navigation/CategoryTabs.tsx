"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/providers/LanguageProvider";
import { useTenant } from "@/providers/TenantProvider";

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
  const { t, language } = useLanguage();
  const { navCategories } = useTenant();
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

    const ids = navCategories
      .map((c) => c.href.replace("#", ""))
      .filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) {
          const match = navCategories.find(
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
  }, [pathname, navCategories]);

  return (
    <nav className="category-tabs" aria-label="News categories">
      <div className="category-tabs__scroll">
        {navCategories.map((cat) => {
          const key = NAV_KEYS[cat.id];
          const label =
            key
              ? t.nav[key]
              : language === "en"
                ? cat.label
                : cat.labelHi ?? cat.label;
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
