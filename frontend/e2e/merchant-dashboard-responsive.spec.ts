import { expect, test } from "@playwright/test";

const merchant = {
  id: 21,
  name: "فروشندهٔ آزمون",
  email: "merchant@example.com",
  role: "MERCHANT",
};

const profile = {
  id: 101,
  user_id: 21,
  business_name: "کافهٔ سهمینو",
  description: "کافهٔ نمایشی برای آزمون واکنش‌گرایی",
  address: "خیابان نمونه",
  city: "بابلسر",
  latitude: 36.7,
  longitude: 52.65,
  verification_status: "VERIFIED",
  verification_reason: null,
};

const merchantOrder = {
  id: 901,
  customer_id: 31,
  merchant_id: 101,
  total_amount: "125000.00",
  status: "READY_FOR_PICKUP",
  pickup_code: "E2E-CUSTOMER-ONLY-PICKUP-SECRET",
  created_at: "2026-10-31T18:00:00Z",
  items: [{ id: 1, food_offer_id: 501, quantity: 1, unit_price: "125000.00", subtotal: "125000.00" }],
};

const widths = [320, 360, 390, 540, 768, 820, 1024, 1280, 1440];

test("merchant workspace fits mobile, tablet and desktop widths", async ({ page }) => {
  let authenticated = false;
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === "/api/auth/me" && method === "GET") {
      await route.fulfill({
        status: authenticated ? 200 : 401,
        contentType: "application/json",
        body: JSON.stringify(authenticated ? merchant : { detail: "Not authenticated" }),
      });
      return;
    }

    if (path === "/api/auth/login" && method === "POST") {
      authenticated = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "e2e-merchant-token",
          token_type: "bearer",
          csrf_token: "e2e-merchant-csrf",
        }),
      });
      return;
    }

    if (path === "/api/auth/csrf" && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ csrf_token: "e2e-merchant-csrf" }),
      });
      return;
    }

    if (path === "/api/merchant/profile" && method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(profile) });
      return;
    }

    if (path === "/api/orders/merchant" && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([merchantOrder]),
      });
      return;
    }

    if (method === "GET" && [
      "/api/offers",
      "/api/offers/mine",
      "/api/merchant/settlements",
    ].includes(path)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }

    if (path.startsWith("/api/")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
      return;
    }

    await route.continue();
  });

  await page.goto("/#/login");
  await page.getByRole("button", { name: "ایمیل و رمز عبور" }).click();
  await page.getByLabel("ایمیل").fill(merchant.email);
  await page.getByLabel("رمز عبور").fill("password123");
  await page.getByRole("button", { name: "ورود به حساب" }).click();

  await expect(page.getByRole("heading", { level: 1, name: profile.business_name })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "ناوبری پنل فروشنده" })).toBeVisible();
  await expect(page.locator(".dashboard-brand-mark")).toBeVisible();
  await expect(page.getByText("سفارش #901")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("E2E-CUSTOMER-ONLY-PICKUP-SECRET");

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      sidebar: document.querySelector(".dashboard-sidebar")?.getBoundingClientRect().width ?? 0,
      logo: document.querySelector(".dashboard-brand-mark")?.getBoundingClientRect().width ?? 0,
      logoBackground: document.querySelector(".dashboard-brand-mark")
        ? getComputedStyle(document.querySelector(".dashboard-brand-mark")!).backgroundColor
        : "",
    }));
    expect(layout.document, `Merchant document overflow at ${width}px: ${JSON.stringify(layout)}`).toBeLessThanOrEqual(layout.viewport + 1);
    expect(layout.body, `Merchant body overflow at ${width}px: ${JSON.stringify(layout)}`).toBeLessThanOrEqual(layout.viewport + 1);
    expect(layout.sidebar, `Merchant sidebar has no layout at ${width}px`).toBeGreaterThan(0);
    expect(layout.logo, `Merchant brand mark too small at ${width}px`).toBeGreaterThanOrEqual(30);
    expect(layout.logoBackground, `Merchant logo inherited a tile at ${width}px`).toBe("rgba(0, 0, 0, 0)");
  }

  expect(pageErrors, `Unexpected merchant browser errors: ${pageErrors.join(" | ")}`).toEqual([]);
});
