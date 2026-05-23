import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ key?: string }>;
};

export default async function AdminIndexPage({ searchParams }: PageProps) {
  const { key } = await searchParams;
  const qs = key ? `?key=${encodeURIComponent(key)}` : "";
  redirect(`/admin/editorial${qs}`);
}
