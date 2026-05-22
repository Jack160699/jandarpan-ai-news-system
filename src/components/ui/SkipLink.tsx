import Link from "next/link";

export function SkipLink() {
  return (
    <Link href="#main-content" className="skip-link">
      Skip to main content
    </Link>
  );
}
