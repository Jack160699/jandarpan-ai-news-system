import type { Metadata } from "next";
import { AdminSafeGuard } from "@/components/system/AdminSafeGuard";
import { NOINDEX_ROBOTS } from "@/lib/seo";
import "@/styles/admin-newsroom.css";

export const metadata: Metadata = {
  title: "Newsroom Admin",
  robots: NOINDEX_ROBOTS,
};

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminSafeGuard>{children}</AdminSafeGuard>;
}
