/**
 * SEO Execution Engine — feature flag
 */

export function isSeoExecutionEngineEnabled(): boolean {
  return process.env.SEO_EXECUTION_ENGINE === "true";
}

export const SEO_EXECUTION_MAX_ARTICLES = Number(
  process.env.SEO_EXECUTION_MAX_ARTICLES ?? 50
);

export const SEO_EXECUTION_USE_AI = process.env.SEO_EXECUTION_USE_AI !== "false";
