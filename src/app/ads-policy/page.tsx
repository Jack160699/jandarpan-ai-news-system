import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { getPolicy } from "@/lib/legal/policies";

export const metadata: Metadata = {
  title: "Personalized Ads Policy",
  robots: { index: true, follow: true },
};

export default function AdsPolicyPage() {
  const doc = getPolicy("ads-policy");
  if (!doc) notFound();
  return <LegalDocumentPage doc={doc} />;
}
