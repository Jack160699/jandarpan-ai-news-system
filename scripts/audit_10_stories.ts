import { getStaticFallbackArticlePool } from "../src/lib/news/fallback/wire-articles";
import { generateAnchorSpokenScript } from "../src/lib/broadcast/anchor-script-engine";
import { splitIntoSpeechChunks } from "../src/features/jd-live/speechController";

const stories = getStaticFallbackArticlePool();
console.log(`Auditing ${stories.length} stories in fallback pool...`);

const sample = stories.slice(0, 10);
console.log(`\n============================================================`);
console.log(`AUDIT OF 10 CURRENT STORIES FOR COMPLETE AI SUMMARY NARRATION`);
console.log(`============================================================\n`);

sample.forEach((story, idx) => {
  const result = generateAnchorSpokenScript({
    headline: story.headline,
    summary: story.summary,
    articleBody: story.article_body,
    language: "hi",
  });

  const chunks = splitIntoSpeechChunks(result.script, "hi");
  const headlineWords = story.headline.split(/\s+/).slice(0, 5).join(" ");
  const headlineOccurrences = (result.script.match(new RegExp(headlineWords, "g")) || []).length;

  console.log(`--- [STORY ${idx + 1}] ---`);
  console.log(`Headline: ${story.headline}`);
  console.log(`AI Summary Chars: ${(story.summary || "").length}`);
  console.log(`Final Script Chars: ${result.script.length}`);
  console.log(`Factual Sentences Count: ${result.supportingSentences.length}`);
  console.log(`Speech Chunks Count: ${chunks.length}`);
  console.log(`Headline Spoken Once: ${headlineOccurrences === 1 ? "✅ YES (Exactly once)" : "❌ NO"}`);
  console.log(`Script Duration: ${result.durationSec}s`);
  console.log(`Chunks preview:`);
  chunks.forEach((c, cIdx) => console.log(`   Chunk ${cIdx + 1} (${c.length} ch): ${c}`));
  console.log(`\n`);
});
