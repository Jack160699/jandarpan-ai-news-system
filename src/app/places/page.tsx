import { redirect } from "next/navigation";

/**
 * Legacy selector URL. Reader-facing district selection now lives in the one
 * persistent shell sheet exposed by Local Pulse and the bottom navigation.
 */
export default function PlacesPage() {
  redirect("/");
}
