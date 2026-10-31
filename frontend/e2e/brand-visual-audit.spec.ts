import { expect, test } from "@playwright/test";

const routes = [
  { path: "/", heading: /غذای درجه‌یک را/ },
  { path: "/#/offers", heading: "همه پیشنهادهای فعال" },
  { path: "/#/for-restaurants", heading: /غذای مازادِ قابل‌مصرف/ },
  { path: "/#/privacy", heading: "سیاست حریم خصوصی" },
  { path: "/#/terms", heading: "شرایط استفاده از سهمینو" },
  { path: "/#/safety", heading: "ایمنی غذا، لغو و بازپرداخت" },
  { path: "/#/merchant-terms", heading: "شرایط همکاری فروشندگان" },
  { path: "/#/cookies", heading: "سیاست کوکی‌ها و ذخیره‌سازی" },
] as const;

const viewports = [
  { width: 320, height: 740 },
  { width: 360, height: 800 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 414, height: 896 },
  { width: 430, height: 932 },
  { width: 540, height: 720 },
  { width: 600, height: 800 },
  { width: 700, height: 900 },
  { width: 768, height: 1024 },
  { width: 820, height: 1180 },
  { width: 980, height: 800 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

test("Sahmino public pages stay legible and overflow-free across the viewport matrix", async ({ page }) => {
  test.setTimeout(180_000);
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

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      await page.goto(route.path);
      await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
      await expect(page.locator(".brand-mark").first()).toBeVisible();

      const layout = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
        header: document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0,
        logo: document.querySelector(".brand-mark")?.getBoundingClientRect().width ?? 0,
      }));

      expect(
        layout.document,
        `Document overflow at ${viewport.width}x${viewport.height} on ${route.path}: ${JSON.stringify(layout)}`,
      ).toBeLessThanOrEqual(layout.viewport + 1);
      expect(
        layout.body,
        `Body overflow at ${viewport.width}x${viewport.height} on ${route.path}: ${JSON.stringify(layout)}`,
      ).toBeLessThanOrEqual(layout.viewport + 1);
      expect(layout.header, `Header collapsed at ${viewport.width}px on ${route.path}`).toBeGreaterThan(40);
      expect(layout.logo, `Brand mark too small at ${viewport.width}px on ${route.path}`).toBeGreaterThanOrEqual(30);
    }
  }

  expect(pageErrors, `Unexpected browser errors: ${pageErrors.join(" | ")}`).toEqual([]);
});

test("brand fonts load and key brand colour pairs meet WCAG AA text contrast", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/offers") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    await route.fulfill({ status: 401, contentType: "application/json", body: "{}" });
  });

  await page.goto("/");
  const result = await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('16px "Vazirmatn"', "سهمینو"),
      document.fonts.load('16px "Inter"', "SAHMINO"),
    ]);
    await document.fonts.ready;

    const root = getComputedStyle(document.documentElement);
    const css = (name: string) => root.getPropertyValue(name).trim();
    const parse = (value: string) => {
      const match = value.match(/^#([0-9a-f]{6})$/i);
      if (!match) throw new Error(`Expected a six-digit hex token: ${value}`);
      const hex = match[1];
      return [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
    };
    const luminance = (value: string) => {
      const rgb = parse(value).map((channel) =>
        channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
      );
      return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    };
    const contrast = (foreground: string, background: string) => {
      const a = luminance(foreground);
      const b = luminance(background);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    };

    const cream = css("--brand-cream");
    const forest = css("--brand-forest");
    const orange = css("--brand-orange");
    const pairs = [
      ["forest on cream", forest, cream],
      ["charcoal on cream", css("--brand-charcoal"), cream],
      ["secondary on cream", css("--brand-secondary"), cream],
      ["sage ink on cream", css("--brand-sage-ink"), cream],
      ["white on forest", "#FFFFFF", forest],
      ["charcoal on orange", css("--brand-charcoal"), orange],
      ["warm highlight on forest", "#F7D29D", forest],
    ] as const;

    const heading = document.querySelector(".hero-copy-block h1");
    const eyebrow = document.querySelector(".category-section .eyebrow");
    return {
      fonts: {
        vazirmatn: document.fonts.check('16px "Vazirmatn"', "سهمینو"),
        inter: document.fonts.check('16px "Inter"', "SAHMINO"),
      },
      tokens: {
        forest,
        cream,
        orange,
        charcoal: css("--brand-charcoal"),
      },
      ratios: pairs.map(([name, fg, bg]) => ({ name, ratio: Number(contrast(fg, bg).toFixed(2)) })),
      headingFont: heading ? getComputedStyle(heading).fontFamily : "",
      eyebrowColor: eyebrow ? getComputedStyle(eyebrow).color : "",
    };
  });

  expect(result.fonts.vazirmatn).toBe(true);
  expect(result.fonts.inter).toBe(true);
  expect(result.headingFont).toContain("Vazirmatn");
  for (const pair of result.ratios) {
    expect(pair.ratio, `${pair.name} contrast ratio was ${pair.ratio}:1`).toBeGreaterThanOrEqual(4.5);
  }
});
