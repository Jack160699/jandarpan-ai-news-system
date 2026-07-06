/**
 * Complete inventory of every OpenAI call site in the repository.
 * Used for forensic audits and cost attribution.
 */

export type OpenAiCallSite = {
  file: string;
  function: string;
  endpoint: string;
  worker?: string;
  cron?: string;
  queue?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: string;
  retryPolicy: string;
  timeoutMs: number;
  caller: string;
  estimatedInputTokens?: string;
  estimatedOutputTokens?: string;
  notes?: string;
};

export const OPENAI_CALL_SITES: OpenAiCallSite[] = [
  // ── Central providers (all callers route here) ──
  {
    file: "src/lib/ai/providers/chat.ts",
    function: "requestChatCompletion → postChat",
    endpoint: "chat.completions",
    model: "OPENAI_MODEL || gpt-4o-mini (OpenRouter fallback)",
    maxTokens: 1400,
    temperature: 0.35,
    responseFormat: "json_object (optional)",
    retryPolicy: "withTransientAiRetry: 3 attempts, 800ms×2^n backoff, transient only",
    timeoutMs: 45_000,
    caller: "All requestChatCompletion / chatJsonCompletion callers",
    notes: "Primary path; OpenRouter fallback on OpenAI failure",
  },
  {
    file: "src/lib/ai/providers/images.ts",
    function: "requestImageGeneration",
    endpoint: "images.generations",
    worker: "editorial_images",
    queue: "editorial_image_queue",
    model: "NEWSROOM_IMAGE_MODEL || dall-e-3",
    responseFormat: "url",
    retryPolicy: "No retry in provider; queue-level retry up to 3",
    timeoutMs: 60_000,
    caller: "generate-editorial-image.ts, generateCoverImage",
  },
  {
    file: "src/lib/intelligence/vector/embeddings.ts",
    function: "embedTextsSafe",
    endpoint: "embeddings",
    worker: "intelligence_embed",
    cron: "worker/embeddings",
    model: "OPENAI_EMBEDDING_MODEL || text-embedding-3-small",
    retryPolicy: "No retry; worker re-enqueues",
    timeoutMs: 45_000,
    caller: "vector-store.ts, semantic-cluster.ts",
    notes: "Gated by NEWSROOM_USE_EMBEDDINGS !== false",
  },

  // ── Pipeline: AI enrichment ──
  {
    file: "src/lib/news/ai/process.ts",
    function: "enrichArticle",
    endpoint: "chat.completions",
    worker: "ai_enrich",
    cron: "orchestrate",
    queue: "news_ai_queue",
    model: "gpt-4o-mini",
    maxTokens: 400,
    temperature: 0.3,
    responseFormat: "json_object",
    retryPolicy: "Provider 3× + AI queue retry up to 4 attempts",
    timeoutMs: 8_000,
    caller: "processAiQueueBatch, processRecentArticlesWithAi",
    estimatedInputTokens: "~150-400",
    estimatedOutputTokens: "~80-150",
  },

  // ── Pipeline: Editorial generation ──
  {
    file: "src/lib/news/ai/generate-article.ts",
    function: "callEditorialLlm",
    endpoint: "chat.completions",
    worker: "editorial_generate",
    cron: "orchestrate / event-bus",
    model: "NEWSROOM_EDITORIAL_MODEL || gpt-4o-mini",
    maxTokens: 2800,
    temperature: 0.35,
    responseFormat: "json_object",
    retryPolicy: "Provider 3× transient; no article-level retry",
    timeoutMs: 28_000,
    caller: "prepareCandidate → generateEditorialFromEvent",
    estimatedInputTokens: "800-4000 (fact pack: signals×420 char excerpts + cluster summary)",
    estimatedOutputTokens: "1200-2800 max",
    notes: "Largest chat cost driver per article",
  },
  {
    file: "src/lib/news/ai/editorial-repair.ts",
    function: "regenerateIntroSection",
    endpoint: "chat.completions",
    worker: "editorial_generate",
    model: "NEWSROOM_EDITORIAL_MODEL || gpt-4o-mini",
    maxTokens: 600,
    temperature: 0.3,
    responseFormat: "json_object",
    retryPolicy: "None (falls back to normalize)",
    timeoutMs: 18_000,
    caller: "repairBorderlineDraft (when quality.should_repair)",
    estimatedInputTokens: "1000-4500 (full factPackText + current draft)",
    estimatedOutputTokens: "~200-600",
    notes: "DUPLICATE WORK: 2nd LLM call per borderline article",
  },

  // ── Pipeline: Translation ──
  {
    file: "src/lib/i18n/multilingual/translate.ts",
    function: "translateArticleBundle",
    endpoint: "chat.completions",
    worker: "intelligence_snapshot / job_processor",
    queue: "infrastructure_jobs (translate_article)",
    model: "NEWSROOM_TRANSLATION_MODEL || gpt-4o-mini",
    maxTokens: 3200,
    temperature: 0.25,
    responseFormat: "json_object",
    retryPolicy: "None (returns null on failure)",
    timeoutMs: 90_000,
    caller: "translateGeneratedArticle, ensure-translation, translation worker",
    estimatedInputTokens: "2000-8000 (article_body sliced to 12000 chars in JSON.stringify)",
    estimatedOutputTokens: "1500-3200 max",
    notes: "HIGHEST COST MULTIPLIER: 5 langs default (en,cg,mr,bn,ta) per article",
  },

  // ── Pipeline: Shorts ──
  {
    file: "src/lib/news/shorts/summarize.ts",
    function: "generate60SecondSummary",
    endpoint: "chat.completions",
    worker: "inline (build-short)",
    model: "NEWSROOM_SHORTS_MODEL || gpt-4o-mini",
    maxTokens: 900,
    temperature: 0.35,
    responseFormat: "json_object",
    retryPolicy: "None (fallback summary)",
    timeoutMs: 45_000,
    caller: "buildNewsShortForArticle (NEWSROOM_AUTO_SHORTS=true)",
    estimatedInputTokens: "~400-1200",
    estimatedOutputTokens: "~400-900",
  },
  {
    file: "src/lib/news/shorts/voice.ts",
    function: "synthesizeShortVoice",
    endpoint: "audio.speech",
    model: "NEWSROOM_TTS_MODEL || tts-1",
    retryPolicy: "None",
    timeoutMs: 60_000,
    caller: "GET /api/shorts/voice/[slug]",
    estimatedInputTokens: "script up to 4096 chars",
    notes: "TTS priced per character, not tokens",
  },

  // ── Pipeline: Clustering embeddings ──
  {
    file: "src/lib/news/ai/event-clustering.ts",
    function: "fetchEmbeddings",
    endpoint: "embeddings",
    worker: "event_cluster",
    cron: "worker/event-cluster",
    model: "text-embedding-3-small",
    retryPolicy: "None (returns nulls)",
    timeoutMs: 12_000,
    caller: "clusterRecentSignals",
    notes: "Gated: NEWSROOM_USE_EMBEDDINGS === true only",
  },

  // ── Editor / API (manual) ──
  {
    file: "src/lib/editorial-editor/ai.ts",
    function: "chatCompletion / runEditorAiAction",
    endpoint: "chat.completions",
    model: "OPENAI_MODEL || gpt-4o-mini",
    maxTokens: 800,
    temperature: 0.4,
    retryPolicy: "None",
    timeoutMs: 0,
    caller: "POST /api/editorial/editor-ai (8 actions: rewrite, headlines, seo, grammar, summarize, translate, tone, tags)",
    estimatedInputTokens: "400-4000 (body slice)",
    estimatedOutputTokens: "~100-800",
  },
  {
    file: "src/lib/ai/generate-story.ts",
    function: "generateNewsroomStory → chatJsonCompletion",
    endpoint: "chat.completions",
    model: "gpt-4o-mini",
    maxTokens: 1400,
    temperature: 0.35,
    responseFormat: "json_object",
    retryPolicy: "Provider 3×",
    timeoutMs: 45_000,
    caller: "POST /api/editorial/ai/generate-story, AI assistant intake",
    estimatedInputTokens: "up to 6500 source chars",
    estimatedOutputTokens: "~800-1400",
  },
  {
    file: "src/lib/editorial-dashboard/regenerate.ts",
    function: "callRegenerateLlm",
    endpoint: "chat.completions",
    model: "NEWSROOM_EDITORIAL_MODEL || gpt-4o-mini",
    maxTokens: 2400,
    temperature: 0.35,
    responseFormat: "json_object",
    retryPolicy: "None",
    timeoutMs: 45_000,
    caller: "Admin dashboard regenerate action",
  },
  {
    file: "src/lib/dam/ai-analysis.ts",
    function: "analyzeAssetWithAi",
    endpoint: "chat.completions (vision)",
    worker: "dam_analyze",
    model: "OPENAI_VISION_MODEL || gpt-4o-mini",
    maxTokens: 500,
    temperature: 0.2,
    retryPolicy: "None (heuristic fallback)",
    timeoutMs: 0,
    caller: "DAM upload, POST /api/dam/assets/[id]/analyze, job_processor",
    notes: "Vision: image base64 in message",
  },
  {
    file: "src/lib/intelligence/summaries.ts",
    function: "buildAiSummaryOptional",
    endpoint: "chat.completions",
    model: "gpt-4o-mini",
    maxTokens: 120,
    temperature: 0.3,
    retryPolicy: "None",
    timeoutMs: 0,
    caller: "Intelligence snapshot (optional)",
    estimatedInputTokens: "~300-500",
    estimatedOutputTokens: "~40-120",
  },

  // ── Scripts (offline) ──
  {
    file: "scripts/backfill-article-translations.mjs",
    function: "translateOne",
    endpoint: "chat.completions",
    model: "gpt-4o-mini",
    maxTokens: 3200,
    temperature: 0.25,
    retryPolicy: "None",
    timeoutMs: 90_000,
    caller: "npm run backfill:translations (manual script)",
  },
  {
    file: "scripts/diagnose-openai-auth.ts",
    function: "main",
    endpoint: "chat.completions",
    model: "gpt-4o-mini",
    maxTokens: 5,
    retryPolicy: "None",
    timeoutMs: 15_000,
    caller: "Diagnostic script only",
  },
];
