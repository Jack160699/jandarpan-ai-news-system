import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ key?: string }>;
};

/** Legacy URL — redirects to premium editorial overview */
export default async function EditorialDashboardRedirect({
  searchParams,
}: PageProps) {
  const { key } = await searchParams;
  const qs = key ? `?key=${encodeURIComponent(key)}` : "";
  redirect(`/admin/editorial${qs}`);
}
