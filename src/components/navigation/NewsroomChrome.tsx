"use client";

import { CategoryTabs } from "./CategoryTabs";
import { AppHeader } from "./AppHeader";

/**
 * Global newsroom chrome — header + category bar with unified sticky stack.
 */
export function NewsroomChrome() {
  return (
    <div className="newsroom-chrome" data-newsroom-chrome>
      <AppHeader />
      <div className="newsroom-categories newsroom-sticky newsroom-sticky--categories">
        <CategoryTabs />
      </div>
    </div>
  );
}
