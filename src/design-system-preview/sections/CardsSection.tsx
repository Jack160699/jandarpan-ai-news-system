import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
} from "@/design-system/components/Card";
import { HeroCard } from "@/design-system/components/HeroCard";
import { NewsCard } from "@/design-system/components/NewsCard";
import { Button } from "@/design-system/components/Button";
import { PreviewPanel, PreviewSection } from "../components/PreviewSection";
import {
  SAMPLE_AUTHOR,
  SAMPLE_DATE,
  SAMPLE_EXCERPT,
  SAMPLE_HEADLINE,
  SAMPLE_IMAGE,
  SAMPLE_READ_TIME,
  SAMPLE_SUMMARY,
} from "../sample-data";

export function CardsSection() {
  return (
    <PreviewSection
      id="cards"
      title="Cards"
      description="Card primitives and editorial card patterns for feeds and hero surfaces."
    >
      <PreviewPanel label="Card — flat & elevated">
        <div className="jds-preview__grid jds-preview__grid--2">
          <Card>
            <CardHeader>
              <strong>Flat card</strong>
            </CardHeader>
            <CardBody>Default surface with subtle border.</CardBody>
          </Card>
          <Card elevation="elevated">
            <CardHeader>
              <strong>Elevated card</strong>
            </CardHeader>
            <CardBody>Raised shadow for emphasis.</CardBody>
            <CardFooter>
              <Button variant="ghost" size="sm">
                Action
              </Button>
            </CardFooter>
          </Card>
        </div>
      </PreviewPanel>

      <PreviewPanel label="HeroCard">
        <HeroCard
          headline={SAMPLE_HEADLINE}
          summary={SAMPLE_SUMMARY}
          imageUrl={SAMPLE_IMAGE}
          category="Breaking"
          categoryVariant="breaking"
          author={SAMPLE_AUTHOR}
          publishedAt={SAMPLE_DATE}
        />
      </PreviewPanel>

      <PreviewPanel label="NewsCard — vertical & horizontal">
        <div className="jds-preview__grid jds-preview__grid--2">
          <NewsCard
            headline={SAMPLE_HEADLINE}
            excerpt={SAMPLE_EXCERPT}
            imageUrl={SAMPLE_IMAGE}
            category="Politics"
            categoryVariant="politics"
            author={SAMPLE_AUTHOR}
            publishedAt={SAMPLE_DATE}
            readTime={SAMPLE_READ_TIME}
            layout="vertical"
          />
          <NewsCard
            headline={SAMPLE_HEADLINE}
            excerpt={SAMPLE_EXCERPT}
            imageUrl={SAMPLE_IMAGE}
            category="Sports"
            categoryVariant="sports"
            author={SAMPLE_AUTHOR}
            publishedAt={SAMPLE_DATE}
            readTime={SAMPLE_READ_TIME}
            layout="horizontal"
          />
        </div>
      </PreviewPanel>
    </PreviewSection>
  );
}
