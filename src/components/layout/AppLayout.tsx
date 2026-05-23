"use client";

import type { ReactNode } from "react";
import { MainHeader } from "./MainHeader";
import { CategoryNavbar } from "./CategoryNavbar";
import { BottomMobileNav } from "./BottomMobileNav";
import { FloatingLiveButton } from "./FloatingLiveButton";

type AppLayoutProps = {
  children: ReactNode;
};

/** Global app chrome — single header + category nav */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      <MainHeader />
      <CategoryNavbar />
      {children}
      <BottomMobileNav />
      <FloatingLiveButton />
    </>
  );
}
