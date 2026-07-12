import Link from "next/link";
import type { KnowledgeNavLink } from "@/lib/story/story-knowledge-navigation";
import type { StoryKnowledgeVm } from "@/lib/story/story-knowledge";

type StoryKnowledgeContextProps = {
  vm: StoryKnowledgeVm;
};

type KnowledgeSectionProps = {
  id: string;
  title: string;
  items: KnowledgeNavLink[];
};

function KnowledgeSection({ id, title, items }: KnowledgeSectionProps) {
  if (!items.length) return null;

  return (
    <section className="story-knowledge__section" aria-labelledby={id}>
      <h3 id={id} className="story-editorial-intel__section-title">
        {title}
      </h3>
      <ul className="story-knowledge__chips">
        {items.map((item) => (
          <li key={`${id}-${item.label}`}>
            <Link
              href={item.href}
              className="story-editorial-intel__badge story-knowledge__chip story-knowledge__chip-link"
              aria-label={item.ariaLabel}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function KnowledgeMetaLink({ item, label }: { item: KnowledgeNavLink; label: string }) {
  return (
    <div className="story-editorial-intel__reading-item">
      <dt className="story-editorial-intel__reading-label">{label}</dt>
      <dd className="story-editorial-intel__reading-value">
        <Link
          href={item.href}
          className="story-knowledge__meta-link"
          aria-label={item.ariaLabel}
        >
          {item.label}
        </Link>
      </dd>
    </div>
  );
}

function KnowledgeEventBridge({
  eventContext,
}: {
  eventContext: NonNullable<StoryKnowledgeVm["eventContext"]>;
}) {
  return (
    <section
      className="story-knowledge__event"
      aria-labelledby="story-knowledge-event-title"
    >
      <div className="story-event-intel__header story-knowledge__event-header">
        <h3
          id="story-knowledge-event-title"
          className="story-editorial-intel__section-title story-event-intel__title"
        >
          In this ongoing event
        </h3>
        {eventContext.coverageStatus ? (
          <span className="story-editorial-intel__badge story-event-intel__status">
            {eventContext.coverageStatus}
          </span>
        ) : null}
      </div>

      <p className="story-event-intel__event-title">{eventContext.coverageTitle}</p>

      {eventContext.contextLines.length ? (
        <ul className="story-knowledge__event-lines">
          {eventContext.contextLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}

      {eventContext.liveCoverageHref ? (
        <p className="story-event-intel__secondary-cta">
          <Link
            href={eventContext.liveCoverageHref}
            className="story-event-intel__link"
          >
            View live coverage
          </Link>
        </p>
      ) : null}
    </section>
  );
}

export function StoryKnowledgeContext({ vm }: StoryKnowledgeContextProps) {
  if (!vm.hasLayer) return null;

  const { nav } = vm;

  return (
    <section
      className="story-knowledge"
      aria-label="Story context and knowledge"
    >
      <h2
        id="story-knowledge-title"
        className="story-editorial-intel__section-title story-knowledge__title"
      >
        In Context
      </h2>

      {nav.category || nav.district ? (
        <dl className="story-editorial-intel__reading-info story-knowledge__meta">
          {nav.category ? (
            <KnowledgeMetaLink item={nav.category} label="Category" />
          ) : null}
          {nav.district ? (
            <KnowledgeMetaLink item={nav.district} label="District" />
          ) : null}
        </dl>
      ) : null}

      {vm.eventContext ? (
        <KnowledgeEventBridge eventContext={vm.eventContext} />
      ) : null}

      <KnowledgeSection
        id="story-knowledge-people"
        title="Related people"
        items={nav.people}
      />
      <KnowledgeSection
        id="story-knowledge-organizations"
        title="Related organizations"
        items={nav.organizations}
      />
      <KnowledgeSection
        id="story-knowledge-places"
        title="Related places"
        items={nav.locations}
      />
      <KnowledgeSection
        id="story-knowledge-topics"
        title="Topics"
        items={nav.topics}
      />
      <KnowledgeSection
        id="story-knowledge-keywords"
        title="Reader keywords"
        items={nav.readerKeywords}
      />
    </section>
  );
}
