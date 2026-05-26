/**
 * Request ID propagation — x-request-id header
 */

import { headers } from "next/headers";

const HEADER = "x-request-id";

export function generateRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getRequestIdFromHeaders(
  headerList: Headers | ReadonlyHeaders
): string | null {
  return headerList.get(HEADER) ?? headerList.get("x-correlation-id");
}

export async function getRequestId(): Promise<string> {
  try {
    const h = await headers();
    return getRequestIdFromHeaders(h) ?? generateRequestId();
  } catch {
    return generateRequestId();
  }
}

export function requestIdHeaders(requestId: string): Record<string, string> {
  return { [HEADER]: requestId };
}

export const REQUEST_ID_HEADER = HEADER;
