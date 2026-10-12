import { expect, test } from "@playwright/test";

const policyPages = [
  { path: "privacy", title: "سیاست حریم خصوصی" },
  { path: "terms", title: "شرایط استفاده" },
  { path: "safety", title: "ایمنی غذا، لغو و بازپرداخت" },
  { path: "security", title: "امنیت و گزارش آسیب‌پذیری" },
  { path: "license", title: "مجوز و حقوق استفاده" },
] as const;

test("all public policy pages are reachable and include shared navigation", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.route("**/api/**", async (route) => {
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ detail: "API not used by public policy pages" }),
    });
  });

  for (const policy of policyPages) {
    await page.goto(`/#/${policy.path}`);
    await expect(page.getByRole("heading", { level: 1, name: policy.title })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "صفحات اطلاعاتی" })).toBeVisible();
    await expect(page.getByRole("contentinfo")).toContainText("نسخهٔ آزمایشی");
  }

  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: "حریم خصوصی" })).toBeVisible();
  await footer.getByRole("link", { name: "حریم خصوصی" }).click();
  await expect(page).toHaveURL(/#\/privacy$/);

  expect(pageErrors, `Unexpected browser errors: ${pageErrors.join(" | ")}`).toEqual([]);
});
