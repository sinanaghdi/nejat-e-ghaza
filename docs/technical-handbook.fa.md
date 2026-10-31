# هندبوک فنی سهمینو
نسخه: ۲۷ اکتبر ۲۰۲۶

این راهنما براساس README، DEVELOPMENT، SECURITY، نقشه راه تولید، چک‌لیست پایلوت و runbook مخزن تهیه شده است. وضعیت MVP و آمادگی تولید دو موضوع متفاوت‌اند.

## ۱. محصول و مرز دامنه
سهمینو یک بازارگاه فارسی‌محور برای فروش غذای مازاد قابل‌مصرف با تخفیف است. فروشنده تأییدشده پیشنهاد، تعداد، قیمت و بازه تحویل را منتشر می‌کند؛ مشتری سفارش می‌سازد، پرداخت می‌کند و حضوری تحویل می‌گیرد. پروژه MVP/نمونه‌کار است، نه POS یا CRM کامل.

دموی GitHub Pages از داده‌های seed و حالت نمایشی استفاده می‌کند؛ پرداخت، پیامک یا سفارش واقعی انجام نمی‌دهد. اطلاعات حساس واقعی در دمو وارد نکنید.

## ۲. معماری
React + TypeScript + Vite در رابط RTL به FastAPI درخواست می‌فرستد. Routeها اعتبارسنجی و کنترل دسترسی را انجام می‌دهند؛ Serviceها قواعد کسب‌وکار و تراکنش‌ها را اجرا می‌کنند؛ Repository/SQLAlchemy به PostgreSQL متصل می‌شود. Pydantic قراردادهای ورودی/خروجی را اعتبارسنجی می‌کند. Alembic مهاجرت schema را مدیریت می‌کند. Redis برای rate limit و broker/result backend صف استفاده می‌شود؛ Celery worker/beat وظایف پس‌زمینه مثل انقضای سفارش را اجرا می‌کند. Docker Compose و Nginx زیرساخت بسته‌بندی و reverse proxy را فراهم می‌کنند، اما وجود فایل پیکربندی اثبات استقرار زنده نیست.

## ۳. فناوری‌ها و آنچه باید یاد بگیری
| فناوری | کاربرد | موضوع تسلط |
|---|---|---|
| Python | منطق بک‌اند | ماژول، خطا، type و تست |
| FastAPI | API | route، dependency، HTTP و OpenAPI |
| Pydantic | اعتبارسنجی | schema و خطای ورودی |
| SQLAlchemy | ORM | session، relationship و transaction |
| PostgreSQL | داده پایدار | constraint، index، lock و isolation |
| Alembic | migration | upgrade/downgrade |
| React/TypeScript | UI | component، state، routing و typecheck |
| Redis | rate limit/صف | TTL، broker و کلیدهای محدودسازی |
| Celery | کار پس‌زمینه | task، worker، beat و retry |
| Docker | بسته‌بندی | env، شبکه، health و build |
| GitHub Actions | CI | job، logs و شواهد واقعی |
| Playwright | E2E | سناریوی کاربر و assertion |

## ۴. نقشه مخزن
- app/api/routes: endpoint، اعتبارسنجی HTTP و نقش‌ها.
- app/services: قواعد کسب‌وکار، تراکنش، audit و اعلان.
- app/repositories: پرس‌وجو و دسترسی به داده.
- app/db/models: مدل‌های SQLAlchemy.
- app/schemas: قراردادهای Pydantic.
- app/core: تنظیمات، session، دسترسی، CSRF و rate limit.
- app/workers: taskهای Celery.
- alembic/versions: migrationها.
- frontend/src: برنامه React/TypeScript.
- docs: تصمیمات معماری، آمادگی پایلوت، نقشه راه و runbook.
- SECURITY.md: مدیریت اسرار و امنیت.

برای یادگیری، یک درخواست را از UI تا route، service، transaction و مدل DB دنبال کن؛ صرفاً خواندن فایل‌ها کافی نیست.

## ۵. مدل داده و پول
موجودیت‌ها شامل users، phone_otps، merchants، food_offers، orders، order_items، payments، merchant_settlements، notifications و audit_logs هستند. قیمت‌ها در Python با Decimal و در SQL با NUMERIC(12,2) نگهداری می‌شوند؛ واحد داخلی تومان است و آداپتور زرین‌پال مبلغ را برای درگاه به ریال تبدیل می‌کند. از float برای محاسبات مالی استفاده نکن.

