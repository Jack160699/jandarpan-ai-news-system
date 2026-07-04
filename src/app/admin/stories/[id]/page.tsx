import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Legacy route — canonical editor is /admin/editor/[id] */
export default async function LegacyStoryEditorRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(`/admin/editor/${id}`);
}
