import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { JanDarpanEditorWorkbench } from "@/components/admin-editor/JanDarpanEditorWorkbench";
import "@/styles/collaboration.css";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditorArticlePage({ params }: PageProps) {
  const { id } = await params;
  return (
    <AdminPageGate permission="editorial:write">
      <AdminShell
        title="Editor"
        subtitle="Compose, refine, and publish"
        hidePageHeader
      >
        <JanDarpanEditorWorkbench articleId={id} />
      </AdminShell>
    </AdminPageGate>
  );
}
