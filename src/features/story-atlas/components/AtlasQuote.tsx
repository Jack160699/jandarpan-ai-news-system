import { memo } from "react";

type AtlasQuoteProps = {
  text: string;
  attribution?: string;
};

export const AtlasQuote = memo(function AtlasQuote({
  text,
  attribution,
}: AtlasQuoteProps) {
  return (
    <blockquote className="atlas-quote">
      <span className="atlas-quote__mark" aria-hidden>
        “
      </span>
      <p className="atlas-quote__text">{text}</p>
      {attribution ? (
        <cite className="atlas-quote__cite">— {attribution}</cite>
      ) : null}
    </blockquote>
  );
});
