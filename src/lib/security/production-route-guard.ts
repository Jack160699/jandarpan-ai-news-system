/**
 * Defense-in-depth guards for routes that must not run in production.
 */

import { NextResponse } from "next/server";
import { isProductionDeployment } from "@/lib/infrastructure/production";

export function rejectProductionDebugRequest(): NextResponse | null {
  if (!isProductionDeployment()) return null;
  return new NextResponse(null, { status: 404 });
}
