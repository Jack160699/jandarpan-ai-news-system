"use client";

import { Masthead, ReaderShell } from "@/features/reader-ds/components";
import { PostNewsWizard } from "@/features/user-news/PostNewsWizard";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { tUserNews } from "@/features/user-news/strings";

/** Profile → POST NEWS. Only verified, signed-in readers get past the wizard's own gate; the server re-checks every action. */
export default function PostNewsPage() {
  const { language } = useLanguage();
  const locale = language === "en" ? "en" : "hi";
  const { isLoggedIn, loading } = useReaderAccount();

  return (
    <ReaderShell activeNav="profile">
      <Masthead />
      <main id="main-content" role="main" className="jd-shell" style={{ maxWidth: 680, margin: "0 auto", padding: "16px 14px 56px", width: "100%", boxSizing: "border-box" }}>
        <h1 style={{ fontSize: 22, margin: "0 0 14px" }}>{tUserNews(locale, "postNews")}</h1>
        {loading ? <p role="status">{tUserNews(locale, "loading")}</p> : isLoggedIn ? <PostNewsWizard /> : <p role="status">{tUserNews(locale, "signInToPost")}</p>}
      </main>
    </ReaderShell>
  );
}
