import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import {
  getSupabaseEnvDiagnostics,
  isSupabaseConfigured,
} from "@/lib/supabase/env";
import { getProductionEnvChecks } from "@/lib/infrastructure/production";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const auth = verifyCronRequest(request);
  if (!auth.authorized) return cronAuthFailureResponse(auth);

  const supabase = getSupabaseEnvDiagnostics();
  const prod = getProductionEnvChecks();

  return NextResponse.json(
    {
      ok: true,
      now: new Date().toISOString(),
      auth: {
        authorized: auth.authorized,
        vercelCron: auth.vercelCron,
        expectedSecretEnv: auth.expectedSecretEnv,
        hasBearer: Boolean(auth.bearerToken),
        hasXSecret: Boolean(auth.cronHeader),
      },
      secretsLoaded: {
        CRON_SECRET: Boolean(process.env.CRON_SECRET?.trim()),
        CRON_API_SECRET: Boolean(process.env.CRON_API_SECRET?.trim()),
        ADMIN_SECRET: Boolean(process.env.ADMIN_SECRET?.trim()),
        INTERNAL_API_KEY: Boolean(process.env.INTERNAL_API_KEY?.trim()),
        AUTH_SECRET: Boolean(process.env.AUTH_SECRET?.trim()),
        API_SECRET: Boolean(process.env.API_SECRET?.trim()),
      },
      supabase,
      supabaseConfigured: isSupabaseConfigured(),
      production: prod,
      infraConfig: {
        ingestBudgetMs: INFRA_CONFIG.ingestBudgetMs,
        rssBatchSize: INFRA_CONFIG.rssBatchSize,
        providerMaxRetries: INFRA_CONFIG.providerMaxRetries,
        cronOrchestrateEnabled: INFRA_CONFIG.cronOrchestrateEnabled,
        intelligenceWorkersEnabled: INFRA_CONFIG.intelligenceWorkersEnabled,
        homepageCacheSeconds: INFRA_CONFIG.homepageCacheSeconds,
      },
    },
    { headers: noStoreHeaders() }
  );
}

