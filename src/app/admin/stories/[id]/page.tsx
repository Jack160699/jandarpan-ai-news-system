import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { ArticleEditorWorkstation } from "@/components/admin-newsroom/ArticleEditorWorkstation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminStoryEditorPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <AdminPageGate permission="editorial:write">
      <AdminShell
        title="Article Editor"
        subtitle="Rich text + markdown moderation workstation with autosave"
      >
        <ArticleEditorWorkstation articleId={id} />
      </AdminShell>
    </AdminPageGate>
  );
}
