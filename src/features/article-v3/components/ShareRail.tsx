"use client";

type ShareRailProps = {
  url: string;
  title: string;
};

export function ShareRail({ url, title }: ShareRailProps) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    {
      label: "WhatsApp",
      short: "WA",
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      aria: "Share on WhatsApp",
      primary: true,
    },
    {
      label: "X",
      short: "X",
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      aria: "Share on X",
    },
    {
      label: "LinkedIn",
      short: "In",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      aria: "Share on LinkedIn",
    },
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  }

  return (
    <nav className="article-v3-share-rail" aria-label="Share story">
      <p className="article-v3-share-rail__label">Share</p>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`article-v3-share-rail__btn${l.primary ? " article-v3-share-rail__btn--primary" : ""}`}
          aria-label={l.aria}
          title={l.label}
        >
          <span>{l.short}</span>
        </a>
      ))}
      <button
        type="button"
        className="article-v3-share-rail__btn"
        onClick={copyLink}
        aria-label="Copy link"
        title="Copy link"
      >
        ⧉
      </button>
    </nav>
  );
}
