import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { ModerationConsole } from "@/features/user-news/ModerationConsole";

export const dynamic = "force-dynamic";

export default function AdminUserNewsPage() {
  return (
    <AdminPageGate permission="publish:write">
      <AdminShell title="Reader news moderation" subtitle="Verified readers' submitted stories: review, decide and publish. Every decision is audit-logged.">
        <ModerationConsole />
      </AdminShell>
    </AdminPageGate>
  );
}
