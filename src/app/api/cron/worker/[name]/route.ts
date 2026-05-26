/**
 * GET/POST /api/cron/worker/:name — run a single queue worker
 * Accepts underscore and kebab-case names (e.g. intelligence_embed, intelligence-snapshot)
 */

import {
  cronMethodHandlers,
  handleCronWorker,
} from "@/lib/infrastructure/cron/handlers";

export const runtime = "nodejs";
export const maxDuration = 120;

type RouteParams = { params: Promise<{ name: string }> };

async function run(request: Request, { params }: RouteParams) {
  const { name } = await params;
  return handleCronWorker(request, name);
}

export async function GET(request: Request, ctx: RouteParams) {
  return run(request, ctx);
}

export async function POST(request: Request, ctx: RouteParams) {
  return run(request, ctx);
}