## ۶. عرضه و moderation
وضعیت فروشنده: PENDING، VERIFIED یا SUSPENDED. وضعیت پیشنهاد: PENDING، APPROVED یا REJECTED. پیشنهاد عمومی باید فعال، دارای موجودی، منقضی‌نشده، متعلق به فروشنده تأییدشده و تأییدشده توسط مدیر باشد. این کنترل در سرویس سفارش نیز تکرار می‌شود؛ پنهان‌کردن دکمه در UI امنیت نیست. تغییر محتوای مهم می‌تواند پیشنهاد تأییدشده را دوباره وارد صف بررسی کند. تصمیم‌های رد/تعلیق باید دلیل، audit event و اعلان داشته باشند.

## ۷. سفارش و هم‌زمانی
چرخه عادی: PENDING → PAID → READY_FOR_PICKUP → COMPLETED. سفارش پرداخت‌نشده ممکن است CANCELLED یا EXPIRED شود؛ سفارش آماده تحویل پس از پایان پنجره نیز ممکن است EXPIRED شود.

رزرو موجودی در transaction و با SELECT FOR UPDATE انجام می‌شود تا دو خرید هم‌زمان نتوانند آخرین واحد را هر دو رزرو کنند. لغو و انقضای سفارش پرداخت‌نشده موجودی را طبق منطق سرویس بازمی‌گرداند. فقط سرویس تأیید سمت سرور درگاه می‌تواند سفارش را PAID کند؛ endpoint عمومی تغییر وضعیت نباید این کار را بکند، حتی برای مدیر.

زمان‌ها باید timezone-aware و در ذخیره‌سازی UTC باشند؛ API باید offset مشخص داشته باشد و UI زمان را برای کاربر در Asia/Tehran نمایش دهد.

تمرین: کد checkout، قفل ردیف، rollback، تست آخرین واحد و رفتار callback تکراری را پیدا کن و بدون نگاه به راهنما توضیح بده.

## ۸. ورود و امنیت
مسیرهای OTP عبارت‌اند از POST /api/auth/otp/request و POST /api/auth/otp/verify؛ مسیرهای email/password نیز برای سازگاری حفظ شده‌اند. OTP شش‌رقمی، با TTL پیش‌فرض ۳۰۰ ثانیه، HMAC-hash، یک‌بارمصرف و محدود به پنج تلاش است. Redis درخواست را براساس IP و شماره تلفن محدود می‌کند. debug_code فقط برای mock توسعه‌ای است و نباید در production فعال باشد.

سایر کنترل‌ها: کوکی session با HttpOnly، توکن CSRF برای درخواست‌های تغییردهنده، بررسی نقش و مالکیت در سرور، عدم ثبت token/OTP در log و نگهداری اسرار در environment/secret manager. متغیرهای VITE_* بعد از build عمومی‌اند و جای secret نیستند. X-Webhook-Secret را امضای رسمی callback زرین‌پال معرفی نکن.

## ۹. پرداخت، بازپرداخت و تسویه
سرور تلاش پرداخت و authority را ثبت می‌کند؛ کاربر به درگاه می‌رود؛ پس از برگشت، سرور authority و مبلغ را با provider تأیید می‌کند. صفحه برگشت مرورگر به‌تنهایی مدرک پرداخت نیست. هر authority به provider ایجادکننده‌اش وابسته است و provider ناشناخته نباید به mock fallback شود.

اگر پرداخت پس از لغو/انقضای سفارش تأیید شود، سفارش بسته می‌ماند و payment به REFUND_REQUIRED می‌رود؛ تسویه فروشنده ساخته نمی‌شود. مدیر صف GET /api/admin/payments/refund-required را بررسی می‌کند و پس از انجام واقعی refund خارج از سامانه، مرجع را با PATCH /api/admin/payments/{payment_id}/refund-completed ثبت می‌کند.

نرخ کمیسیون پیش‌فرض PLATFORM_COMMISSION_BPS=1000 یعنی ۱۰٪ است. ledger مبلغ ناخالص، کمیسیون و خالص را ثبت می‌کند. PATCH /api/admin/settlements/{id}/paid مرجع پرداخت دستی را پس از انتقال واقعی ثبت می‌کند. این کد پول را منتقل نمی‌کند و split خودکار زرین‌پال نیست؛ refund نیز خودکار نیست. هیچ تراکنش زنده‌ای در شواهد این مخزن اثبات نشده است.

