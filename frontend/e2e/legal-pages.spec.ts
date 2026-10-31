import { expect, test } from "@playwright/test";

const policyPages = [
  { path: "privacy", title: "سیاست حریم خصوصی" },
  { path: "terms", title: "شرایط استفاده از سهمینو" },
  { path: "safety", title: "ایمنی غذا، لغو و بازپرداخت" },
  { path: "merchant-terms", title: "شرایط همکاری فروشندگان" },
  { path: "cookies", title: "سیاست کوکی‌ها و ذخیره‌سازی" },
] as const;

test("public policy pages are reachable, connected, and free from developer links", async ({ page }) => {
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

  for (const policy of policyPages) {
    await page.goto(`/#/${policy.path}`);
    await expect(page.getByRole("heading", { level: 1, name: policy.title })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "صفحات حقوقی" })).toBeVisible();
    await expect(page.getByRole("contentinfo")).toContainText("معرفی اولیهٔ پایلوت");
    await expect(page.locator("body")).not.toContainText(/github|نمونه‌کار|مخزن عمومی/i);
  }

  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: "حریم خصوصی" })).toBeVisible();
  await expect(footer.getByRole("link", { name: "شرایط همکاری فروشندگان" })).toBeVisible();
  await expect(footer.locator('a[href*="github.com"]')).toHaveCount(0);
  await footer.getByRole("link", { name: "حریم خصوصی" }).click();
  await expect(page).toHaveURL(/#\/privacy$/);

  await page.goto("/#/security");
  await expect(page).toHaveURL(/#\/$/);
  await page.goto("/#/license");
  await expect(page).toHaveURL(/#\/$/);

  await page.goto("/#/for-restaurants");
  await expect(page.getByRole("heading", { level: 1, name: /غذای مازادِ قابل‌مصرف/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "ورود فروشندگان" }).first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/github|مخزن عمومی/i);

  expect(pageErrors, `Unexpected browser errors: ${pageErrors.join(" | ")}`).toEqual([]);
});
