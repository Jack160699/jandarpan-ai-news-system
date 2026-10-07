"use client";

import { Masthead, ReaderShell } from "@/features/reader-ds/components";
import { MyNewsList } from "@/features/user-news/MyNewsList";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { tUserNews } from "@/features/user-news/strings";

/** Profile → MY NEWS: the author's own stories with real status and engagement. */
export default function MyNewsPage() {
  const { language } = useLanguage();
  const locale = language === "en" ? "en" : "hi";
  const { isLoggedIn, loading } = useReaderAccount();

  return (
    <ReaderShell activeNav="profile">
      <Masthead />
      <main id="main-content" role="main" className="jd-shell" style={{ maxWidth: 720, margin: "0 auto", padding: "16px 14px 56px", width: "100%", boxSizing: "border-box" }}>
        <h1 style={{ fontSize: 22, margin: "0 0 6px" }}>{tUserNews(locale, "myNews")}</h1>
        {loading ? <p role="status">{tUserNews(locale, "loading")}</p> : isLoggedIn ? <MyNewsList /> : <p role="status">{tUserNews(locale, "signInToPost")}</p>}
      </main>
    </ReaderShell>
  );
}
