import type { Metadata } from "next";
import {
  RateDetailPage,
  buildRateMetadata,
} from "@/features/reader-ds/utilities/RateDetailPage";

const PATH = "/rates/chhattisgarh/gold-22k-price-today";

export async function generateMetadata(): Promise<Metadata> {
  return buildRateMetadata({
    category: "gold_22k",
    path: PATH,
  });
}

export default function Gold22kPage() {
  return <RateDetailPage category="gold_22k" path={PATH} />;
}
