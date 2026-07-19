import Link from "next/link";
import { JdIcon } from "./icons";

type DistrictContextBarProps = {
  nameHi: string;
  changeHref?: string;
  newsCountLabel?: string;
};

/** A2 district context strip under masthead. */
export function DistrictContextBar({
  nameHi,
  changeHref = "/district?select=1",
  newsCountLabel,
}: DistrictContextBarProps) {
  return (
    <div
      className="jd-ui"
      style={{
        flexShrink: 0,
        background: "var(--jd-navy-deep)",
        color: "#c7d0e2",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "7px 14px",
        fontSize: 11.5,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <JdIcon name="pin" size={14} stroke={2} color="var(--jd-gold)" />
        <span style={{ fontWeight: 700, color: "var(--jd-gold-soft)" }}>{nameHi} ज़िला</span>
        <Link
          href={changeHref}
          className="jd-ui"
          style={{
            fontSize: 10,
            color: "#8ea0c4",
            border: "1px solid #33477a",
            borderRadius: 2,
            padding: "1px 6px",
            textDecoration: "none",
          }}
        >
          बदलें
        </Link>
      </div>
      {newsCountLabel ? <span style={{ color: "#8ea0c4" }}>{newsCountLabel}</span> : null}
    </div>
  );
}
