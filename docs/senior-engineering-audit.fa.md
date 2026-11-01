# گزارش ممیزی مهندسی ارشد سهمینو

**تاریخ ممیزی:** ۳۱ اکتبر ۲۰۲۶  
**مخزن:** sinanaghdi/nejat-e-ghaza  
**شاخهٔ کاری:** audit/senior-engineering-hardening  
**PR:** [#30 — Senior engineering audit](https://github.com/sinanaghdi/nejat-e-ghaza/pull/30)  
**وضعیت:** گزارش مرحلهٔ اول ممیزی؛ این سند تأییدیهٔ Production نیست.

---

## ۱. خلاصهٔ اجرایی

ممیزی از روی ساختار مخزن، مسیرهای اصلی API، سرویس‌های سفارش/پرداخت/OTP، مدل‌ها و Migrationهای دیتابیس، لایهٔ احراز هویت و CSRF، Rate Limiter، Nginx/Docker، فرانت‌اند و تست‌ها آغاز شد.

تمرکز اصلاحات انجام‌شده روی صحت موجودی، ورودی‌های نامعتبر، Rate Limit، Audit Trail، اعتبارسنجی پیکربندی، ایمنی لاگ و جلوگیری از نمایش نتیجهٔ قدیمی در جست‌وجوی فرانت‌اند بوده است.

**نتیجهٔ مهم:** کد و CI برای چند سناریوی بحرانی بهتر شده‌اند، اما اطلاعات در دسترس برای تأیید سرویس واقعی کافی نیست. پیامک و پرداخت زنده، استقرار Production، بازیابی Backup، قراردادهای عملیاتی غذا و بازپرداخت و بارگذاری زیر فشار واقعی در این ممیزی اجرا نشده‌اند.

## ۲. معماری مشاهده‌شده

### فناوری‌ها و اجزا

| بخش | فناوری/مسئولیت مشاهده‌شده |
|---|---|
| Frontend | React 18، TypeScript، Vite، React Router، Playwright |
| Backend | Python 3.12، FastAPI، Pydantic v2 |
| Persistence | SQLAlchemy، PostgreSQL، Alembic |
| Rate limit / broker | Redis |
| Background jobs | Celery worker و Beat |
| Edge | Nginx reverse proxy |
| Deployment | Docker و Docker Compose |
| CI | GitHub Actions، pytest، Playwright، npm audit، Docker build |

### مسیر دامنه‌ای

- مشتری، فروشنده و مدیر از React/TypeScript به Nginx و سپس FastAPI متصل می‌شوند.
- FastAPI با PostgreSQL، Redis، Provider پیامک و Provider پرداخت تعامل دارد.
- Celery worker/beat پردازش‌های زمان‌بندی‌شدهٔ سفارش را اجرا می‌کنند.
- رخدادهای دامنه‌ای و اعلان‌ها در دیتابیس ثبت می‌شوند.
- سفارش، پرداخت و دفتر تسویه به‌صورت جداول مجزا نگهداری می‌شوند.

### نقش‌ها و جریان اصلی محصول

- مشتری پیشنهاد تأییدشدهٔ فروشندهٔ تأییدشده را می‌بیند، موجودی را رزرو می‌کند، پرداخت را آغاز می‌کند و برای دریافت حضوری مراجعه می‌کند.
- فروشنده پروفایل، پیشنهادها، موجودی، سفارش و کد تحویل را مدیریت می‌کند.
- مدیر فروشندگان و پیشنهادها را بررسی می‌کند، سفارش‌ها را پایش می‌کند و مرجع تسویه/بازپرداخت ثبت‌شده را پیگیری می‌کند.
- موجودی در زمان ایجاد سفارش داخل تراکنش و با قفل ردیف پیشنهاد کاهش می‌یابد.
- تأیید پرداخت از سمت Provider انجام می‌شود؛ برگشت مرورگر به‌تنهایی پرداخت را معتبر نمی‌کند.
- دفتر تسویه، مبلغ و ماندهٔ محاسباتی را ثبت می‌کند؛ انتقال بانکی خودکار در این کد اثبات نشده است.

## ۳. مشکلات کشف‌شده و اصلاحات

| اولویت | یافته | اصلاح انجام‌شده | وضعیت |
|---|---|---|---|
| P1 | محاسبهٔ موجودی در ویرایش پیشنهاد بدون قفل ردیف می‌توانست با رزرو هم‌زمان تداخل کند | قفل SELECT FOR UPDATE در ویرایش/غیرفعال‌سازی پیشنهاد و تراکنش با rollback | پیاده‌سازی و تست PostgreSQL اضافه شده |
| P1 | PATCH با null صریح برای فیلد غیرقابل‌تهی می‌توانست به خطای دیتابیس/۵۰۰ ختم شود | رد null برای فیلدهای non-nullable؛ حفظ امکان null برای description و image_url | تست Schema اضافه شده |
| P1 | عملیات تغییر پیشنهاد فاقد Audit Event مناسب بود | ثبت رویداد ایجاد، ویرایش و غیرفعال‌سازی همراه actor، request ID و فیلدهای تغییرکرده | تست Audit Event اضافه شده |
| P1 | Redis INCR و EXPIRE دو عملیات جدا بودند؛ توقف فرایند بین آن‌ها می‌توانست شمارندهٔ بدون TTL بسازد | اجرای افزایش شمارنده و تنظیم TTL با یک Lua Script اتمیک | تست Fake Redis و سیاست خطا اضافه شده |
| P1 | اعتبارسنجی Webhook Secret از مقایسهٔ رشته‌ای مستقیم استفاده می‌کرد | استفاده از hmac.compare_digest | تست Secret نامعتبر اضافه شده |
| P1 | الگوریتم JWT و چند timeout/rate-limit حساس در زمان راه‌اندازی به‌طور کامل validate نمی‌شدند | allow-list الگوریتم HS256/384/512 و مثبت‌بودن token/OTP/order/rate-limit/HTTP timeoutها | تست config اضافه شده |
| P1 | محدودیت ۷۲ بایت bcrypt با محدودیت طول کاراکتری Schema هم‌راستا نبود؛ رمز چندبایتی می‌توانست از Schema عبور کند | اعتبارسنجی طول UTF-8 در Register/Login | تست رمز فارسی بیش از حد اضافه شده |
| P2 | ORM metadata همهٔ CHECK constraintهای تعریف‌شده در Migration اولیه را منعکس نمی‌کرد | همگام‌سازی Constraintهای موجود Offer و OrderItem در ORM؛ Migration جدید یا Constraint جدید ساخته نشد | تست قرارداد Schema اضافه شده |
| P2 | پاسخ قدیمی جست‌وجو می‌توانست بعد از پاسخ جدیدتر روی UI بنشیند؛ خطای بارگذاری جزئیات هم در یک مسیر fire-and-forget دوباره throw می‌شد | کنترل نسخهٔ درخواست و نگهداری خطا در state خود Hook؛ Promise ردشدهٔ بدون مصرف حذف شد | تست E2E پاسخ‌های out-of-order اضافه شده |
| P2 | X-Request-ID ورودی بدون محدودیت طول/کاراکتر در log و audit context پذیرفته می‌شد | پذیرش فقط حروف/اعداد و . _ : - در محدودهٔ ۱ تا ۶۴ کاراکتر؛ در غیر این صورت تولید UUID | تست ورودی معتبر و نامعتبر اضافه شده |
| P2 | ایجاد/ویرایش پروفایل فروشنده Audit Trail نداشت و create race می‌توانست IntegrityError خام بدهد | قفل ویرایش، ثبت رویدادهای ساخت/ویرایش و تبدیل رقابت ساخت پروفایل به 409 | تست ایجاد و ویرایش پروفایل اضافه شده |
| P1 | Nginx مقدار X-Forwarded-For ورودی را append می‌کرد و Uvicorn همهٔ Forwarded senderها را trusted می‌دانست | بازنویسی X-Forwarded-For با IP اتصال در Nginx edge | تست پیکربندی اضافه شده |
| P1 | لاگ دسترسی پیش‌فرض می‌توانست URL کامل callback و query string حامل Authority را ثبت کند | access log سفارشی بدون URL/path/query؛ خاموش‌کردن access log خام Uvicorn در Docker/Compose | تست پیکربندی اضافه شده؛ CI revision ادغام‌شده موفق |
| P1 | API فهرست سفارش فروشنده، فهرست مدیر و پاسخ تأیید تحویل کد دریافت مشتری را نیز برمی‌گرداند؛ پنل فروشنده هم کد را نشان می‌داد | تفکیک `OrderResponse` مشتری از `OrderOperationalResponse`؛ حذف pickup_code از endpointهای فروشنده/مدیر/تأیید تحویل و حذف نمایش آن در پنل فروشنده | در PR #34 ادغام شد؛ ۱۳۷ تست بک‌اند موفق |

**توضیح:** سطح اولویت، ارزیابی مهندسی بر اساس اثر بالقوه است؛ به معنی اثبات وقوع سوءاستفاده یا رخداد امنیتی در Production نیست.

## ۴. وضعیت امنیت و عملیات حساس

### مواردی که از کد و تست‌ها مشاهده/بررسی شده‌اند

- احراز هویت cookie و Bearer در Backend انجام می‌شود.
- برای درخواست‌های تغییردهنده با session cookie، CSRF بررسی می‌شود؛ Webhook و مسیرهای ورود/OTP استثناهای مشخص دارند.
- نقش‌ها و مالکیت سفارش/پیشنهاد در سرویس‌های Backend بررسی می‌شوند.
- سفارش و رزرو موجودی transaction و row locking دارند.
- Payment verification ترتیب قفل Order سپس Payment را رعایت می‌کند؛ expiry worker نیز همین ترتیب را دنبال می‌کند.
- callback پرداخت تکراری در سناریوهای موجود idempotent است و برای سفارش بسته‌شده وضعیت REFUND_REQUIRED ایجاد می‌شود.
- Rate limiter در Production هنگام اختلال Redis fail-closed است؛ در Development برای ادامهٔ کار fail-open باقی می‌ماند.
- access log خام Uvicorn برای Production خاموش شده است و log Nginx نباید URL/query string را ثبت کند.

### ریسک‌های باقی‌مانده

1. **Provider configuration rotation:** Payment فقط نام Provider ذخیره‌شده را با Provider انتخاب‌شدهٔ فعلی مقایسه می‌کند. تغییر نام Provider باعث رد verify پرداخت‌های معلق قبلی می‌شود؛ تغییر Merchant Account با همان نام Provider نیز نیازمند مدیریت credential تاریخی و runbook است. پیش از rotation باید تمام authorityهای معلق reconcile شوند یا پشتیبانی چندپیکربندی تاریخی پیاده‌سازی شود.
2. **Session revocation:** JWT stateless است؛ logout کوکی کاربر را پاک می‌کند اما توکن سرقت‌شده تا انقضا قابل ابطال مرکزی نیست. عمر پیش‌فرض محدود است، ولی registry/revocation برای قطع فوری نشست پیاده‌سازی نشده است.
3. **Webhook contract:** در endpoint عمومی موجود، shared secret بررسی می‌شود و سپس Provider verification انجام می‌گیرد. امضای بومی، timestamp/replay protocol مخصوص Provider و آزمون با حساب واقعی هنوز تأیید نشده‌اند.
4. **Merchant payout:** دفتر تسویه محاسبات را نگهداری می‌کند؛ انتقال واقعی/تقسیم خودکار وجه در این مخزن اثبات نشده است.
5. **OTP issuance race:** محدودیت Redis و بررسی ۶۰ ثانیه‌ای موجود است؛ هم‌زمانی دو درخواست OTP برای یک شماره در تراکنش‌های جداگانه هنوز با آزمون رقابتی PostgreSQL بررسی نشده است.
6. **Bootstrap admin و بازیابی حساب:** روند عملیاتی کاملِ امن برای ساخت مدیر اولیه، بازیابی حساب و ابطال نشست باید پیش از Production با owner و شواهد تأیید شود.

## ۵. دیتابیس و Performance

### اصلاحات و کنترل‌ها

- قفل پیشنهاد هنگام ویرایش با قفل استفاده‌شده در رزرو موجودی هم‌راستا شد.
- CHECK constraintهای موجود در Migration اولیه به ORM metadata افزوده شدند تا تست‌هایی که از Base.metadata.create_all استفاده می‌کنند بخشی از قواعد Schema را جا نیندازند.
- تست رقابت ویرایش پیشنهاد و رزرو موجودی با PostgreSQL مستقل اضافه شده است.
- Migrationها در CI روی PostgreSQL 16 اجرا می‌شوند.

### موارد اندازه‌گیری‌نشده

در این محیط دسترسی به Production DB، حجم واقعی داده، Query Plan واقعی و بار شبکه/کاربر فراهم نبود. بنابراین موارد زیر **اندازه‌گیری نشده‌اند**:

- API p50/p95/p99 latency
- Query duration و EXPLAIN ANALYZE روی دادهٔ واقعی
- تعداد query در هر endpoint و N+1 تحت دادهٔ واقعی
- throughput و concurrent user capacity
- CPU/RAM در بار واقعی
- bundle/page load در محیط و شبکهٔ کاربران هدف
- نرخ خطای Provider، SMS و reconciliation عملیاتی

### ریسک‌های Performance/Scale برای فاز بعد

- فهرست سفارش‌های مشتری و فروشنده در repository فعلی pagination صریح ندارد؛ با رشد داده، تعداد رکورد و حجم پاسخ می‌تواند افزایش یابد.
- برخی لیست‌های admin/merchant باید از نظر سقف و pagination سراسری بازبینی شوند.
- جست‌وجوی ILIKE %term% و مرتب‌سازی بر expression تخفیف/فاصله بدون Query Plan واقعی نباید بهینه‌سازی حدسی شود.
- وابستگی‌های Python عمدتاً version range یا بدون pin هستند و Frontend workflow از npm install استفاده می‌کند؛ lockfile/constraints و نصب reproducible باید در یک PR مستقل تکمیل شود.


### ریسک چرخهٔ آغاز پرداخت

در مسیر ایجاد درخواست پرداخت، Order در تراکنش قفل می‌شود و درخواست شبکه‌ای به Provider قبل از پایان تراکنش/آزادشدن lock اجرا می‌شود. Timeout فعلی درخواست خارجی را محدود می‌کند، اما latency یا اختلال Provider می‌تواند قفل ردیف و connection دیتابیس را در مدت تماس خارجی نگه دارد. تبدیل این مسیر به state machine دو مرحله‌ای به idempotency key، وضعیت PaymentIntent، رفتار retry و reconcile authorityهای ساخته‌شده پیش از commit نیاز دارد؛ بدون طراحی lifecycle و قرارداد Provider، این بخش عمداً بازنویسی نشده و به‌عنوان ریسک P1/P2 باقی می‌ماند.

## ۶. DevOps، Logging و Release

- Compose فقط Nginx را host-publish می‌کند؛ API با expose در شبکهٔ Compose در دسترس است و PostgreSQL/Redis host port ندارند.
- API قبل از شروع Uvicorn، Alembic migration را اجرا می‌کند.
- Nginx headerهای امنیتی پایه، CSP و محدودیت body size دارد؛ این فایل خودبه‌خود TLS یا گواهی Production فراهم نمی‌کند.
- X-Forwarded-For در Nginx به IP اتصال بازنویسی می‌شود. اگر سرویس پشت Load Balancer/CDN دیگری قرار گیرد، باید فقط CIDRهای رسمی آن upstream به‌صورت صریح در Nginx real-IP trust config تنظیم شوند؛ در غیر این صورت IP در حد edge proxy خواهد بود.
- access log Nginx دیگر URL یا query string را ثبت نمی‌کند؛ Uvicorn خام access log غیرفعال شده است. Structured request log برنامه مسیر را بدون query ثبت می‌کند.
- Backup/restore drill، rollback release، monitoring مرکزی، alerting، resource limits و TLS automation در محیط واقعی اجرا/تأیید نشده‌اند.

## ۷. شواهد تست و CI

### Baseline قبل از ممیزی

Main در آغاز ممیزی روی commit dc8a2e484e454d80029b619acad1c83303c6da1a قرار داشت و در وضعیت فعلی این گزارش روی commit `09b3886443bda495cd120c37c589a16ef3e59ea1` است. Workflowهای Build، Tests، Python، Secret scanning و Deploy آن revision در بررسی قبلی موفق بودند. این نتیجه تنها baseline همان commit است.

### وضعیت آخرین ادغام‌های ممیزی

PR #31 (commit `c1838ba42e1dbf6b4df1a969c6bf241cfd2eebf5`)، PR #32 (commit `42c2eb898765212b06ad67ad4a1fd87e5ab8c103`)، PR #33 (commit `9f2b3b9482aeced62a3e5f4f354c1c0c41fb5022`)، PR #34 (commit `0d8e3f0f603870833f3be8c68351e389d02eaab7`)، PR #35 (commit `491a57a590e7a2e31ffa138dac1d28b015efeee6`) و PR #36 (commit `f84cfda51548dc1702d764e1cb8348388813766d`) با موفقیت در main ادغام شدند. Main اکنون روی commit `09b3886443bda495cd120c37c589a16ef3e59ea1` است. PR #37 و PR #38 هر دو باز و Draft هستند؛ CI هر دو سبز است اما تا زمان ادغام، بخشی از main محسوب نمی‌شوند. شواهد CI برای head PR #32:

- Unit/Integration: **142 passed, 1 skipped**؛ شامل Migration PostgreSQL، تست‌های بک‌اند، مرزبندی pickup_code، ۶۴ بیت entropy و rate limit هر فروشنده.
- Frontend E2E: **9 passed**؛ شامل ماتریس واکنش‌گرایی، تست‌های مسیر مشتری، قوانین، پنل‌ها و رقابت پاسخ جست‌وجو.
- Redis integration: **11 passed**؛ Lua script روی Redis 7 واقعی، TTL، رفتار 429 و rate limit بر اساس subject را آزمایش کرد.
- TypeScript و production build: موفق.
- npm audit بعد از ارتقای React Router: **0 vulnerabilities**.
- Docker imageهای API و Frontend: موفق.
- Python pytest/Flake8 workflow: موفق.
- Secret scanning: موفق.
- Deploy GitHub Pages: موفق.
- Bundle فرانت‌اند در build: JavaScript برابر 368.92 KB خام / 99.55 KB gzip؛ CSS برابر 140.35 KB خام / 26.25 KB gzip. این فقط اندازهٔ bundle است، نه زمان بارگذاری واقعی.

[Tests workflow](https://github.com/sinanaghdi/nejat-e-ghaza/actions/runs/41251745276) · [Python workflow](https://github.com/sinanaghdi/nejat-e-ghaza/actions/runs/41251745250) · [Secret scan](https://github.com/sinanaghdi/nejat-e-ghaza/actions/runs/41251745209) · [Deploy](https://github.com/sinanaghdi/nejat-e-ghaza/actions/runs/41251745194)

**تاریخچهٔ شکست و اصلاح:** commit `2cb0419` در تست واحد تنظیمات Nginx یک assertion شکست‌خورده داشت؛ تست، نام متغیرهای ممنوع را در comment توضیحی هم جست‌وجو می‌کرد، نه فقط directiveهای اجرایی را. تست اصلاح شد تا commentها از directiveها جدا شوند. PR #30 و PR #31 در main ادغام شدند؛ PR #32 نیز اصلاح تراکنشی Audit برای Register/Login را با CI موفق به main رساند.

### آخرین شواهد CI برای اصلاحات بعد از main

**PR #37 — قفل‌گذاری تعلیق فروشنده و ثبت سفارش** (باز، Draft، head `506b134b9b6a248691f1cd4c6b326f084c60f74a`):
- Unit/Integration روی PostgreSQL: 143 passed, 1 skipped.
- 9 Playwright E2E، 11 Redis integration.
- TypeScript/build، npm audit (0 vulnerabilities)، Docker، Python workflow و secret scan: موفق.
- [Tests run 41252254246](https://github.com/sinanaghdi/nejat-e-ghaza/actions/runs/41252254246)

**PR #38 — یک OTP فعال برای هر شماره** (باز، Draft، head `2adc0967646e37470139bdd0c93fa5acfd2fa03b`):
- Unit/Integration روی PostgreSQL: 145 passed, 1 skipped؛ شامل تست دو session هم‌زمان OTP.
- 9 Playwright E2E، 11 Redis integration.
- TypeScript/build، npm audit (0 vulnerabilities)، Docker، Python workflow و secret scan: موفق.
- [Tests run 41252704787](https://github.com/sinanaghdi/nejat-e-ghaza/actions/runs/41252704787)

این دو PR هنوز ادغام نشده‌اند؛ بنابراین شواهدشان وضعیت main را تغییر نمی‌دهد.

### آزمون‌هایی که در این شاخه اضافه شدند

- Redis atomic counter/TTL، failure policy و محدودهٔ ورودی.
- PATCH null safety، فیلدهای nullable و event audit.
- config validation برای الگوریتم و timeoutها.
- Webhook secret نامعتبر.
- UTF-8 password length برای Register/Login.
- هم‌خوانی CHECKهای ORM و Migration.
- رقابت رزرو موجودی و ویرایش پیشنهاد روی PostgreSQL.
- out-of-order marketplace request response.
- جلوگیری از افشای pickup_code به فروشنده/مدیر و پاسخ‌های عملیاتی.
- آزمون ثبت‌نام و Login با Audit اتمیک.
- ارتقای React Router و npm audit در آستانهٔ Moderate.
- request ID ورودی و Nginx Forwarded-For sanitization.
- کنترل access logging برای جلوگیری از ثبت callback query values.
- اجرای Lua rate limiter با Redis واقعی در job مستقل CI.

## ۸. Change log شاخهٔ ممیزی

| مسیر | تغییر |
|---|---|
| app/services/offer.py | قفل ردیف، تراکنش و Audit Event برای عملیات پیشنهاد |
| app/schemas/offer.py | رد null در فیلدهای non-nullable |
| app/core/rate_limit.py | Lua atomic INCR + TTL و fail-closed در Production |
| app/api/routes/payments.py | constant-time webhook secret comparison |
| app/core/config.py | validation تنظیمات امنیتی و timeout |
| app/schemas/auth.py | محدودیت ۷۲ بایت UTF-8 برای رمز |
| app/db/models/food_offer.py | همگام‌سازی CHECKهای موجود با ORM metadata |
| app/db/models/order_item.py | همگام‌سازی CHECK موجود با ORM metadata |
| app/middleware/request_context.py | اعتبارسنجی X-Request-ID |
| app/services/merchant.py | قفل و Audit Trail برای ایجاد/ویرایش پروفایل فروشنده |
| .github/workflows/tests.yml | job مستقل Redis-backed برای تست Lua Rate Limiter |
| frontend/src/hooks/useMarketplace.ts | جلوگیری از اعمال پاسخ قدیمی و unhandled rejection |
| docker/nginx/nginx.conf | بازنویسی XFF و access log بدون URL/query |
| docker-compose.yml, Dockerfile.production | خاموش‌کردن access log خام Uvicorn |
| tests/*, frontend/e2e/* | regression tests برای تغییرات بالا |
| app/services/auth.py, app/api/routes/auth.py | اتمیک‌کردن ثبت‌نام با Audit و ثبت Audit در endpoint واقعی Login |
| app/services/order.py, app/core/rate_limit.py, app/api/routes/orders.py | کد ۶۴ بیتی و rate-limit per merchant برای تحویل |
| tests/test_auth.py | تست تعداد/مالکیت رخدادهای ثبت‌نام و Login |
| frontend/package.json | ارتقای React Router به v7.18.5؛ منتظر CI مستقل در PR بعدی |

## ۹. دروازهٔ انتشار و بدهی فنی باقی‌مانده

**ارزیابی فعلی: CONDITIONALLY READY FOR STAGING — NOT READY FOR PRODUCTION.**

قبل از Production، موارد زیر هنوز مانع یا نیازمند مدرک‌اند:

- تکمیل CI روی آخرین commit شاخه و review/merge کنترل‌شده.
- sandbox و سپس live transaction مجاز با Provider واقعی؛ تست SMS واقعی و callback reconciliation.
- تصمیم و قرارداد رسمی دربارهٔ غذا، آلرژن، نگهداری، pickup، لغو، no-show، refund و پشتیبانی.
- میزبانی واقعی HTTPS، secret manager، backup و restore drill، rollback و هشدارهای عملیاتی.
- بازبینی provider rotation و مدیریت authorityهای معلق.
- سیاست revoke/session invalidation. هم‌زمانی صدور OTP در PR #38 اصلاح و CI آن سبز شده، اما تا ادغام PR همچنان در main حل‌نشده محسوب می‌شود.
- pagination و performance baseline با dataset و بار شبیه Production.
- قفل‌کردن dependencyها و تکرارپذیری نصب.
- ارتقای React Router از v6.30.6 به v7.18.5 برای رفع دو advisory Moderate (GHSA-wrjc-x8rr-h8h6 و GHSA-337j-9hxr-rhxg)؛ ارتقا در main ادغام شد و npm audit در CI بعدی صفر آسیب‌پذیری گزارش کرد.
- تفکیک pickup_code از پاسخ‌های عملیاتی فروشنده/مدیر؛ این اصلاح در PR پیگیری بعدی است و تا ادغام و CI موفق هنوز جزو وضعیت main نیست.
- بازبینی accessibility به‌صورت کامل (keyboard، screen-reader، focus، error announcement)، نه صرفاً تست contrast.
- بازبینی حقوقی/حریم خصوصی در حوزهٔ پایلوت توسط مسئول واجد صلاحیت.

**معیار توقف:** تا وقتی پرداخت واقعی/بازپرداخت/تسویه قابل تطبیق، سیاست ایمنی/تحویل روشن، دسترسی‌ها و secrets امن و Backup قابل بازیابی نیستند، محصول نباید برای دریافت پول و سفارش عمومی Production معرفی شود.


### تفکیک کد دریافت (pickup code)

کد دریافت یک راز متعلق به سفارش مشتری است که برای تأیید تحویل باید از خود مشتری گرفته شود. ممیزی نشان داد پاسخ‌های عملیاتی سفارش از Schema مشتری استفاده می‌کردند و در نتیجه `pickup_code` در فهرست فروشنده و مدیر نیز serialize می‌شد؛ پنل فروشنده هم کد را نشان می‌داد. در اصلاح follow-up، Schema عملیاتی جدا شده و این فیلد از endpointهای فروشنده، مدیر، تغییر وضعیت و پاسخ تأیید تحویل حذف شده است. پاسخ ایجاد سفارش و جزئیات/فهرست سفارش مشتری همچنان کد را نگه می‌دارد. تست جدید هر سه مرز نقش را بررسی می‌کند.

## پیگیری امنیت OTP — محدودیت یک کد فعال برای هر شماره

### یافته
Rate Limit در API برای IP و شمارهٔ موبایل وجود دارد، اما دو درخواست هم‌زمان برای شماره‌ای که هنوز OTP فعال ندارد می‌توانستند هر دو نبودن کد قبلی را بخوانند، دو پیامک ارسال کنند و بیش از یک کد استفاده‌نشده بسازند. کد تأیید در verify فقط جدیدترین OTP فعال را می‌خواند؛ در نتیجه پیامک قدیمی ممکن بود بلافاصله بی‌اعتبار شود.

### اصلاح شاخهٔ پیگیری
- در PostgreSQL، قفل advisory تراکنشی بر اساس شمارهٔ نرمال‌شده قبل از خواندن آخرین OTP گرفته می‌شود.
- ردیف‌های OTP فعال پیشین با `SELECT FOR UPDATE` قفل و مصرف‌شده می‌شوند.
- یک partial unique index روی `phone_number WHERE consumed_at IS NULL` در PostgreSQL و SQLite، تنها یک OTP فعال را در سطح دیتابیس تضمین می‌کند.
- Migration جدید `0009_single_active_otp` قبل از ساخت index، کدهای فعال تکراری موجود را رتبه‌بندی می‌کند و همه به‌جز جدیدترین را consumed می‌کند؛ رکوردهای تاریخی حذف نمی‌شوند.
- اگر unique constraint در backendهایی که advisory lock ندارند برخورد کند، IntegrityError به پاسخ 429 تبدیل می‌شود.
- تست مستقل PostgreSQL دو session را هم‌زمان آزاد می‌کند و انتظار دارد فقط یکی موفق شود، فقط یک SMS ارسال شود و یک کد فعال باقی بماند.

**وضعیت:** این اصلاح در شاخهٔ `audit/otp-single-active` است و تا ادغام و CI موفق، جزو وضعیت main نیست.


### وضعیت PRهای باز در پایان این گزارش

- **PR #37**: سریال‌سازی تعلیق فروشنده با ثبت سفارش؛ 143 passed / 1 skipped، 9 E2E و 11 Redis tests؛ باز و Draft.
- **PR #38**: تضمین یک OTP فعال برای هر شماره؛ 145 passed / 1 skipped، 9 E2E و 11 Redis tests؛ باز و Draft.
- **Main**: `09b3886443bda495cd120c37c589a16ef3e59ea1`. هیچ‌یک از دو تغییر بالا هنوز در main نیستند.
