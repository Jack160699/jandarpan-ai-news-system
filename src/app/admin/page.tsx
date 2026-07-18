import { redirect } from "next/navigation";
import { getDashboardSession } from "@/lib/saas-auth/session";
import { landingPathForRole } from "@/lib/admin-platform/workspaces";

export const dynamic = "force-dynamic";

export default async function AdminIndexPage() {
  const session = await getDashboardSession();
  const role = session?.membership?.role ?? null;
  redirect(landingPathForRole(role));
}
