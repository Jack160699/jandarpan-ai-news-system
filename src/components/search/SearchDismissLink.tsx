"use client";

import Link from "next/link";

type SearchDismissLinkProps = {
  href: string;
  className?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
};

/** Overlay search link that dismisses the panel before navigation. */
export function SearchDismissLink({
  href,
  className,
  children,
  onDismiss,
}: SearchDismissLinkProps) {
  return (
    <Link href={href} className={className} onClick={onDismiss}>
      {children}
    </Link>
  );
}
