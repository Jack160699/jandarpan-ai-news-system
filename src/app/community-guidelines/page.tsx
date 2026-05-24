import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { getPolicy } from "@/lib/legal/policies";

export const metadata: Metadata = {
  title: "Community Guidelines",
  robots: { index: true, follow: true },
};

export default function CommunityGuidelinesPage() {
  const doc = getPolicy("community-guidelines");
  if (!doc) notFound();
  return <LegalDocumentPage doc={doc} />;
}
