# Sahmino Frontend

React + TypeScript + Vite frontend for the Persian, RTL customer experience.

## Development

From the repository root:

    cd frontend
    npm install
    npm run dev

Create `frontend/.env` from `frontend/.env.example` when the API is not running on the default URL:

    VITE_API_BASE_URL=http://localhost:8000

The frontend is Persian-first and RTL-first. Offers are loaded from the FastAPI endpoint `GET /api/offers`; mock offer data has been removed.

## Current foundation

- Persian RTL document and UI
- Vazirmatn typography
- Responsive mobile-first marketplace layout
- Persian price formatting in تومان
- Persian numeral/date-time formatting
- API client with Persian error handling
- Loading skeleton
- Empty and error states
- Active offer discovery from FastAPI

## Public policy pages

The app includes Persian pages for privacy, terms of use, food safety/refunds, security reporting, and software license rights. They are available from the site footer and as HashRouter routes: `/privacy`, `/terms`, `/safety`, `/security`, and `/license`.

The GitHub Pages demo uses seeded data and client-side simulated roles only. Do not treat demo role markers as authorization or enter real sensitive data.

## Configuration and secrets

Only public configuration belongs in variables prefixed with `VITE_`; Vite embeds these values in the browser bundle. Never put an API key, password, JWT secret, SMS provider key, or payment credential in a frontend environment variable.
## Production

The production Docker stack builds the frontend into `Dockerfile.web.production` and serves the React SPA from Nginx. API requests use the same-origin `/api` path, so no browser-side API host is required in production.
