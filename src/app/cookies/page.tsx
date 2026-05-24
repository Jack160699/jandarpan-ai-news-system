import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { getPolicy } from "@/lib/legal/policies";

export const metadata: Metadata = {
  title: "Cookie Policy",
  robots: { index: true, follow: true },
};

export default function CookiesPage() {
  const doc = getPolicy("cookies");
  if (!doc) notFound();
  return <LegalDocumentPage doc={doc} />;
}
