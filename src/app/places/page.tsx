import { redirect } from "next/navigation";

/**
 * "Places" — the Atlas shell header's place-chip destination.
 * District browsing lives at /districts; this route is a stable target for
 * the header chip so it doesn't hardcode /districts.
 */
export default function PlacesPage() {
  redirect("/districts");
}
