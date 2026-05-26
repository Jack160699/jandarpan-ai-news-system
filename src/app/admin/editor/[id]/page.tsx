import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
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
      <JanDarpanEditorWorkbench articleId={id} />
    </AdminPageGate>
  );
}
