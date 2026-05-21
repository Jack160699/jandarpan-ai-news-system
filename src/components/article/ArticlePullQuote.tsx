type ArticlePullQuoteProps = {
  children: string;
  attribution?: string;
};

export function ArticlePullQuote({ children, attribution }: ArticlePullQuoteProps) {
  return (
    <aside className="article-pullquote" aria-label="Pull quote">
      <p className="article-pullquote__text">&ldquo;{children}&rdquo;</p>
      {attribution ? (
        <p className="article-pullquote__attrib">{attribution}</p>
      ) : null}
    </aside>
  );
}
