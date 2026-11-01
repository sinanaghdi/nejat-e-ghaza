/**
 * Food imagery supplied with the Google Stitch Sahmino design export.
 * These are illustrative fallback photos only; merchant-uploaded offer.image_url
 * always takes precedence.
 */
export const STITCH_FOOD_IMAGES = {
  bread: "https://lh3.googleusercontent.com/aida-public/AB6AXuDrktWrkt9uxMBXor70yIezB2_a_IBarXRKEf0L8XS0VtOqzJpq_0q46D3Tll_CgZSS-hNAtAoz3j_8HPUTmaUSX-1ajQPLCRIkYliG6DvP5HWGZOI-TpGxfLuHOgCaddVQLt9FBJTTIVI4LYiQ9lbP7TNZxIOVtAXIBmYAaBUEZpQSkzZF0xTv9ytj8vDzkyY6tGCE0hA5jHSr8V3iLbPkJq_8jUWmFLZ2hIC1umk",
  pastry: "https://lh3.googleusercontent.com/aida-public/AB6AXuA9ZgqJ_AcC4h6no-oafQXza6lhr1b_Et5McpNg3-fyc8oetwoKJhIlebCSWcBSC76BHI0vO_Zt9qs4rbur-Drq6zuYKHXvQO91dM7IpA3xNmMpF2ADIlPDMz6UyrhImNNGaMNpOR2O40ooi5LX96c4jfQGkugMqRvsXA8SG-SrEg7h60jA5gG56sQMUiAT1yPuNByiCygv0-uthTCqSz-ex-I96E_NOsXL7bGSNc",
  meal: "https://lh3.googleusercontent.com/aida-public/AB6AXuCXoO9r78cqtVZn12lKKe6VkVucJHi_BfbO3HKbbNjZtnrRRCffMD0qHVRTW2yNukxS64EAmz-czEDn0C_3xtzVhxAAHZsstojXB_g9GGXgQiUhooU1rjWD7-SrZxX8thBMhJiqUTvrNb8Mkp6ztE1rM89WM6dRAlL8YRHJ44y2YSr14-rsgkkL193bpgd71Ye9FzG4uBKsd9EPdsT58eAhxP6Xp6DbqOoOQr_YFzc",
  box: "https://lh3.googleusercontent.com/aida-public/AB6AXuAZ11fAdSFwHpecMCnimHqbHfH-xlk2099YqweeX_RfJCRlhMNJW8sLE4l8u5TPKoXhwL98WevkFgjPmgSZJe6V2BuDqqk1dmi6ALliNEzwDbHr9MIiX65jmBY9kwVCWgpu1HTrfxRuMYPrYk-idJSpFIhQF6Go3lxXYmtP9KwLfd85CHUyw5oCsYAdbpEa2Vke1PfXZi_3QPaTaxnl3Zqca3dMquEQfG8g8-KGDME",
} as const;

export function getStitchFoodImage(title: string, description = ""): string {
  const value = `${title} ${description}`.toLocaleLowerCase("fa-IR");
  if (/نان|سنگک|باگت|کروسان|بیکری/.test(value)) return STITCH_FOOD_IMAGES.bread;
  if (/شیرین|کیک|دسر|کوکی|قنادی|تارت/.test(value)) return STITCH_FOOD_IMAGES.pastry;
  if (/غذا|شام|ناهار|سالاد|رستوران|پیتزا|ساندویچ/.test(value)) return STITCH_FOOD_IMAGES.meal;
  return STITCH_FOOD_IMAGES.box;
}
