import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — Newsroom Admin",
};

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="anr-login-root">{children}</div>;
}
