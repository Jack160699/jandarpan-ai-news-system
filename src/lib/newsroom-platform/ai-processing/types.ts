/** AI pipeline contracts — implementations stubbed until API keys wired */

export type AiJobType =
  | "summarize"
  | "translate"
  | "headline_optimize"
  | "seo_metadata"
  | "duplicate_check";

export type AiJobStatus = "queued" | "processing" | "completed" | "failed";

export type AiJobPayload = {
  articleId: string;
  type: AiJobType;
  language?: string;
  input?: Record<string, unknown>;
};

export type AiJobResult = {
  jobId: string;
  status: AiJobStatus;
  output?: Record<string, unknown>;
  error?: string;
  completedAt?: string;
};

export interface SummarizerService {
  summarize(text: string, maxWords?: number): Promise<string>;
}

export interface TranslatorService {
  translate(text: string, targetLang: string): Promise<string>;
}

export interface HeadlineOptimizerService {
  optimize(headline: string, context?: string): Promise<string>;
}

export interface SeoMetadataService {
  generate(input: {
    title: string;
    excerpt: string;
    tags: string[];
  }): Promise<{ title: string; description: string; keywords: string[] }>;
}

export interface DuplicateDetectorService {
  check(text: string, corpusIds: string[]): Promise<{ duplicate: boolean; score: number }>;
}
