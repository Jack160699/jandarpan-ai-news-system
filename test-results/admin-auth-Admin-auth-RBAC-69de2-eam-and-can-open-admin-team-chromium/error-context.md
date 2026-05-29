# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-auth.spec.ts >> Admin auth RBAC >> super_admin sees Team and can open /admin/team
- Location: e2e\admin-auth.spec.ts:13:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.anr-nav')
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for locator('.anr-nav')

```

```yaml
- banner:
  - img "Jan Darpan"
  - heading "Jan Darpan OS" [level=1]
  - paragraph: Newsroom Console
- text: Email
- textbox "Email"
- text: Password
- textbox "Password"
- button "Show password"
- checkbox "Remember me"
- text: Remember me
- button "Sign in"
- alert
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import {
  3  |   clearE2eDeskSession,
  4  |   mockSessionApi,
  5  |   setE2eDeskSession,
  6  | } from "./helpers/auth";
  7  | 
  8  | test.describe("Admin auth RBAC", () => {
  9  |   test.beforeEach(async ({ page }) => {
  10 |     await clearE2eDeskSession(page.request);
  11 |   });
  12 | 
  13 |   test("super_admin sees Team and can open /admin/team", async ({ page }) => {
  14 |     await setE2eDeskSession(page.request, "super_admin");
  15 |     await mockSessionApi(page, "super_admin");
  16 | 
  17 |     await page.goto("/admin/editorial", { waitUntil: "domcontentloaded" });
> 18 |     await expect(page.locator(".anr-nav")).toBeVisible({ timeout: 20_000 });
     |                                            ^ Error: expect(locator).toBeVisible() failed
  19 |     await expect(page.locator('.anr-nav a[href="/admin/team"]')).toBeVisible({
  20 |       timeout: 20_000,
  21 |     });
  22 | 
  23 |     await page.goto("/admin/team", { waitUntil: "domcontentloaded" });
  24 |     await expect(page).toHaveURL(/\/admin\/team/);
  25 |     await expect(page.locator("h1")).toContainText(/team/i);
  26 |   });
  27 | 
  28 |   test("editor does not see Team in sidebar", async ({ page }) => {
  29 |     await setE2eDeskSession(page.request, "editor");
  30 |     await mockSessionApi(page, "editor");
  31 | 
  32 |     await page.goto("/admin/editorial");
  33 |     await expect(page.locator(".anr-nav")).toBeVisible();
  34 |     await expect(page.getByRole("link", { name: "Team" })).toHaveCount(0);
  35 |   });
  36 | 
  37 |   test("editor is blocked from /admin/team", async ({ page }) => {
  38 |     await setE2eDeskSession(page.request, "editor");
  39 |     await mockSessionApi(page, "editor");
  40 | 
  41 |     await page.goto("/admin/team");
  42 |     await expect(page).not.toHaveURL(/\/admin\/team$/);
  43 |   });
  44 | 
  45 |   test("missing role cookie triggers session refresh", async ({ page, context }) => {
  46 |     await context.addCookies([
  47 |       {
  48 |         name: "nr-e2e-user",
  49 |         value: "e2e-no-role",
  50 |         url: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
  51 |       },
  52 |     ]);
  53 | 
  54 |     await page.goto("/admin/editorial", { waitUntil: "domcontentloaded" });
  55 |     await expect(page).toHaveURL(
  56 |       /\/api\/dashboard\/auth\/refresh-session|\/admin\/login/,
  57 |       { timeout: 15_000 }
  58 |     );
  59 |   });
  60 | 
  61 |   test("expired desk session redirects to login", async ({ page }) => {
  62 |     await page.context().clearCookies();
  63 |     await page.goto("/admin/editorial");
  64 |     await expect(page).toHaveURL(/\/admin\/login/);
  65 |   });
  66 | 
  67 |   test("logout clears desk cookies", async ({ page }) => {
  68 |     await setE2eDeskSession(page.request, "super_admin");
  69 |     await mockSessionApi(page, "super_admin");
  70 |     await page.goto("/admin/editorial");
  71 | 
  72 |     await page.evaluate(async () => {
  73 |       await fetch("/api/dashboard/auth/logout", { method: "POST" });
  74 |     });
  75 | 
  76 |     const cookies = await page.context().cookies();
  77 |     const roleCookie = cookies.find((c) => c.name === "nr-dashboard-role");
  78 |     expect(roleCookie?.value ?? "").toBe("");
  79 |   });
  80 | });
  81 | 
```