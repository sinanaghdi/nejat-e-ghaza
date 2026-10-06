import { expect, test } from "@playwright/test";

const offer = {
  id: 1,
  merchant_id: 7,
  merchant: {
    id: 7,
    business_name: "کافه سبز",
    city: "کرمانشاه",
    address: "خیابان اصلی",
    latitude: 34.3142,
    longitude: 47.065,
  },
  title: "باکس شام نجات",
  description: "یک باکس شام تازه با تخفیف ویژه",
  original_price: "200000.00",
  sale_price: "100000.00",
  quantity: 3,
  available_quantity: 3,
  pickup_start: "2026-10-04T18:00:00Z",
  pickup_end: "2026-10-04T21:00:00Z",
  image_url: null,
  is_active: true,
  created_at: "2026-10-04T12:00:00Z",
};

const customer = {
  id: 11,
  name: "سینا احمدی",
  email: "sina@example.com",
  role: "CUSTOMER",
};

test("customer can discover, authenticate, order, and review order status", async ({ page }) => {
  let orderCreated = false;
  let authenticated = false;
  const pageErrors: string[] = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === "/api/offers" && request.method() === "GET") {
      const query = url.searchParams.get("query")?.trim();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(query ? [offer] : [offer]),
      });
      return;
    }

    if (url.pathname === "/api/auth/register" && request.method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(customer),
      });
      return;
    }

    if (url.pathname === "/api/auth/login" && request.method() === "POST") {
      authenticated = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ access_token: null, token_type: "bearer", csrf_token: "e2e-csrf-token" }),
      });
      return;
    }

    if (url.pathname === "/api/auth/me" && request.method() === "GET") {
      if (!authenticated) {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Not authenticated" }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(customer),
      });
      return;
    }

    if (url.pathname === "/api/orders" && request.method() === "POST") {
      orderCreated = true;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: 1,
          customer_id: customer.id,
          merchant_id: offer.merchant_id,
          total_amount: "100000.00",
          status: "PENDING",
          pickup_code: "1234",
          created_at: "2026-10-04T12:05:00Z",
          items: [
            {
              id: 1,
              food_offer_id: offer.id,
              quantity: 1,
              unit_price: "100000.00",
              subtotal: "100000.00",
            },
          ],
        }),
      });
      return;
    }

    if (url.pathname === "/api/payments/orders/1" && request.method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          payment: {
            id: 1,
            order_id: 1,
            provider: "mock",
            authority: "E2E-AUTHORITY",
            reference_id: null,
            amount: "100000.00",
            status: "PENDING",
            created_at: "2026-10-04T12:05:10Z",
            paid_at: null,
          },
          checkout_url: "/api/payments/mock/checkout/E2E-AUTHORITY",
        }),
      });
      return;
    }

    if (url.pathname === "/api/orders" && request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          orderCreated
            ? [
                {
                  id: 1,
                  customer_id: customer.id,
                  merchant_id: offer.merchant_id,
                  total_amount: "100000.00",
                  status: "PAID",
                  pickup_code: "1234",
                  created_at: "2026-10-04T12:05:00Z",
                  items: [
                    {
                      id: 1,
                      food_offer_id: offer.id,
                      quantity: 1,
                      unit_price: "100000.00",
                      subtotal: "100000.00",
                    },
                  ],
                },
              ]
            : [],
        ),
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ detail: "E2E route not mocked" }),
    });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "پیشنهادهای امروز" })).toBeVisible();
  expect(pageErrors, `Unexpected browser errors: ${pageErrors.join(" | ")}`).toEqual([]);

  await page.getByLabel("جست‌وجوی غذا یا فروشگاه").fill("باکس شام");
  await page.getByRole("button", { name: "جست‌وجو" }).click();
  await expect(page.getByRole("heading", { name: "باکس شام نجات" })).toBeVisible();

  await page.getByRole("button", { name: "ورود" }).click();
  await page.getByRole("button", { name: "ثبت‌نام" }).click();
  await page.getByLabel("نام و نام خانوادگی").fill(customer.name);
  await page.getByLabel("ایمیل").fill(customer.email);
  await page.getByLabel("رمز عبور").fill("password123");
  await page.getByRole("button", { name: "ساخت حساب" }).click();
  await expect(page.getByText("حساب شما ساخته شد. حالا با ایمیل و رمز عبور وارد شوید.")).toBeVisible();

  await page.getByLabel("ایمیل").fill(customer.email);
  await page.getByLabel("رمز عبور").fill("password123");
  await page.getByRole("button", { name: "ورود به حساب" }).click();
  await expect(page.getByRole("button", { name: "خروج" })).toBeVisible();

  await page.getByRole("button", { name: "مشاهده و رزرو" }).click();
  await page.getByRole("button", { name: "افزودن به سبد خرید" }).click();
  await expect(page.getByRole("dialog", { name: "سبد خرید" })).toBeVisible();

  await page.getByRole("button", { name: "ثبت سفارش" }).click();
  await expect(page.getByText("سفارش #1 ثبت شد")).toBeVisible();

  await page.getByRole("button", { name: "سفارش‌های من" }).click();
  await expect(page.getByRole("heading", { name: "سفارش‌های من" })).toBeVisible();
  await expect(page.getByText("پرداخت شده")).toBeVisible();
  await expect(page.getByText("#1", { exact: true })).toBeVisible();
});
