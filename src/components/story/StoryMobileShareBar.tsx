"use client";

type StoryMobileShareBarProps = {
  url: string;
  title: string;
};

export function StoryMobileShareBar({ url, title }: StoryMobileShareBarProps) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  }

  async function nativeShare() {
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title, url });
    } catch {
      /* cancelled */
    }
  }

  return (
    <div
      className="story-mobile-share"
      role="toolbar"
      aria-label="Share article"
    >
      <button
        type="button"
        className="story-mobile-share__btn story-mobile-share__btn--primary tap-target"
        onClick={nativeShare}
      >
        Share
      </button>
      <a
        href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="story-mobile-share__btn tap-target"
        aria-label="Share on WhatsApp"
      >
        WA
      </a>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="story-mobile-share__btn tap-target"
        aria-label="Share on X"
      >
        X
      </a>
      <button
        type="button"
        className="story-mobile-share__btn tap-target"
        onClick={copyLink}
        aria-label="Copy link"
      >
        Link
      </button>
    </div>
  );
}
