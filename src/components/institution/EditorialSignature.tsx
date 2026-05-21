import { cn } from "@/lib/cn";
import { getDeskForSlug } from "@/lib/institution";

type EditorialSignatureProps = {
  author: string;
  role: string;
  slug?: string;
  className?: string;
};

export function EditorialSignature({
  author,
  role,
  slug,
  className,
}: EditorialSignatureProps) {
  const desk = slug ? getDeskForSlug(slug) : null;

  return (
    <footer className={cn("editorial-signature", className)}>
      <p className="editorial-signature__name">{author}</p>
      <p className="meta-label mt-2 text-[var(--ink-muted)]">{role}</p>
      {desk ? (
        <p className="meta-label mt-3 text-[var(--ink-faint)]">
          Filed from {desk.name} · Edited by {desk.editor}
        </p>
      ) : null}
    </footer>
  );
}
