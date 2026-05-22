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
      label: "WA",
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      aria: "Share on WhatsApp",
    },
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      aria: "Share on X",
    },
    {
      label: "In",
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
    <nav className="story-share-rail" aria-label="Share story">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="story-share-btn tap-target"
          aria-label={l.aria}
        >
          {l.label}
        </a>
      ))}
      <button
        type="button"
        className="story-share-btn tap-target"
        onClick={copyLink}
        aria-label="Copy link"
      >
        ⧉
      </button>
    </nav>
  );
}
