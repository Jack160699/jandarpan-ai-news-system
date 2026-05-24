import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { getPolicy } from "@/lib/legal/policies";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  const doc = getPolicy("terms");
  if (!doc) notFound();
  return <LegalDocumentPage doc={doc} />;
}
