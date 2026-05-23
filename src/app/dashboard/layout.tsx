import type { Metadata } from "next";
import "@/styles/saas-dashboard.css";

export const metadata: Metadata = {
  title: "Newsroom Console",
  robots: { index: false, follow: false },
};

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
