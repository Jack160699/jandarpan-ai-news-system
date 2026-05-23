import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo";
import "@/styles/admin-newsroom.css";

export const metadata: Metadata = {
  title: "Newsroom Admin",
  robots: NOINDEX_ROBOTS,
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
