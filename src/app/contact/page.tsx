import { notFound } from "next/navigation";
import { ContactPageContent } from "@/components/contact/ContactPageContent";
import { buildLegalPageMetadata } from "@/lib/legal/page-metadata";
import { fetchOrganizationSettings } from "@/lib/organization/settings";

const MISSION =
  "Your Chhattisgarh — district bureaus, state desk, and live coverage you can trust.";

export async function generateMetadata() {
  const org = await fetchOrganizationSettings();
  return buildLegalPageMetadata({
    title: "Contact",
    description: `Contact ${org.organizationName}. Email ${org.email}, phone ${org.phone}, ${org.city}, ${org.state}.`,
    path: "/contact",
  });
}

export default async function ContactPage() {
  const org = await fetchOrganizationSettings();
  if (!org.email) notFound();

  return <ContactPageContent settings={org} mission={MISSION} />;
}
