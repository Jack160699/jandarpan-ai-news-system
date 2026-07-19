import Link from "next/link";
import { Masthead } from "../../components/Masthead";
import { ReaderShell } from "../../components/ReaderShell";
import { JdIcon } from "../../components/icons";

/** E40 — success. Only shows order/plan when provided by real claim/query. */
export function PaymentSuccessPage({
  planLabel,
  orderId,
  validUntil,
}: {
  planLabel?: string | null;
  orderId?: string | null;
  validUntil?: string | null;
}) {
  return (
    <ReaderShell activeNav="more" hideBottomNav reserveMiniPlayer={false}>
      <Masthead hideActions />
      <main
        id="main-content"
        role="main"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "30px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 76,
            background: "rgba(47,125,82,.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 52,
              background: "var(--jd-green)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <JdIcon name="check" size={28} stroke={2.6} color="#fff" />
          </div>
        </div>
        <h1 className="jd-serif" style={{ margin: "0 0 6px", fontSize: 23, fontWeight: 700 }}>
          आप अब दर्पण प्रीमियम सदस्य हैं
        </h1>
        <p
          className="jd-ui"
          style={{ margin: "0 0 20px", fontSize: 13, color: "var(--jd-ink-3)", lineHeight: 1.6 }}
        >
          {validUntil
            ? `सदस्यता ${validUntil} तक मान्य।`
            : "आपकी सदस्यता सक्रिय है। रसीद उपलब्ध होने पर SMS/ईमेल से भेजी जाएगी।"}
        </p>
        {(planLabel || orderId) && (
          <div
            style={{
              width: "100%",
              border: "1px solid var(--jd-line)",
              borderRadius: 3,
              padding: "12px 14px",
              marginBottom: 20,
              textAlign: "left",
            }}
          >
            {planLabel ? (
              <div
                className="jd-ui"
                style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}
              >
                <span style={{ color: "var(--jd-ink-3)" }}>प्लान</span>
                <span style={{ fontWeight: 700 }}>{planLabel}</span>
              </div>
            ) : null}
            {orderId ? (
              <div className="jd-ui" style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--jd-ink-3)" }}>संदर्भ</span>
                <span style={{ fontWeight: 700 }}>{orderId}</span>
              </div>
            ) : null}
          </div>
        )}
        <Link
          href="/"
          className="jd-ui"
          style={{
            width: "100%",
            background: "var(--jd-red)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            padding: "14px 0",
            borderRadius: 3,
            textDecoration: "none",
            display: "block",
          }}
        >
          प्रीमियम पढ़ना शुरू करें
        </Link>
      </main>
    </ReaderShell>
  );
}
