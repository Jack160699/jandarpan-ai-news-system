"use client";

import { CategoryNav } from "./CategoryNav";
import { TopHeader } from "./TopHeader";

/**
 * App shell top chrome — TopHeader + CategoryNav with unified sticky stack.
 */
export function SiteChrome() {
  return (
    <div className="site-chrome newsroom-chrome" data-site-chrome>
      <TopHeader />
      <CategoryNav />
    </div>
  );
}
