import type { Metadata } from "next";
import {
  RateDetailPage,
  buildRateMetadata,
} from "@/features/reader-ds/utilities/RateDetailPage";

const PATH = "/rates/chhattisgarh/silver-price-today";

export const metadata: Metadata = buildRateMetadata({
  category: "silver_999",
  path: PATH,
});

export default function SilverPage() {
  return <RateDetailPage category="silver_999" path={PATH} />;
}
