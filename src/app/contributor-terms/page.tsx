import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { getPolicy } from "@/lib/legal/policies";

export const metadata: Metadata = {
  title: "Reader Contributor Terms",
  description: "How verified readers can send news to Jan Darpan: identity check, your approval, editorial review, rights and takedown.",
  alternates: { canonical: "/contributor-terms" },
  robots: { index: true, follow: true },
};

export default function ContributorTermsPage() {
  const doc = getPolicy("contributor-terms");
  if (!doc) notFound();
  return <LegalDocumentPage doc={doc} />;
}
