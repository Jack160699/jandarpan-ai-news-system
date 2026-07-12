"use client";

import type { ProfileV3SectionId } from "../types";

export type ProfileNavItem = {
  id: ProfileV3SectionId;
  label: string;
};

export type ProfileNavProps = {
  items: ProfileNavItem[];
  activeId: ProfileV3SectionId;
  onSelect: (id: ProfileV3SectionId) => void;
};

export function ProfileNav({ items, activeId, onSelect }: ProfileNavProps) {
  return (
    <nav className="pv3-nav" aria-label="Profile sections">
      <ul className="pv3-nav__list" role="list">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id} className="pv3-nav__item">
              <a
                href={`#${item.id}`}
                className={`pv3-nav__link${active ? " is-active" : ""}`}
                aria-current={active ? "location" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  onSelect(item.id);
                  document.getElementById(item.id)?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
