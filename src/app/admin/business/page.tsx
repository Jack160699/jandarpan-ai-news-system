import Link from "next/link";
import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";

export const dynamic = "force-dynamic";

const SECTIONS = [
  {
    href: "/admin/analytics",
    title: "Traffic & audience",
    hint: "Visits, engagement, and content performance",
  },
  {
    href: "/admin/seo/search-console",
    title: "SEO",
    hint: "Search Console, rankings, and indexing health",
  },
  {
    href: "/admin/seo/competitors",
    title: "Competitors",
    hint: "Competitive visibility and content gaps",
  },
  {
    href: "/admin/billing",
    title: "Revenue & billing",
    hint: "Plans, invoices, and commercial status",
  },
  {
    href: "/admin/executive",
    title: "Costs & AI spend",
    hint: "AI cost, budgets, and unit economics",
  },
] as const;

export default function AdminBusinessPage() {
  return (
    <AdminPageGate permission="analytics:read">
      <AdminShell
        title="Business overview"
        subtitle="Audience, SEO, revenue, and cost — open a section for detail."
      >
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
