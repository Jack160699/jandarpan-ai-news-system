import type { Metadata } from "next";
import "@/design-system-preview/preview.css";
import { ComponentLibraryPage } from "@/design-system-preview/pages/ComponentLibraryPage";

export const metadata: Metadata = {
  title: "Component Library · JDP-011",
  description: "Internal JDS component inventory for Project Phoenix — not for production.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ComponentLibraryPage />;
}
