import { expect, test } from "@playwright/test";

test("admin can review and record a demo refund reconciliation", async ({ page }) => {
  await page.goto("/#/login");

  await page.getByRole("button", { name: /مدیر.*کاربران و نقش‌ها/ }).click();
  await expect(page.getByRole("heading", { name: "داشبورد مدیر" })).toBeVisible();

  await expect(page.getByRole("heading", { name: "پیگیری بازپرداخت‌ها" })).toBeVisible();
  await expect(page.getByText("سفارش #1002 · پرداخت #8101")).toBeVisible();

  page.on("dialog", async (dialog) => {
    if (dialog.type === "confirm") {
      await dialog.accept();
    } else if (dialog.type === "prompt") {
      await dialog.accept("DEMO-REFUND-8101");
    } else {
      await dialog.dismiss();
    }
  });

  await page.getByRole("button", { name: "ثبت بازپرداخت انجام‌شده" }).click();
  await expect(page.getByText("در حال حاضر بازپرداختی در صف بررسی نیست.")).toBeVisible();
});
