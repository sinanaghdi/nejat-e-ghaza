import { expect, test } from "@playwright/test";

test("admin can review and record a refund reconciliation through mocked API", async ({ page }) => {
  let authenticated = false;
  let refundMarked = false;
  const adminUser = {
    id: 1,
    name: "مدیر آزمون",
    email: "admin@example.com",
    role: "ADMIN",
  };
  const payment = {
    id: 8101,
    order_id: 1002,
    provider: "mock",
    authority: "E2E-REFUND-1002",
    reference_id: "E2E-GATEWAY-REF-1002",
    amount: "89000.00",
    status: "REFUND_REQUIRED",
    created_at: "2026-10-12T10:00:00Z",
    paid_at: "2026-10-12T10:00:00Z",
  };

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === "/api/auth/me" && method === "GET") {
      if (authenticated || request.headers().authorization === "Bearer e2e-admin-token") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(adminUser) });
      } else {
        await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ detail: "Not authenticated" }) });
      }
      return;
    }

    if (path === "/api/auth/login" && method === "POST") {
      authenticated = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "e2e-admin-token",
          token_type: "bearer",
          csrf_token: "e2e-csrf-token",
        }),
      });
      return;
    }

    if (path === "/api/auth/csrf" && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ csrf_token: "e2e-csrf-token" }),
      });
      return;
    }

    if (method === "GET" && [
      "/api/admin/users",
      "/api/admin/orders",
      "/api/admin/merchants",
      "/api/admin/offers/pending",
      "/api/admin/settlements",
    ].includes(path)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }

    if (path === "/api/admin/payments/refund-required" && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(refundMarked ? [] : [payment]),
      });
      return;
    }

    if (path === "/api/admin/payments/8101/refund-completed" && method === "PATCH") {
      const payload = request.postDataJSON() as { refund_reference?: string };
      if (!payload.refund_reference || payload.refund_reference.trim().length < 3) {
        await route.fulfill({
          status: 422,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Refund reference is required" }),
        });
        return;
      }
      refundMarked = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...payment, status: "REFUNDED" }),
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ detail: `Unmocked E2E route: ${method} ${path}` }),
    });
  });

  await page.goto("/#/login");
  await page.getByRole("button", { name: "ایمیل و رمز عبور" }).click();
  await page.getByLabel("ایمیل").fill("admin@example.com");
  await page.getByLabel("رمز عبور").fill("password123");
  await page.getByRole("button", { name: "ورود به حساب" }).click();

  await expect(page.getByRole("heading", { name: "داشبورد مدیر" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "پیگیری بازپرداخت‌ها" })).toBeVisible();
  await expect(page.getByText("سفارش #1002 · پرداخت #8101")).toBeVisible();

  page.on("dialog", async (dialog) => {
    if (dialog.type === "confirm") {
      await dialog.accept();
    } else if (dialog.type === "prompt") {
      await dialog.accept("E2E-REFUND-8101");
    } else {
      await dialog.dismiss();
    }
  });

  await page.getByRole("button", { name: "ثبت بازپرداخت انجام‌شده" }).click();
  await expect(page.getByText("در حال حاضر بازپرداختی در صف بررسی نیست.")).toBeVisible();
});
