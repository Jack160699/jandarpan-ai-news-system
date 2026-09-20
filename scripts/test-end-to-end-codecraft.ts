import { createAdminServerClient } from "../src/lib/supabase";
import { generateEditorialFromEvent } from "../src/lib/news/ai/generate-article";

async function main() {
  console.log("Starting E2E CodeCraft Article Generation Test...");
  const supabase = createAdminServerClient();
  
  // Create a dummy news_event
  const { data: event, error: insertError } = await supabase
    .from("news_events")
    .insert({
      title: "Local Elections in Raipur show massive turnout",
      canonical_title: "Local Elections in Raipur show massive turnout",
      summary: "Voter turnout in Raipur reached a historic high of 85% in the local municipal elections today. Authorities reported peaceful voting across all 150 polling booths. Early trends indicate a strong showing for independent candidates.",
      region: "chhattisgarh",
      category: "politics",
      urgency_score: 0.9,
      confidence_score: 0.95,
      source_count: 5,
      clustering_metadata: { is_e2e_test: true }
    })
    .select("id")
    .single();

  if (insertError || !event) {
    console.error("Failed to create test news_event:", insertError);
    process.exit(1);
  }

  console.log(`Created test news_event with ID: ${event.id}`);
  console.log("Triggering CodeCraft generation pipeline...");

  try {
    const result = await generateEditorialFromEvent(event.id);
    
    if (!result) {
      console.error("Pipeline returned null. Generation failed or quota exhausted.");
      process.exit(1);
    }
    
    console.log("Generation successful!");
    console.log("Result summary:");
    console.log(`- Slug: ${result.article?.slug}`);
    console.log(`- Headline: ${result.article?.headline}`);
    console.log(`- Summary: ${result.article?.summary}`);
    console.log(`- AI Confidence: ${result.article?.editorial_metadata?.ai_confidence}`);
    console.log(`- Provider used: ${result.article?.editorial_metadata?.source_attribution?.[0]?.provider ?? 'Unknown'}`);
    
    process.exit(0);
  } catch (error) {
    console.error("Error during generation pipeline:", error);
    process.exit(1);
  }
}

main().catch(console.error);
