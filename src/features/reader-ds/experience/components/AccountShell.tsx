"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { DesktopPrimaryNav } from "../../components/DesktopPrimaryNav";
import { Masthead } from "../../components/Masthead";
import { ReaderShell } from "../../components/ReaderShell";
import { JdIcon } from "../../components/icons";
import { useJdDsT } from "../../i18n";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";

export type AccountNavKey =
  | "profile"
  | "saved"
  | "offline"
  | "history"
  | "language"
  | "district"
  | "membership"
  | "notifications";

type NavItem = {
  key: AccountNavKey;
  href: string;
  icon: "user" | "bookmark" | "download" | "clock" | "globe" | "pin" | "star" | "bell";
  labelKey:
    | "account.profile"
    | "account.saved"
    | "account.offline"
    | "account.history"
    | "account.language"
    | "account.district"
    | "account.membership"
    | "account.notifications";
};

const NAV: NavItem[] = [
  { key: "profile", href: "/archive", icon: "user", labelKey: "account.profile" },
  { key: "saved", href: "/archive/saved", icon: "bookmark", labelKey: "account.saved" },
  { key: "offline", href: "/archive/offline", icon: "download", labelKey: "account.offline" },
  { key: "history", href: "/archive/history", icon: "clock", labelKey: "account.history" },
  { key: "language", href: "/archive/language", icon: "globe", labelKey: "account.language" },
  { key: "district", href: "/archive/districts", icon: "pin", labelKey: "account.district" },
  { key: "membership", href: "/membership/manage", icon: "star", labelKey: "account.membership" },
  { key: "notifications", href: "/archive/notifications", icon: "bell", labelKey: "account.notifications" },
];

function resolveActive(pathname: string): AccountNavKey {
  if (pathname.startsWith("/archive/offline")) return "offline";
  if (pathname.startsWith("/archive/saved")) return "saved";
  if (pathname.startsWith("/archive/history")) return "history";
  if (pathname.startsWith("/archive/language")) return "language";
  if (pathname.startsWith("/archive/districts")) return "district";
  if (pathname.startsWith("/membership")) return "membership";
  if (pathname.startsWith("/archive/notifications")) return "notifications";
  return "profile";
}

/** D15 — dual-rail account shell (desk/tablet); phone keeps stacked content. */
export function AccountShell({
  children,
  pageTitle,
  active,
  showUtility = true,
  backHref,
}: {
  children: ReactNode;
  pageTitle: string;
  active?: AccountNavKey;
  showUtility?: boolean;
  backHref?: string;
}) {
  const { t } = useJdDsT();
  const pathname = usePathname() || "/archive";
  const router = useRouter();
  const { signOut, isLoggedIn } = useReaderAccount();
  const current = active ?? resolveActive(pathname);

  async function onSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <ReaderShell activeNav="more">
      <Masthead
        pageTitle={pageTitle}
        back={Boolean(backHref)}
        backHref={backHref}
      />
      <DesktopPrimaryNav active="more" />

      <div className="jd-account-layout">
        <nav
          className="jd-account-nav"
          data-testid="jd-account-nav-rail"
          aria-label={t("account.navAria")}
        >
          <ul>
            {NAV.map((item) => {
              const on = item.key === current;
              return (
                <li key={item.key}>
                  <Link href={item.href} className={on ? "is-active" : undefined} aria-current={on ? "page" : undefined}>
                    <JdIcon name={item.icon} size={18} stroke={1.8} color="currentColor" />
                    <span className="jd-account-nav__label">{t(item.labelKey)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {isLoggedIn ? (
            <button type="button" className="jd-account-signout" onClick={() => void onSignOut()}>
              <JdIcon name="user" size={18} stroke={1.8} color="currentColor" />
              <span className="jd-account-nav__label">{t("account.signOut")}</span>
            </button>
          ) : (
            <Link href="/login" className="jd-account-signout">
              <JdIcon name="user" size={18} stroke={1.8} color="currentColor" />
              <span className="jd-account-nav__label">{t("profile.account")}</span>
            </Link>
          )}
        </nav>

        <main id="main-content" role="main" className="jd-account-main">
          {children}
        </main>

        {showUtility ? (
          <aside className="jd-account-utility" aria-label={t("account.utilityTitle")}>
            <div className="jd-account-utility__card">
              <h2 className="jd-ui">{t("account.utilityTitle")}</h2>
              <p className="jd-ui">{t("account.utilityBody")}</p>
            </div>
          </aside>
        ) : null}
      </div>
    </ReaderShell>
  );
}
