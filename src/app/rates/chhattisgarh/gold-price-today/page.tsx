import type { Metadata } from "next";
import {
  RateDetailPage,
  buildRateMetadata,
} from "@/features/reader-ds/utilities/RateDetailPage";

const PATH = "/rates/chhattisgarh/gold-price-today";

export async function generateMetadata(): Promise<Metadata> {
  return buildRateMetadata({
    category: "gold_24k",
    path: PATH,
  });
}

export default function Gold24kPage() {
  return <RateDetailPage category="gold_24k" path={PATH} />;
}
