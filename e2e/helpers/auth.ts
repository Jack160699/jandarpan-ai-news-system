import type { APIRequestContext, BrowserContext, Page } from "@playwright/test";

const E2E_AUTH_HEADER = "x-e2e-auth";
const E2E_AUTH_HEADER_VALUE = "playwright-local";

const e2eHeaders = { [E2E_AUTH_HEADER]: E2E_AUTH_HEADER_VALUE };

/** Canonical desk roles plus legacy viewer alias used in the Phase 5 matrix. */
export type E2eDeskRole = "super_admin" | "moderator" | "editor" | "journalist" | "viewer";

export type CanonicalE2eRole = "super_admin" | "moderator" | "editor" | "journalist";

const ROLE_PERMISSIONS: Record<CanonicalE2eRole, string[]> = {
  super_admin: [
    "analytics:read",
    "content:read",
    "content:write",
    "editorial:write",
    "publish:write",
    "team:read",
    "team:write",
    "billing:read",
    "billing:write",
    "monitoring:read",
    "providers:read",
  ],
  moderator: [
    "analytics:read",
    "content:read",
    "content:write",
    "editorial:write",
    "publish:write",
    "monitoring:read",
    "providers:read",
  ],
  editor: [
    "analytics:read",
    "content:read",
    "content:write",
    "editorial:write",
    "providers:read",
  ],
  journalist: [
    "analytics:read",
    "content:read",
    "content:write",
    "editorial:write",
    "monitoring:read",
  ],
};

export function resolveE2eCanonicalRole(role: E2eDeskRole): CanonicalE2eRole {
  return role === "viewer" ? "journalist" : role;
}

export async function setE2eDeskSession(
  request: APIRequestContext,
  role: E2eDeskRole
): Promise<void> {
  const canonical = resolveE2eCanonicalRole(role);
  const res = await request.post("/api/e2e/auth/set-session", {
    data: { role: canonical, userId: `e2e-${canonical}` },
    headers: e2eHeaders,
  });
  if (!res.ok()) {
    throw new Error(`set-session failed: ${res.status()} ${await res.text()}`);
  }
}

/** Sync API request cookies into the browser context (isolated `request` fixture). */
export async function syncDeskCookiesToBrowser(
  request: APIRequestContext,
  context: BrowserContext
): Promise<void> {
  const state = await request.storageState();
  if (!state.cookies.length) return;
  await context.addCookies(state.cookies);
}

export async function clearE2eDeskSession(request: APIRequestContext): Promise<void> {
  await request.delete("/api/e2e/auth/set-session", { headers: e2eHeaders });
}

export async function mockSessionApi(
  page: Page,
  role: E2eDeskRole
): Promise<void> {
  const canonical = resolveE2eCanonicalRole(role);
  const permissions = ROLE_PERMISSIONS[canonical];

  await page.route("**/api/dashboard/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        user: { id: `e2e-${canonical}`, email: `${canonical}@e2e.test` },
        membership: {
          id: "e2e-m",
          tenantId: "e2e-tenant",
          tenantSlug: "jan-darpan",
          tenantName: "Jan Darpan",
          userId: `e2e-${canonical}`,
          email: `${canonical}@e2e.test`,
          role: canonical,
          status: "active",
        },
        permissions,
      }),
    });
  });
}

/** Preferred authenticated setup for Phase 5 local E2E (cookie desk auth). */
export async function authenticateAs(
  page: Page,
  role: E2eDeskRole,
  opts?: { mockSession?: boolean }
): Promise<void> {
  await setE2eDeskSession(page.request, role);
  await syncDeskCookiesToBrowser(page.request, page.context());
  if (opts?.mockSession !== false) {
    await mockSessionApi(page, role);
  }
}
