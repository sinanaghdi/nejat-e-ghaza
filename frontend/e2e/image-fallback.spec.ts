import { expect, test } from "@playwright/test";

test("broken remote offer photos fall back to the Sahmino image treatment", async ({ page }) => {
  const now = Date.now();
  const offer = {
    id: 77,
    merchant_id: 7,
    merchant: {
      id: 7,
      business_name: "کافه نمونه",
      city: "بابلسر",
      address: "نشانی نمونه",
      latitude: 36.7,
      longitude: 52.65,
    },
    title: "بستهٔ غذایی نمایشی",
    description: "نمونه برای بررسی نمایش تصویر",
    original_price: 180000,
    sale_price: 90000,
    quantity: 4,
    available_quantity: 4,
    pickup_start: new Date(now + 60 * 60 * 1000).toISOString(),
    pickup_end: new Date(now + 4 * 60 * 60 * 1000).toISOString(),
    image_url: "https://broken.invalid/sahmino-test-food.jpg",
    is_active: true,
    moderation_status: "APPROVED",
    moderation_reason: null,
    moderated_at: null,
    created_at: new Date(now).toISOString(),
  };

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/offers") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([offer]),
      });
      return;
    }
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Not authenticated" }),
    });
  });
  await page.route("https://broken.invalid/**", (route) => route.abort());

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "بسته‌های سهمینو" })).toBeVisible();
  await expect(page.locator(".hero-photo-frame .hero-placeholder-food")).toBeVisible();
  await expect(page.locator(".offer-image .offer-image-fallback").first()).toBeVisible();
  await expect(page.locator(".hero-photo-frame img")).toHaveCount(0);
  await expect(page.locator(".offer-image img")).toHaveCount(0);
});
