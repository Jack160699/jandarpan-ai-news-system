import { redirect } from "next/navigation";

/**
 * "You" — the Atlas shell's avatar/bottom-nav destination.
 * Reader account content lives at /profile; this route is a stable target
 * for the header avatar and bottom-nav tab so neither hardcodes /profile.
 */
export default function YouPage() {
  redirect("/profile");
}
