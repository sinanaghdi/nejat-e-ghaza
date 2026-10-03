# Phase 20 — Frontend Architecture & Persian UX

## Typography standard

Nejat-e-Ghaza is a Persian-first product. Typography is treated as a product system, not a decorative detail.

### Font

The frontend uses local **Vazirmatn** through `@fontsource/vazirmatn`.

Loaded weights:

- 400 — Regular
- 500 — Medium
- 600 — Semi-bold
- 700 — Bold
- 800 — Extra-bold

Using local font assets avoids depending on Google Fonts at runtime and makes typography more predictable in production.

### RTL rules

- `html` and `body` are explicitly RTL.
- Persian text does not use negative `letter-spacing`.
- Headings use Persian-friendly line heights.
- Body copy uses relaxed line height for Arabic-script readability.
- Numeric UI uses tabular numerals where alignment matters.
- Email/password/URL fields remain LTR where appropriate.
- Buttons, forms, cards and navigation inherit the same Persian font.

### Typography tokens

The system defines reusable sizes and line-height tokens in `typography.css`.

The UI should prefer these tokens over arbitrary font sizes when new components are added.

## Current architecture work

Phase 20 has started with the typography foundation. The next frontend iterations should continue by splitting the current monolithic `App.tsx` into:

- layout/navigation
- marketplace/home
- offer card
- offer details
- authentication
- cart
- orders
- merchant dashboard
- reusable modal/state components

React Router can then provide explicit application pages instead of keeping the whole product in one component.

## Persian UX requirements

Every new screen must preserve:

1. RTL layout.
2. Vazirmatn.
3. Persian labels and user-facing messages.
4. Persian numerals where appropriate.
5. تومان as the customer-facing currency.
6. Persian date/time formatting.
7. Mobile-first responsive behavior.
8. Clear loading, empty, error and success states.
9. Adequate line height and touch targets.
10. No English backend terminology exposed to normal users.

## Typography anti-patterns

Avoid:

- negative letter spacing for Persian headings
- mixing multiple Persian fonts
- relying on browser fallback for primary UI
- tiny body text
- dense paragraphs with low line height
- English UI labels where a Persian equivalent is available
- forcing Persian text into LTR layout
- using icons/emoji as the only semantic indicator

