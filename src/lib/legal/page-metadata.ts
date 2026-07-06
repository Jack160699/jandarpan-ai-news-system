import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export function buildLegalPageMetadata(input: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return buildPageMetadata({
    title: input.title,
    description: input.description,
    path: input.path,
    locale: "en_IN",
    alternateLocales: ["en_IN", "hi_IN"],
  });
}
