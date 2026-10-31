import { expect, test } from "@playwright/test";

function offer(id: number, title: string) {
  const now = Date.now();
  return {
    id,
    merchant_id: 7,
    merchant: {
      id: 7,
      business_name: "کافهٔ آزمون",
      city: "بابلسر",
      address: "خیابان نمونه",
      latitude: 36.7,
      longitude: 52.65,
    },
    title,
    description: "پیشنهاد آزمایشی برای بررسی ترتیب پاسخ درخواست‌ها",
    original_price: "200000.00",
    sale_price: "100000.00",
    quantity: 3,
    available_quantity: 3,
    pickup_start: new Date(now + 60 * 60 * 1000).toISOString(),
    pickup_end: new Date(now + 4 * 60 * 60 * 1000).toISOString(),
    image_url: null,
    is_active: true,
    moderation_status: "APPROVED",
    moderation_reason: null,
    moderated_at: null,
    created_at: new Date(now).toISOString(),
  };
}

test("older marketplace search response cannot overwrite a newer result", async ({ page }) => {
  let slowRequestStarted = false;

  await page.route("**/api/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.pathname === "/api/offers" && route.request().method() === "GET") {
      const query = requestUrl.searchParams.get("query");
      if (query === "کند") {
        slowRequestStarted = true;
        await new Promise((resolve) => setTimeout(resolve, 350));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([offer(101, "پیشنهاد قدیمی و کند")]),
        });
        return;
      }
      if (query === "سریع") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([offer(102, "پیشنهاد جدید و سریع")]),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }

    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Not authenticated" }),
    });
  });

  await page.goto("/#/offers");
  await expect(page.getByRole("heading", { level: 1, name: "غذاهای خوب را، هوشمندانه‌تر پیدا کن." })).toBeVisible();

  const search = page.getByLabel("جست‌وجوی غذا یا فروشگاه");
  const searchButton = page.getByRole("button", { name: "جست‌وجو" });

  await search.fill("کند");
  await searchButton.click();
  await expect.poll(() => slowRequestStarted).toBe(true);

  await search.fill("سریع");
  await searchButton.click();

  await expect(page.getByRole("heading", { level: 3, name: "پیشنهاد جدید و سریع" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "پیشنهاد قدیمی و کند" })).toHaveCount(0);

  await page.waitForTimeout(450);
  await expect(page.getByRole("heading", { name: "پیشنهاد جدید و سریع" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "پیشنهاد قدیمی و کند" })).toHaveCount(0);
});
