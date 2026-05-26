import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy URL — redirects to premium editorial overview */
export default function EditorialDashboardRedirect() {
  redirect("/admin/editorial");
}
