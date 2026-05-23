import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { ImagesPanel } from "@/sections/admin/ImagesPanel";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ key?: string }>;
};

export default function AdminImagesPage({ searchParams }: PageProps) {
  return (
    <AdminPageGate searchParams={searchParams}>
      <AdminShell
        title="Editorial images"
        subtitle="Hero image queue, retries, and regeneration."
      >
        <ImagesPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
