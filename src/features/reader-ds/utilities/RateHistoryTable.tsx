import type { CSSProperties } from "react";
import type { VerifiedHistoryPoint } from "@/lib/verified-rates/types";

type Props = {
  points: VerifiedHistoryPoint[];
  unitLabel: string;
  caption: string;
};

/** Server-renderable HTML history table for SEO + accessibility. */
export function RateHistoryTable({ points, unitLabel, caption }: Props) {
  if (points.length === 0) {
    return (
      <p data-jd-rate-table="empty">
        तालिका के लिए अभी कोई सत्यापित दैनिक बिंदु उपलब्ध नहीं है।
      </p>
    );
  }

  const rows = [...points].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 31);

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        data-jd-rate-table="history"
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
      >
        <caption style={{ textAlign: "left", marginBottom: 8, fontWeight: 600 }}>
          {caption}
        </caption>
        <thead>
          <tr>
            <th scope="col" style={th}>
              तिथि
            </th>
            <th scope="col" style={th}>
              कीमत (₹ / {unitLabel})
            </th>
            <th scope="col" style={th}>
              सत्यापन समय
            </th>
            <th scope="col" style={th}>
              स्रोत संख्या
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={`${p.date}-${p.verifiedAt}`}>
              <td style={td}>{p.date}</td>
              <td style={td}>₹{p.price}</td>
              <td style={td}>
                <time dateTime={p.verifiedAt}>{p.verifiedAt}</time>
              </td>
              <td style={td}>{p.sourceCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th: CSSProperties = {
  borderBottom: "1px solid #ccc",
  textAlign: "left",
  padding: "8px 6px",
};
const td: CSSProperties = {
  borderBottom: "1px solid #eee",
  padding: "8px 6px",
};
