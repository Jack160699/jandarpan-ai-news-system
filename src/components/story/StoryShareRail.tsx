"use client";

type StoryShareRailProps = {
  url: string;
  title: string;
};

export function StoryShareRail({ url, title }: StoryShareRailProps) {
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
    <nav
      className="story-share-rail story-share-rail--sticky"
      aria-label="Share story"
    >
      <p className="story-share-rail__label">Share</p>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`story-share-btn tap-target${l.primary ? " story-share-btn--primary" : ""}`}
          aria-label={l.aria}
          title={l.label}
        >
          <span className="story-share-btn__short">{l.short}</span>
        </a>
      ))}
      <button
        type="button"
        className="story-share-btn tap-target"
        onClick={copyLink}
        aria-label="Copy link"
        title="Copy link"
      >
        <span className="story-share-btn__short">⧉</span>
      </button>
    </nav>
  );
}
