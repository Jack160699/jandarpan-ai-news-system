import { redirect } from "next/navigation";

/** Profile lives at /archive */
export default function ProfileRedirectPage() {
  redirect("/archive");
}
