import { notFound } from "next/navigation";
import { FoundationLegalPage } from "@/components/legal/FoundationLegalPage";
import { getFoundationPolicy } from "@/lib/legal/foundation-policies";
import { buildLegalPageMetadata } from "@/lib/legal/page-metadata";

export async function generateMetadata() {
  const doc = getFoundationPolicy("editorial-policy");
  if (!doc) return {};
  return buildLegalPageMetadata({
    title: doc.titleEn,
    description: doc.sections[0]?.body ?? doc.titleEn,
    path: doc.path,
  });
}

export default function EditorialPolicyPage() {
  const doc = getFoundationPolicy("editorial-policy");
  if (!doc) notFound();
  return <FoundationLegalPage doc={doc} />;
}
