import type { Metadata } from "next";
import {
  RateDetailPage,
  buildRateMetadata,
} from "@/features/reader-ds/utilities/RateDetailPage";

const PATH = "/rates/chhattisgarh/silver-price-today";

export async function generateMetadata(): Promise<Metadata> {
  return buildRateMetadata({
    category: "silver_999",
    path: PATH,
  });
}

export default function SilverPage() {
  return <RateDetailPage category="silver_999" path={PATH} />;
}