## ۱۰. Celery و عملیات
Celery Beat هر دقیقه taskهای انقضای سفارش را اجرا می‌کند. task پرداخت‌نشده وضعیت payment را هنگام قفل‌کردن رکورد بررسی می‌کند تا پرداخت تأییدشده با انقضا رقابت نکند. سفارش آماده تحویل که منقضی شود خودکار دوباره موجود نمی‌شود و به‌خودی‌خود refund یا payout نمی‌گیرد. در تولید به backup، restore drill، monitoring، alert، log امن و rollback نیاز است.

## ۱۱. اجرای محلی در Windows PowerShell
نیازمندی‌های مستندشده: Python 3.12+، Node.js 24+، PostgreSQL، Redis و Git.

    git clone https://github.com/sinanaghdi/nejat-e-ghaza.git
    cd nejat-e-ghaza
    python -m venv .venv
    .\.venv\Scripts\Activate.ps1
    pip install -r requirements.txt
    Copy-Item .env.example .env

در .env توسعه‌ای ENVIRONMENT=development، PAYMENT_PROVIDER=mock، SMS_PROVIDER=mock، AUTH_COOKIE_SECURE=false و آدرس‌های محلی PostgreSQL/Redis را تنظیم کن. secret توسعه‌ای مستقل بگذار و mock را هرگز در production استفاده نکن.

    alembic upgrade head
    uvicorn app.main:app --reload

در ترمینال دوم:

    cd frontend
    npm install
    npm run dev

API docs در http://localhost:8000/docs و UI معمولاً در http://localhost:5173 است.

    pytest -q
    cd frontend
    npm run typecheck
    npm run build
    npm run e2e

ممکن است لازم باشد npx playwright install chromium اجرا شود.

## ۱۲. شواهد آزمون
در شواهد ثبت‌شده ۱۲ اکتبر ۲۰۲۶، workflow اصلی Tests با run شماره 557 گزارش کرده: ۸۶ تست backend، دو Playwright E2E، audit وابستگی‌ها، typecheck، build و build دو Docker image موفق. workflow قدیمی Python با run شماره 635 گزارش کرده: ۸۵ تست موفق، یک تست skip و lint موفق. این‌ها شواهد اجرای مشخص در آن زمان‌اند، نه تضمین وضعیت commit کنونی و نه اثبات سرویس زنده. برای هر release، SHA، لینک workflow، job و نتیجه را ثبت کن؛ تست اجرا‌نشده «تأییدنشده» است نه «موفق».

سناریوهای ضروری: پیشنهاد نامعتبر/منقضی رد شود؛ checkout هم‌زمان oversell نکند؛ پرداخت ناموفق PAID نسازد؛ callback تکراری رکورد مالی تکراری نسازد؛ پرداخت دیرهنگام REFUND_REQUIRED شود؛ مشتری داده دیگری را نبیند؛ OTP منقضی و rate-limited باشد؛ CSRF نامعتبر رد شود؛ کد تحویل دوباره استفاده نشود.

## ۱۳. موارد باز پیش از پایلوت
- استقرار امن API، PostgreSQL، Redis و Celery.
- HTTPS و callback عمومی واقعی.
- پیامک واقعی و کنترل هزینه OTP.
- تراکنش sandbox و سپس تراکنش live کنترل‌شده.
- بازپرداخت و تسویه واقعی و تطبیق مالی.
- backup/restore، monitoring و alert.
- سیاست مصوب ایمنی غذا، آلرژن، تحویل، no-show، لغو و شکایت.
- حریم خصوصی، نگهداری/حذف داده، مسئول عملیات و شرایط حقوقی.
- تست بار و بررسی امنیتی مستقل.

متن سیاست‌های فعلی پیش‌نویس MVP است و مشاوره حقوقی نیست. پایلوت فقط بعد از عبور از gateهای امنیتی، مالی، عملیاتی و ایمنی باید شروع شود.

