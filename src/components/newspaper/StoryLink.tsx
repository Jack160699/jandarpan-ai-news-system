import Link from "next/link";
import { cn } from "@/lib/cn";

type StoryLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export function StoryLink({ href, children, className }: StoryLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "story-link group inline-block transition-opacity duration-700 hover:opacity-65",
        className
      )}
    >
      {children}
    </Link>
  );
}
