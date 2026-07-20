import type { Metadata } from "next";
import {
  RateDetailPage,
  buildRateMetadata,
} from "@/features/reader-ds/utilities/RateDetailPage";

const PATH = "/rates/chhattisgarh/gold-price-today";

export const metadata: Metadata = buildRateMetadata({
  category: "gold_24k",
  path: PATH,
});

export default function Gold24kPage() {
  return <RateDetailPage category="gold_24k" path={PATH} />;
}
