"use client";

import { CategoryNav } from "./CategoryNav";
import { TopHeader } from "./TopHeader";
import { TopUtilityBar } from "./TopUtilityBar";

/**
 * Global site chrome — utility bar + header + category nav (Bhaskar 2026 structure)
 */
export function SiteChrome() {
  return (
    <header className="site-chrome newsroom-chrome" data-site-chrome>
      <TopUtilityBar />
      <TopHeader />
      <CategoryNav />
    </header>
  );
}
