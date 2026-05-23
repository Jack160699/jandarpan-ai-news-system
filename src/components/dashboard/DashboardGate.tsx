import { redirect } from "next/navigation";
import { getDashboardSession } from "@/lib/saas-auth/session";

export async function DashboardGate({ children }: { children: React.ReactNode }) {
  const session = await getDashboardSession();

  if (!session) {
    redirect("/dashboard/login");
  }

  return <>{children}</>;
}
