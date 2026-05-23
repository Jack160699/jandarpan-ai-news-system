"use client";

import { CategoryTabs } from "./CategoryTabs";

/** Global category navigation bar — sticky below TopHeader */
export function CategoryNav() {
  return (
    <div
      className="site-categories site-sticky site-sticky--categories newsroom-categories newsroom-sticky newsroom-sticky--categories"
      data-site-categories
    >
      <CategoryTabs />
    </div>
  );
}
