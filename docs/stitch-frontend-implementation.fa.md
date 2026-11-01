# پیاده‌سازی فرانت‌اند سهمینو بر اساس Google Stitch

**مخزن:** `sinanaghdi/nejat-e-ghaza`  
**شاخه:** `design/stitch-sahmino-frontend`  
**مرجع طراحی:** فایل خروجی Google Stitch ارائه‌شده در گفتگو  
**دامنه:** بازطراحی رابط کاربری React/TypeScript، بدون تغییر قراردادهای API بک‌اند

---

## ۱. هدف و رویکرد

طراحی Stitch به یک رابط واقعی و متصل به API تبدیل شده است؛ نه صرفاً تبدیل HTMLهای خروجی به صفحه‌های ایستا. ساختار Routeها و Hookهای موجود حفظ شده‌اند و اجزای جدید از داده‌های همان سرویس استفاده می‌کنند.

قواعد مهم اجرا:
- متن فارسی RTL و فونت Vazirmatn؛ متون لاتین Inter.
- رنگ‌ها و اجزای طراحی از توکن‌های مشترک Stitch استفاده می‌کنند.
- تجربهٔ موبایل اولویت دارد و صفحه‌ها برای 320 تا 1440 پیکسل طراحی شده‌اند.
- قیمت، موجودی، زمان تحویل، سفارش، هویت کاربر و وضعیت تسویه از API/State واقعی می‌آیند.
- عکس‌های Stitch صرفاً fallback تصویری‌اند؛ عکس ثبت‌شده توسط فروشنده اولویت دارد.
- هیچ وضعیت مالی، رتبه، امتیاز، CO₂، کد تخفیف، ارسال یا دادهٔ سلامت بدون منبع واقعی ساخته نمی‌شود.

## ۲. نگاشت طراحی به صفحه‌های محصول

| بخش طراحی Stitch | صفحه/کامپوننت در محصول | رفتار واقعی |
|---|---|---|
| Splash / Brand | Header، SahminoMark، SiteFooter | نشان و نام سهمینو، شعار و معرفی پایلوت |
| Home / Hero | `HomePage.tsx` | پیشنهادهای شاخص از Marketplace API، شهرهای پایلوت، دسته‌بندی جست‌وجو و مسیر استفاده |
| Package cards | `OfferCard.tsx` | تصویر، فروشنده، قیمت، تخفیف محاسبه‌شده، موجودی و بازه دریافت |
| Market / Search | `OffersPage.tsx` | جست‌وجو، فیلتر شهر، مرتب‌سازی، نزدیک من، Loading/Error/Empty |
| Package detail | `OfferDetailPage.tsx` | جزئیات فروشنده، قیمت، موجودی، زمان دریافت، انتخاب تعداد و افزودن به سبد |
| Cart | `CartPage.tsx`، `CartDrawer.tsx` | تغییر تعداد و حذف اقلام؛ محدودیت یک فروشنده در هر سفارش |
| Checkout | `CheckoutPage.tsx` | خلاصه سفارش، محل دریافت حضوری و درگاه فعال پیکربندی‌شده |
| OTP / Auth | `AuthPage.tsx`، `useAuth.ts` | ورود با OTP شش‌رقمی یا ایمیل/رمز؛ ثبت‌نام فعلی با ایمیل/رمز |
| Pickup pass | `OrdersPage.tsx`، `OrderDetailPage.tsx` | کد دریافت مشتری، وضعیت سفارش، مبلغ و زمان ثبت؛ QR دوربین‌محور فعال نیست |
| Eco club | `EcoClubPage.tsx` | سفارش تحویل‌شده، تعداد بستهٔ تحویل‌شده و مبلغ سفارش‌های پرداخت‌شده از API |
| Customer dashboard | `CustomerDashboardPage.tsx` | خلاصهٔ حساب و آخرین سفارش‌ها از API |
| Profile | `ProfilePage.tsx` | نمایش فیلدهای برگشتی از `/api/auth/me` |
| Merchant home | `MerchantPage.tsx`، `MerchantDashboard.tsx` | وضعیت فروشگاه، آمار عملیات، بسته‌ها، سفارش‌ها، تحویل و دفتر تسویه |
| Merchant create/edit | `MerchantProfileForm.tsx`، `OfferForm.tsx` | فرم‌های موجود و اتصال به Hook/API فروشنده |
| Manual pickup | `MerchantDashboard.tsx`، `useMerchant.ts` | ورود کنترل‌شدهٔ کدی که مشتری اعلام می‌کند و فراخوانی Verify API |
| Admin | `AdminPage.tsx` | فضای فعلی مدیریت با استایل هم‌خوان با سیستم Stitch |
| Notifications | `NotificationsPage.tsx` | اعلان‌های API، خواندن تکی و گروهی |
| Merchant onboarding | `MerchantIntroPage.tsx` | شرح شرایط همکاری، مدل تحویل و FAQ |
| Legal and safety | `LegalPage.tsx` | صفحات حقوقی، ایمنی غذا، حریم خصوصی و شرایط همکاری |

