import { Node, mergeAttributes } from "@tiptap/core";
import Image from "@tiptap/extension-image";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    videoEmbed: {
      setVideoEmbed: (src: string) => ReturnType;
    };
  }
}

/** Pull-quote block (Arc-style) */
export const PullQuote = Node.create({
  name: "pullQuote",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML() {
    return [{ tag: 'blockquote[data-type="pull-quote"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "blockquote",
      mergeAttributes(HTMLAttributes, {
        "data-type": "pull-quote",
        class: "jd-pull-quote",
      }),
      0,
    ];
  },
  addCommands() {
    return {
      setPullQuote:
        () =>
        ({ commands }) =>
          commands.wrapIn(this.name),
    };
  },
});

/** YouTube / video embed */
export const VideoEmbed = Node.create({
  name: "videoEmbed",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      src: { default: null },
      width: { default: "100%" },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-video-embed="true"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    const src = HTMLAttributes.src as string;
    if (!src) return ["div", { "data-video-embed": "true" }];
    return [
      "div",
      mergeAttributes({ "data-video-embed": "true", class: "jd-video-embed" }),
      [
        "iframe",
        {
          src,
          width: "100%",
          height: "360",
          frameborder: "0",
          allowfullscreen: "true",
          loading: "lazy",
        },
      ],
    ];
  },
  addCommands() {
    return {
      setVideoEmbed:
        (src: string) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { src },
          }),
    };
  },
});

/** Image with width for resize */
export const ResizableImage = Image.extend({
  name: "image",
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "100%",
        parseHTML: (el) => el.getAttribute("width") ?? el.style.width ?? "100%",
        renderHTML: (attrs) => ({
          width: attrs.width,
          style: `width: ${attrs.width}; max-width: 100%; height: auto;`,
        }),
      },
      alt: { default: null },
    };
  },
});

export function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}
