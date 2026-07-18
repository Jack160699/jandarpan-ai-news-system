import Link from "next/link";
import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";

export const dynamic = "force-dynamic";

const SECTIONS = [
  {
    href: "/admin/health",
    title: "System health",
    hint: "Overall platform status and recent checks",
  },
  {
    href: "/admin/system",
    title: "Pipeline & workers",
    hint: "Orchestration, jobs, and validation",
  },
  {
    href: "/admin/ingestion",
    title: "Ingestion",
    hint: "Source fetch runs and failures",
  },
  {
    href: "/admin/schema",
    title: "Database & schema",
    hint: "Schema health for technical operators",
  },
] as const;

export default function AdminTechnicalPage() {
  return (
    <AdminPageGate permission="monitoring:read">
      <AdminShell
        title="System health"
        subtitle="Technical detail stays collapsed until you open it."
      >
        <p className="anr-cc-hero__summary" style={{ marginBottom: "1.25rem" }}>
          Use the rows below for pipeline, workers, ingestion, and database detail.
          Editors do not need this workspace for daily publishing.
        </p>
        <div className="anr-ws-list">
          {SECTIONS.map((section) => (
            <Link key={section.href} href={section.href} className="anr-ws-row">
              <div>
                <strong>{section.title}</strong>
                <p className="anr-meta">{section.hint}</p>
              </div>
              <span className="anr-ws-row__action">View details</span>
            </Link>
          ))}
        </div>
      </AdminShell>
    </AdminPageGate>
  );
}
