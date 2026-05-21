import Link from "next/link";
import { EditionLineage } from "@/components/institution";
import { BRAND } from "@/lib/brand";
import { INSTITUTION, NEWSROOM_DESKS, getPublishingLineage } from "@/lib/institution";
import { Rule } from "@/components/ui/Rule";

export function Footer() {
  return (
    <footer
      id="footer"
      data-section="footer"
      className="news-scroll-target relative z-10 border-t border-[var(--rule-strong)] bg-[var(--paper-elevated)] pb-10 pt-8"
    >
      <div className="editorial-container">
        <p className="masthead-title-en pointer-events-none !text-[clamp(2rem,8vw,4rem)] opacity-[0.07]">
          {BRAND.nameEn}
        </p>

        <Rule className="my-10" />

        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="archive-marker">Institution</p>
            <EditionLineage className="mt-4" />
            <p className="editorial-body mt-6 max-w-sm text-sm text-[var(--ink-muted)]">
              {getPublishingLineage()}
            </p>
            <p className="meta-label mt-6 text-[var(--ink-faint)]">
              {BRAND.conceptLabel}
            </p>
          </div>

          <div className="lg:col-span-4">
            <p className="archive-marker">Newsroom · छत्तीसगढ़</p>
            <ul className="mt-4 space-y-2">
              {NEWSROOM_DESKS.map((d) => (
                <li key={d.id} className="meta-label text-[var(--ink-muted)]">
                  {d.name} — {d.editor}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <p className="archive-marker">Record</p>
            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  href="/archive"
                  className="editorial-body text-sm transition-opacity hover:opacity-60"
                >
                  Living archive
                </Link>
              </li>
              <li>
                <span className="editorial-body text-sm text-[var(--ink-muted)]">
                  Ethics & standards
                </span>
              </li>
              <li>
                <span className="editorial-body text-sm text-[var(--ink-muted)]">
                  Subscribe (concept)
                </span>
              </li>
            </ul>
          </div>
        </div>

        <Rule className="my-12" />

        <div className="flex flex-col gap-3 text-[var(--ink-faint)] sm:flex-row sm:justify-between">
          <p className="meta-label">
            © {new Date().getFullYear()} {INSTITUTION.name} · Concept showcase
          </p>
          <p className="meta-label">Privacy · Terms · Accessibility</p>
        </div>
      </div>
    </footer>
  );
}
