import { DashboardGate } from "@/components/dashboard/DashboardGate";
import { DashboardProvider } from "@/components/dashboard/DashboardProvider";

export default function DashboardConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardGate>
      <DashboardProvider>{children}</DashboardProvider>
    </DashboardGate>
  );
}