## ۱۴. برنامه تسلط شش‌هفته‌ای
هفته ۱: اجرای clean checkout، ترسیم معماری و دنبال‌کردن یک درخواست از UI تا DB.
هفته ۲: مدل‌ها، schemaها و migrationها؛ یک تغییر کوچک با تست در branch تمرینی.
هفته ۳: transaction، قفل موجودی، rollback و تست هم‌زمانی.
هفته ۴: OTP، cookie، CSRF، provider verification و پرداخت دیرهنگام.
هفته ۵: Celery، Redis، Docker و خواندن یک workflow CI از روی SHA.
هفته ۶: دموی پنج‌دقیقه‌ای، دیاگرام معماری و پاسخ به پرسش‌های مصاحبه.

برای هر مفهوم ثبت کن: تعریف، محل در کد، اجرای واقعی، تست و محدودیت. کپی‌کردن بدون توضیح و آزمون، تسلط نیست.

## ۱۵. دموی پنج‌دقیقه‌ای
- ۰:۰۰ تا ۰:۴۵: مسئله دورریز غذای پایان روز.
- ۰:۴۵ تا ۱:۳۰: رابط RTL و توضیح صریح اینکه دمو داده ساختگی دارد.
- ۱:۳۰ تا ۲:۱۵: معماری React → FastAPI → service → SQLAlchemy/PostgreSQL.
- ۲:۱۵ تا ۳:۱۵: قفل موجودی و تأیید پرداخت سمت سرور.
- ۳:۱۵ تا ۴:۱۵: OTP، rate limit، CSRF، صف REFUND_REQUIRED و ledger دستی.
- ۴:۱۵ تا ۵:۰۰: شواهد CI و محدودیت‌های production.

از داده ساختگی استفاده کن و پیامک، انتقال وجه یا تراکنش زنده را ادعا نکن مگر مدرک قابل بازبینی داشته باشی.

## ۱۶. معرفی مصاحبه و پرسش‌ها
معرفی ۹۰ثانیه‌ای:
«سهمینو یک MVP فارسی‌محور برای عرضه غذای مازاد با تخفیف است. فرانت‌اند با React و TypeScript و بک‌اند با FastAPI ساخته شده است. لایه‌های route، service و repository از هم جدا هستند و داده‌ها با SQLAlchemy در PostgreSQL نگهداری می‌شوند. Alembic migrationها را مدیریت می‌کند؛ Redis برای rate limit و زیرساخت Celery و Celery برای کارهای انقضا استفاده می‌شود. روی رزرو موجودی در transaction با قفل ردیف، OTP هش‌شده، CSRF و تأیید پرداخت سمت سرور تمرکز کرده‌ام. ledger کمیسیون و مسیر تطبیق دستی refund/payout وجود دارد، اما پول را خودکار منتقل نمی‌کند. CI شواهد آزمون دارد؛ پیامک زنده، پرداخت زنده، زیرساخت و سیاست‌های عملیاتی را جداگانه به‌عنوان gateهای باز معرفی می‌کنم.»

پرسش: چرا FastAPI؟ قرارداد typeدار، Pydantic و OpenAPI خودکار؛ نه ادعای برتری مطلق.
پرسش: چطور overselling را کم می‌کنی؟ transaction و SELECT FOR UPDATE همراه تست رقابت.
پرسش: چرا Decimal؟ float برای بسیاری از اعشار نمایش دودویی تقریبی دارد.
پرسش: چرا callback کافی نیست؟ سرور باید authority و مبلغ را با provider تأیید کند.
پرسش: آیا split خودکار یا refund خودکار داریم؟ خیر؛ ledger و reconciliation دستی‌اند.
پرسش: آیا production-ready است؟ نه براساس شواهد موجود؛ CI با سرویس زنده، backup و عملیات واقعی یکی نیست.
پرسش: قدم بعدی چیست؟ اجرای runbook از checkout تمیز، سیاست‌های مصوب، آزمون provider و پایلوت محدود با شواهد.

## منابع مخزن
- README: ../README.md
- Architecture & Development: ../DEVELOPMENT.md
- Security: ../SECURITY.md
- Architecture decisions: architecture-decisions.md
- Production roadmap: production-roadmap.fa.md
- Pilot readiness: pilot-readiness.md
- Release verification runbook: release-verification-runbook.md

این سند براساس مستندات مخزن تهیه شده است. پیش از ارائه، وضعیت شاخه جاری و CI را دوباره بررسی کن و هر ادعا را به کد، تست یا سند قابل مشاهده متصل کن.
