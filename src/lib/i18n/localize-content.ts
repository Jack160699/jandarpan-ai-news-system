import type { Article } from "@/lib/articles";
import type { FeedStory } from "@/lib/home-feed";
import type { AppLanguage } from "./types";

export type LocalizedStoryFields = {
  title: string;
  kicker: string;
  excerpt: string;
  showSecondary: boolean;
  secondaryTitle?: string;
};

export function localizeFeedStory(
  story: FeedStory,
  language: AppLanguage
): LocalizedStoryFields {
  if (language === "en") {
    return {
      title: story.title,
      kicker: story.kicker,
      excerpt: story.excerpt,
      showSecondary: Boolean(story.titleHi),
      secondaryTitle: story.titleHi,
    };
  }

  if (language === "cg") {
    return {
      title: story.titleHi ?? story.title,
      kicker: story.kickerHi ?? story.kicker,
      excerpt: story.excerpt,
      showSecondary: true,
      secondaryTitle: story.title,
    };
  }

  return {
    title: story.titleHi ?? story.title,
    kicker: story.kickerHi ?? story.kicker,
    excerpt: story.excerpt,
    showSecondary: Boolean(story.title),
    secondaryTitle: story.title,
  };
}

export function localizeArticle(article: Article, language: AppLanguage) {
  const story = localizeFeedStory(
    {
      slug: article.slug,
      title: article.title,
      titleHi: article.titleHi,
      kicker: article.kicker,
      kickerHi: article.kickerHi,
      excerpt: article.deck,
      image: article.image,
      readTime: article.readTime,
      filedAt: "",
    },
    language
  );

  return {
    ...story,
    deck:
      language === "en"
        ? article.deck
        : article.titleHi
          ? article.deck
          : article.deck,
  };
}
