import type { Metadata } from "next";
import "@/design-system-preview/preview.css";
import { DesignSystemPage } from "@/design-system-preview/pages/DesignSystemPage";

export const metadata: Metadata = {
  title: "Design System Preview · JDP-011",
  description: "Internal design token preview for Project Phoenix — not for production.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <DesignSystemPage />;
}
