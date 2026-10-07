import type { PostNewsStatus } from "@/lib/user-news/service";
import { tUserNews, type UserNewsLocale } from "@/features/user-news/strings";

/** What the profile's POST NEWS card shows for each state. Pure, so every state is testable; the component only renders this. */
export type PostNewsCardModel = {
  state: "loading" | "signed_out" | "open" | "locked";
  badge: { label: string; tone: "verified" | "neutral" } | null;
  title: string;
  message: string;
  primary: { label: string; href: string } | null;
  secondary: { label: string; href: string } | null;
};

export function describePostNewsCard(input: { loading: boolean; isLoggedIn: boolean; status: PostNewsStatus | null; locale: UserNewsLocale }): PostNewsCardModel {
  const { locale } = input;
  const t = (k: Parameters<typeof tUserNews>[1]) => tUserNews(locale, k);
  const title = t("postNews");
  const myNews = { label: t("openMyNews"), href: "/profile/my-news" };

  if (!input.isLoggedIn) {
    return { state: "signed_out", badge: null, title, message: t("signInToPost"), primary: null, secondary: null };
  }
  if (input.loading || !input.status) {
    return { state: "loading", badge: null, title, message: t("loading"), primary: null, secondary: myNews };
  }
  const s = input.status;
  if (s.allowed) {
    return { state: "open", badge: { label: t("verifiedBadge"), tone: "verified" }, title, message: t("postNewsSub"), primary: { label: t("openPostNews"), href: "/profile/post-news" }, secondary: myNews };
  }
  // Locked: say exactly why. Never offer a button that cannot work, and never fake verification.
  const message =
    s.reason === "verification_unavailable" ? t("verificationUnavailable") : s.reason === "not_verified" ? t("verifyToPost") : s.reason === "not_authenticated" ? t("signInToPost") : s.message ?? t("error");
  return { state: "locked", badge: { label: t("notVerifiedBadge"), tone: "neutral" }, title, message, primary: null, secondary: myNews };
}
