"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { userNewsApi, type MyNewsApiItem } from "@/features/user-news/api";
import { tUserNews, type UserNewsLocale, type UserNewsStringKey } from "@/features/user-news/strings";
import { FILTERS, canWithdraw, countByFilter, engagementView, filterItems, isResumable, sortNewestFirst, statusLabel, type MyNewsFilter } from "@/features/user-news/my-news-model";
import { getDistrict } from "@/lib/regional/districts";

const FILTER_KEYS: Record<MyNewsFilter, UserNewsStringKey> = { all: "filterAll", published: "filterPublished", pending: "filterPending", rejected: "filterRejected", draft: "filterDraft" };

/** Pure view of the list (also used for server-side rendering in tests): takes data, renders it, fetches nothing. */
export function MyNewsView({
  items,
  locale,
  filter,
  onFilter,
  onWithdraw,
  monetizationMessage,
}: {
  items: MyNewsApiItem[];
  locale: UserNewsLocale;
  filter: MyNewsFilter;
  onFilter?: (f: MyNewsFilter) => void;
  onWithdraw?: (id: string) => void;
  monetizationMessage: string | null;
}) {
  const t = (k: UserNewsStringKey) => tUserNews(locale, k);
  const counts = useMemo(() => countByFilter(items), [items]);
  const shown = useMemo(() => sortNewestFirst(filterItems(items, filter)), [items, filter]);

  return (
    <div data-testid="my-news">
      {monetizationMessage ? (
        <p role="note" data-testid="revenue-note" style={{ background: "#eef3ff", border: "1px solid #c7d4f5", padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
          {monetizationMessage}
        </p>
      ) : null}

      <div role="tablist" aria-label={t("myNews")} style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0 14px" }}>
        {FILTERS.map((f) => (
          <button key={f} role="tab" aria-selected={filter === f} type="button" onClick={() => onFilter?.(f)} style={{ padding: "7px 12px", borderRadius: 999, border: "1px solid #b8c0d0", fontWeight: 800, fontSize: 13, background: filter === f ? "#0a1628" : "#fff", color: filter === f ? "#f6d36b" : "#0a1628" }}>
            {t(FILTER_KEYS[f])} ({counts[f]})
          </button>
        ))}
      </div>

      {shown.length === 0 ? <p>{t("noStories")}</p> : null}

      {shown.map((item) => {
        const eng = engagementView(item);
        const district = item.district ? getDistrict(item.district) : null;
        return (
          <article key={item.id} data-testid="my-news-item" data-status={item.status} style={{ display: "flex", gap: 12, background: "#fff", border: "1px solid #d9dee8", borderRadius: 12, padding: 12, marginBottom: 12 }}>
            {item.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.thumbnailUrl} alt="" width={96} height={54} style={{ objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
            ) : (
              <div aria-hidden="true" style={{ width: 96, height: 54, background: "#e8ecf4", borderRadius: 6, flexShrink: 0 }} />
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span data-testid="status-chip" style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: item.status === "published" ? "#0f6b3a" : item.status === "rejected" || item.status === "blocked" ? "#a4262c" : "#445", color: "#fff" }}>
                  {statusLabel(item.status, locale)}
                </span>
                <span style={{ fontSize: 12, color: "#556" }}>
                  {item.language === "hi" ? t("hindi") : t("english")}
                  {district ? ` · ${locale === "hi" ? district.nameHi : district.name}` : ""}
                </span>
              </div>
              <h3 style={{ margin: "6px 0", fontSize: 15, lineHeight: 1.35 }}>{item.headline ?? "—"}</h3>
              {item.publishedAt ? (
                <div style={{ fontSize: 12, color: "#556" }}>
                  {t("publishedOn")}: {new Date(item.publishedAt).toLocaleString(locale === "hi" ? "hi-IN" : "en-IN", { timeZone: "Asia/Kolkata" })}
                </div>
              ) : null}

              {eng ? (
                <dl data-testid="engagement" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(86px,1fr))", gap: 8, margin: "8px 0 0" }}>
                  {([
                    ["views", eng.views],
                    ["viewsToday", eng.today],
                    ["views7d", eng.week],
                    ["uniqueViewers", eng.unique],
                    ["likes", eng.likes],
                    ["comments", eng.comments],
                    ["engagement", eng.rate],
                  ] as Array<[UserNewsStringKey, number | string]>).map(([k, v]) => (
                    <div key={k}>
                      <dt style={{ fontSize: 11, color: "#556" }}>{t(k)}</dt>
                      <dd style={{ margin: 0, fontWeight: 800 }}>{typeof v === "number" ? new Intl.NumberFormat("en-IN").format(v) : v}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {item.moderationNote?.reason ? (
                <p style={{ background: "#fff4f4", border: "1px solid #f0c4c6", padding: "6px 10px", borderRadius: 8, fontSize: 13 }}>
                  <strong>{t("moderatorNote")}:</strong> {item.moderationNote.reason}
                </p>
              ) : null}

              <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                {isResumable(item.status) ? (
                  <Link href={`/profile/post-news?id=${item.id}`} style={{ fontWeight: 800, fontSize: 13 }}>
                    {t("continueEditing")}
                  </Link>
                ) : null}
                {item.status === "published" && item.slug ? (
                  <Link href={`/story/${item.slug}`} style={{ fontWeight: 800, fontSize: 13 }}>
                    {t("openStory")}
                  </Link>
                ) : null}
                {canWithdraw(item.status) && onWithdraw ? (
                  <button type="button" onClick={() => onWithdraw(item.id)} style={{ background: "none", border: "none", color: "#a4262c", fontWeight: 800, fontSize: 13, cursor: "pointer", padding: 0 }}>
                    {t("withdraw")}
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function MyNewsList() {
  const { language } = useLanguage();
  const locale: UserNewsLocale = language === "en" ? "en" : "hi";
  const [items, setItems] = useState<MyNewsApiItem[] | null>(null);
  const [monetization, setMonetization] = useState<string | null>(null);
  const [filter, setFilter] = useState<MyNewsFilter>("all");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await userNewsApi.my();
    if (!r.ok) return setError(r.status === 401 ? tUserNews(locale, "signInToPost") : r.message || tUserNews(locale, "error"));
    setItems(r.data.items);
    setMonetization(r.data.monetization.active ? null : tUserNews(locale, "revenueNotActive"));
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onWithdraw(id: string) {
    if (!window.confirm(tUserNews(locale, "withdrawConfirm"))) return;
    const r = await userNewsApi.withdraw(id);
    if (!r.ok) return setError(r.message || tUserNews(locale, "error"));
    await load();
  }

  if (error) return <p role="alert">{error}</p>;
  if (!items) return <p role="status">{tUserNews(locale, "loading")}</p>;
  return <MyNewsView items={items} locale={locale} filter={filter} onFilter={setFilter} onWithdraw={(id) => void onWithdraw(id)} monetizationMessage={monetization} />;
}
