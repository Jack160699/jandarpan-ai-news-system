"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const SuperMenuDrawer = dynamic(
  () =>
    import("@/components/super-menu/SuperMenuDrawer").then((m) => ({
      default: m.SuperMenuDrawer,
    })),
  { ssr: false, loading: () => null }
);
import { MainHeader } from "./MainHeader";
import { CategoryNavbar } from "./CategoryNavbar";
import { BottomMobileNav } from "./BottomMobileNav";
import {
  APP_STICKY_STACK_ID,
  HOME_STACK_SLOT_ID,
} from "@/lib/layout/stack-heights";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <>
      <div id={APP_STICKY_STACK_ID} className="app-sticky-stack" data-stack-mode={isHome ? "home" : "chrome"}>
        <div className="app-sticky-stack__layer app-sticky-stack__layer--header">
          <MainHeader />
        </div>
        <div className="app-sticky-stack__layer app-sticky-stack__layer--category">
          <CategoryNavbar />
        </div>
        {isHome ? (
          <div id={HOME_STACK_SLOT_ID} className="app-sticky-stack__layer app-sticky-stack__layer--home" />
        ) : null}
      </div>
      <div className="app-feed">{children}</div>
      <BottomMobileNav />
      <SuperMenuDrawer />
    </>
  );
}
