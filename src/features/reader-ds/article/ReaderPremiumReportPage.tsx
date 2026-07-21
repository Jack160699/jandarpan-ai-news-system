import Link from "next/link";
import { Masthead } from "../components/Masthead";
import { ReaderShell } from "../components/ReaderShell";
import { Tag } from "../components/primitives";
import { Byline } from "./components/Byline";
import { MembershipCta, PremiumRibbon } from "./components/ArticleBanners";

type PremiumReportRow = {
  slug: string;
  title: string;
  excerpt?: string | null;
  is_paywalled?: boolean | null;
  price_inr?: number | null;
  content_path?: string | null;
  author?: string | null;
};

/**
 * B19 presentation for `/premium/[slug]` reports table.
 * Does not invent charts or prices beyond the stored row.
 */
export function ReaderPremiumReportPage({ report }: { report: PremiumReportRow }) {
  return (
    <ReaderShell activeNav="home">
      <Masthead back backHref="/membership" />
      <PremiumRibbon />
      <article style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
        <Tag>गहन विश्लेषण · प्रीमियम</Tag>
        <h1
          className="jd-serif"
          style={{
            margin: "6px 0 8px",
            fontSize: 23,
            lineHeight: 1.3,
            fontWeight: 700,
            color: "var(--jd-ink)",
            overflowWrap: "anywhere",
          }}
        >
          {report.title}
        </h1>
        <Byline
          author={report.author?.trim() || "जनदर्पण प्रीमियम"}
          role="विशेष रिपोर्ट"
        />
        {report.excerpt ? (
          <p
            className="jd-serif"
            style={{
              margin: "0 0 12px",
              fontSize: 15,
              lineHeight: 1.75,
              color: "var(--jd-ink-2)",
            }}
          >
            {report.excerpt}
          </p>
        ) : null}

        <div
          style={{
            border: "1px solid var(--jd-line)",
            borderRadius: 3,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <div
            className="jd-ui"
            style={{ fontSize: 10.5, fontWeight: 800, color: "var(--jd-navy)", marginBottom: 8 }}
          >
            सदस्य सामग्री
          </div>
          {report.is_paywalled ? (
            <p className="jd-ui" style={{ margin: 0, fontSize: 13, color: "var(--jd-ink-2)", lineHeight: 1.5 }}>
              {typeof report.price_inr === "number"
                ? `पूर्ण रिपोर्ट सदस्यता या ₹${report.price_inr} में अनलॉक करें।`
                : "पूर्ण रिपोर्ट सदस्यता के साथ उपलब्ध है।"}
            </p>
          ) : (
            <p className="jd-ui" style={{ margin: 0, fontSize: 13, color: "var(--jd-ink-2)", lineHeight: 1.5 }}>
              {report.content_path
                ? "पूर्ण रिपोर्ट सदस्य रीडर के लिए तैयार की जा रही है।"
                : "पूर्वावलोकन उपलब्ध है। पूर्ण सामग्री प्रकाशित होते ही यहाँ दिखेगी।"}
            </p>
          )}
        </div>

        <MembershipCta href="/membership" />
        <p style={{ marginTop: 20 }}>
          <Link
            href="/"
            className="jd-ui"
            style={{ fontSize: 13, color: "var(--jd-navy)", fontWeight: 700 }}
          >
            ← होम
          </Link>
        </p>
      </article>
    </ReaderShell>
  );
}
