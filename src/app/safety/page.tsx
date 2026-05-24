import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { getPolicy } from "@/lib/legal/policies";

export const metadata: Metadata = {
  title: "User Safety Standards",
  robots: { index: true, follow: true },
};

export default function SafetyPage() {
  const doc = getPolicy("safety");
  if (!doc) notFound();
  return <LegalDocumentPage doc={doc} />;
}
