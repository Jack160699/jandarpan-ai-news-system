import { redirect } from "next/navigation";

/** Alias for saved stories — canonical profile page is /archive */
export default function SavedRedirectPage() {
  redirect("/archive#saved-stories");
}