Route جدید `/club` برای باشگاه اضافه شده است.

## ۳. سیستم بصری و توکن‌ها

توکن‌های اصلی در `frontend/src/stitch.css` تعریف شده‌اند:

| نقش | مقدار |
|---|---|
| Pine / Forest deep | `#183B2A` |
| Forest green | `#31583B` |
| Leaf / Sage | `#66845E` |
| Soft sage | `#DDE9D8` |
| Mint surface | `#EEF5EA` |
| Warm cream | `#FAF7EE` |
| Oat | `#F2EBDD` |
| Warm orange | `#E9A44B` |
| Ink | `#202B22` |
| Muted | `#6E786E` |
| Border | `#E4E0D4` |

فونت فارسی `Vazirmatn` و فونت لاتین `Inter` از `typography.css` موجود استفاده می‌کنند. CSS جدید بعد از `brand.css` بارگذاری می‌شود تا در صفحات جدید مرجع نهایی استایل باشد. یک لایهٔ compatibility نیز صفحات قدیمی‌تر مانند پنل مدیریت، قوانین و پنل معرفی فروشنده را در پوستهٔ مشترک قرار می‌دهد.

## ۴. مرز قابلیت‌های واقعی و موارد خارج از API

این موارد در بعضی طرح‌های Stitch دیده می‌شوند، اما در API موجودِ مخزن قرارداد عملیاتی ندارند؛ بنابراین به‌عنوان قابلیت فعال نمایش داده نشده‌اند:

| قابلیت طراحی | وضعیت فعلی |
|---|---|
| QR camera scanner | پیاده‌سازی نشده؛ فروشنده کد را دستی وارد می‌کند |
| QR generator برای مشتری | پیاده‌سازی نشده؛ کد دریافت متنی از API نمایش داده می‌شود |
| Wallet / stored balance | API کیف پول موجود نیست |
| Coupon / promo code | API اعتبارسنجی کوپن موجود نیست |
| Courier / delivery tracking | مدل فعلی تحویل حضوری است |
| CO₂ saved / impact score | سرویس محاسبه و دادهٔ معتبر محیط‌زیستی موجود نیست |
| Green coins / loyalty points | API وفاداری و امتیاز موجود نیست |
| Customer ratings / reviews | API امتیازدهی موجود نیست |
| Customer profile editor / preferences | API ویرایش این فیلدها در حساب فعلی موجود نیست |
| Automatic merchant payout | دفتر تسویه و ثبت مرجع پرداخت وجود دارد؛ انتقال بانکی خودکار وجود ندارد |

### قواعد حساس مرتبط با تحویل
- کد دریافت فقط در نمای سفارش مشتری وجود دارد.
- API فروشنده و مدیر نباید `pickup_code` را serialize کند.
- پنل فروشنده کد را نمایش نمی‌دهد و فقط کدی را که مشتری اعلام می‌کند می‌پذیرد.
- کدهای جدید ۱۶ نویسهٔ hex هستند؛ کدهای قدیمی همچنان از طریق API قابل پذیرش‌اند.
- Rate limit تأیید تحویل به شناسهٔ فروشنده وابسته است.
- وضعیت `COMPLETED` فقط بعد از تأیید موفق بک‌اند به UI بازمی‌گردد.

### قواعد حساس مرتبط با پرداخت
- فقط درگاه پیکربندی‌شدهٔ سرور استفاده می‌شود.
- درگاه آزمایشی به معنی پرداخت موفق نیست؛ UI سفارش را `PAID` اعلام نمی‌کند.
- انتقال خودکار وجه یا بازپرداخت از ظاهر رابط نتیجه‌گیری نمی‌شود.
- Checkout در این نسخه برای بسته‌های یک فروشنده طراحی شده است.
- هر بسته بازهٔ دریافت خودش را دارد؛ زمان‌های متفاوت به یک بازهٔ مشترک ساختگی تبدیل نمی‌شوند.

## ۵. تصاویر نمونه

