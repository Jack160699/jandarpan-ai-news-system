/**
 * Server-only news provider environment — safe checks without leaking keys.
 */

import { assertServerOnly } from "@/utils/env";

export type NewsProviderEnv = {
  gnews: boolean;
  newsdata: boolean;
  openai: boolean;
  anyConfigured: boolean;
};

export function getNewsProviderEnv(): NewsProviderEnv {
  assertServerOnly("getNewsProviderEnv");
  const gnews = Boolean(process.env.GNEWS_API_KEY?.trim());
  const newsdata = Boolean(process.env.NEWSDATA_API_KEY?.trim());
  const openai = Boolean(process.env.OPENAI_API_KEY?.trim());
  return {
    gnews,
    newsdata,
    openai,
    anyConfigured: gnews || newsdata,
  };
}

export function hasAnyNewsProviderConfigured(): boolean {
  return getNewsProviderEnv().anyConfigured;
}
