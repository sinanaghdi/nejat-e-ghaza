import { expect, test } from "@playwright/test";

const routes = [
  { path: "/", heading: /غذای درجه‌یک را/ },
  { path: "/#/offers", heading: "همه پیشنهادهای فعال" },
  { path: "/#/for-restaurants", heading: /غذای مازادِ قابل‌مصرف/ },
  { path: "/#/privacy", heading: "سیاست حریم خصوصی" },
] as const;

const viewportWidths = [320, 360, 390, 768, 1024, 1440];

test("public pages remain usable without horizontal overflow at common widths", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/offers") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Not authenticated" }),
    });
  });

  for (const width of viewportWidths) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route.path);
      await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
      await page.evaluate(async () => { await document.fonts.ready; });
      const layout = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      expect(
        layout.document,
        `Document overflow at ${width}px on ${route.path}: ${JSON.stringify(layout)}`,
      ).toBeLessThanOrEqual(layout.viewport + 1);
      expect(
        layout.body,
        `Body overflow at ${width}px on ${route.path}: ${JSON.stringify(layout)}`,
      ).toBeLessThanOrEqual(layout.viewport + 1);
    }
  }

  expect(pageErrors, `Unexpected browser errors: ${pageErrors.join(" | ")}`).toEqual([]);
});