`frontend/src/lib/stitchAssets.ts` تصاویر ارائه‌شده در خروجی Stitch را به‌عنوان تصویر نمونه نگه می‌دارد. این تصاویر صرفاً برای نمایش fallback هستند:
- تصویر ثبت‌شدهٔ `image_url` فروشنده در اولویت است.
- اگر تصویر فروشنده در دسترس نباشد، fallback متناسب با عنوان و توضیحات انتخاب می‌شود.
- متن جایگزین تصویر مشخص می‌کند تصویر نمونه است، نه تصویر واقعی همان محصول.
- خطای بارگذاری تصویر با `SafeImage` مدیریت می‌شود.

## ۶. دسترس‌پذیری و واکنش‌گرایی

- RTL واقعی در HTML حفظ شده است.
- focus-visible با ring نارنجی و offset مشخص شده است.
- وضعیت‌های Loading/Error/Empty از هم تفکیک شده‌اند.
- فرم‌ها label و نام قابل‌دسترسی دارند.
- کد دریافت جهت LTR و اعداد ثابت دارد.
- نوار ناوبری موبایل با safe-area پایین صفحه تنظیم شده است.
- `prefers-reduced-motion` پشتیبانی می‌شود.
- Layout برای عرض‌های 320، 360، 390، 540، 768، 820، 1024، 1280 و 1440 پیکسل بررسی می‌شود.
- تصاویر با `object-fit: cover` و fallback کنترل می‌شوند.

## ۷. فایل‌های کلیدی تغییرکرده

- `frontend/src/stitch.css` — Design system، layout، components و responsive rules
- `frontend/src/lib/stitchAssets.ts` — تصویرهای fallback
- `frontend/src/pages/HomePage.tsx` و `OffersPage.tsx` — بازار عمومی
- `frontend/src/components/OfferCard.tsx` — کارت پیشنهاد
- `frontend/src/pages/OfferDetailPage.tsx` — جزئیات و رزرو
- `frontend/src/pages/CartPage.tsx` و `CheckoutPage.tsx` — سبد و checkout
- `frontend/src/pages/AuthPage.tsx` — احراز هویت و OTP
- `frontend/src/pages/OrdersPage.tsx` و `OrderDetailPage.tsx` — سفارش و pickup pass
- `frontend/src/pages/EcoClubPage.tsx` — باشگاه
- `frontend/src/pages/CustomerDashboardPage.tsx` و `ProfilePage.tsx` — حساب مشتری
- `frontend/src/pages/MerchantPage.tsx` و `components/merchant/MerchantDashboard.tsx` — پنل فروشنده
- `frontend/src/components/Header.tsx` و `MobileBottomNav.tsx` — ناوبری
- `frontend/src/App.tsx` و `AppRouter.tsx` — اتصال Routeها
- `frontend/e2e/*.spec.ts` — تطبیق تست‌های مرورگر با رابط جدید

## ۸. اعتبارسنجی مورد انتظار در CI

PR باید این موارد را روی head خودش پاس کند:
1. Python unit/integration و Migration روی PostgreSQL.
2. TypeScript typecheck.
3. Vite production build.
4. Playwright E2E مشتری، واکنش‌گرایی عمومی، پاسخ‌های خارج از ترتیب جست‌وجو و پنل فروشنده.
5. Docker build برای API و Frontend.
6. Redis integration و Secret scanning.
7. npm audit.

گزارش این سند شرح پیاده‌سازی است؛ نتیجهٔ تست فقط از Checkهای GitHub همان commit قابل اعلام است.

## ۹. موارد باقیمانده برای توسعهٔ محصول

برای نزدیک‌شدن کامل‌تر به همهٔ ماکاپ‌ها، این کارها به قرارداد API/تصمیم محصول نیاز دارند:
- کیف پول، کوپن، باشگاه امتیاز و محاسبهٔ اثر محیط‌زیستی.
- تولید/اسکن QR و دوربین با مجوز کاربر.
- ویرایش پروفایل مشتری و نشانی‌های ذخیره‌شده.
- پرداخت/بازپرداخت و تسویهٔ خودکار با Provider/بانک.
- امتیازدهی، نظر، گزارش تجربه و نوتیفیکیشن‌های real-time.
- pagination فهرست‌های بزرگ و گزارش performance واقعی.
- پشتیبانی از چند فروشنده در سبد، اگر این قاعدهٔ محصول تغییر کند.

**وضعیت انتشار:** این شاخه بازطراحی UI را ارائه می‌کند؛ به‌تنهایی مجوز فعال‌سازی پرداخت و سفارش عمومی Production نیست. آماده‌بودن عملیاتی پایلوت باید از روی تنظیمات Provider، پیامک، HTTPS، backup/restore و سیاست‌های ایمنی/بازپرداخت جداگانه تأیید شود.
