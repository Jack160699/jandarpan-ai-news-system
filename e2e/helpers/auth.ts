import type { APIRequestContext, BrowserContext, Page } from "@playwright/test";

const E2E_AUTH_HEADER = "x-e2e-auth";
const E2E_AUTH_HEADER_VALUE = "playwright-local";

const e2eHeaders = { [E2E_AUTH_HEADER]: E2E_AUTH_HEADER_VALUE };

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export async function setE2eDeskSession(
  request: APIRequestContext,
  role: "super_admin" | "editor"
): Promise<void> {
  const res = await request.post("/api/e2e/auth/set-session", {
    data: { role, userId: `e2e-${role}` },
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
  await context.addCookies(
    state.cookies.map((cookie) => ({
      ...cookie,
      url: cookie.url ?? baseURL,
    }))
  );
}

export async function clearE2eDeskSession(request: APIRequestContext): Promise<void> {
  await request.delete("/api/e2e/auth/set-session", { headers: e2eHeaders });
}

export async function mockSessionApi(
  page: Page,
  role: "super_admin" | "editor"
): Promise<void> {
  const permissions =
    role === "super_admin"
      ? [
          "team:read",
          "team:write",
          "billing:read",
          "content:read",
          "editorial:write",
          "analytics:read",
          "monitoring:read",
          "providers:read",
        ]
      : ["content:read", "editorial:write", "providers:read"];

  await page.route("**/api/dashboard/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        user: { id: `e2e-${role}`, email: `${role}@e2e.test` },
        membership: {
          id: "e2e-m",
          tenantId: "e2e-tenant",
          tenantSlug: "jan-darpan",
          tenantName: "Jan Darpan",
          userId: `e2e-${role}`,
          email: `${role}@e2e.test`,
          role,
          status: "active",
        },
        permissions,
      }),
    });
  });
}
