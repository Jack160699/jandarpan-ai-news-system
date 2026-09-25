import dynamic from "next/dynamic";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { getCachedGeneratedHomepageFeed } from "@/lib/homepage/cached-feed";
import { BRAND } from "@/lib/brand";
import {
  breadcrumbListJsonLd,
  buildHubPageMetadata,
  collectionPageJsonLd,
} from "@/lib/seo";
import { buildHomeBreadcrumb } from "@/lib/seo/breadcrumbs";
import { HomepageEmpty } from "@/sections/homepage";

export const revalidate = 60;

const BASE_TITLE = `Jan Darpan Live · ${BRAND.nameEn}`;
const BASE_DESCRIPTION =
  "Jan Darpan Live — AI-powered 24/7 newsroom with a virtual anchor, breaking news, and continuous Chhattisgarh coverage.";
const BASE_PATH = "/live";

export const metadata = buildHubPageMetadata({
  title: BASE_TITLE,
  description: BASE_DESCRIPTION,
  path: BASE_PATH,
  keywords: [
    "jan darpan live",
    "live news chhattisgarh",
    "AI newsroom",
    "breaking news",
    "जन दर्पण लाइव",
    "छत्तीसगढ़ लाइव न्यूज़",
    "virtual anchor",
  ],
});

import { LiveClientView } from "./LiveClientView";

import { redirect } from "next/navigation";

export default function LivePage() {
  redirect("/");
}

