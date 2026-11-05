# जय माँ काली कुटरी वाली — Temple Management Starter Project

**Project version:** 1.0 starter / MVP foundation. **Not production ready.**

## Included and working (after installation and MySQL migration)
- Next.js public Hindi temple website (responsive)
- Live Darshan banner with YouTube video + offline fallback image
- NestJS API and MySQL schema (Prisma)
- Password-protected initial administration via JWT
- Admin member registration and member list
- Contribution plan entry (monthly / yearly / one-time)
- Manual donation recording; **pending by default**; explicit confirmation and unique receipt reference
- Expenses: submit → approve/reject → paid
- Current/previous committee creation and public display; committee-member API
- Admin settings for video URL, live mode, fallback image URL and temple history
- Summary of confirmed donations and paid expenses
- Basic audit events for key writes

## NOT included yet (requires full implementation and independent QA)
- Public user registration, mobile OTP, family approval flows, full member self-service
- Payment gateway/automatic UPI settlement, refunds, payment webhooks
- Genuine generated PDF receipts, receipt verification, bill-file upload
- Contribution due-date engine, partial/advance allocation and reminders
- Redis/BullMQ, WhatsApp/SMS providers, messaging consent, retry logic
- Bank reconciliation, actual double-entry accounting, stock and gas tracking
- Maintenance tickets, puja booking, special projects, volunteer system
- Admin role-by-role fine-grained authorization (currently non-auditor admin roles have broad edit privileges)
- Hardened CSRF/session controls, credential lockout, rate limiting, production monitoring
- Full automated tests and independent security assessment

Do not accept live money through this starter. Manual donation entries are bookkeeping placeholders, NOT payment verification.

## Requirements
Node.js 20+, npm, MySQL 8+, a server with Node.js process support.
PHP-only shared hosting cannot run these apps directly; MySQL can remain on your existing hosting if reachable securely.

## Local setup
1. Create a MySQL database `kutri_temple` and a dedicated database user with privileges scoped to it.
2. Copy `.env.example` to `.env` at the project root; fill in `DATABASE_URL`, a random 32+ character `JWT_SECRET`, `ADMIN_EMAIL`, a strong `ADMIN_PASSWORD` (12+ chars), and `CORS_ORIGIN`.
3. Copy `apps/web/.env.example` to `apps/web/.env.local`. Point `NEXT_PUBLIC_API_URL` to the accessible API URL.
4. From the repository root run `npm install`.
5. `npm run db:generate`
6. `npm run db:migrate` and name the migration `initial` if prompted.
7. `npm run db:seed`
8. In one terminal: `npm run dev:api` and in another: `npm run dev:web`.
9. Open `http://localhost:3000` and `http://localhost:3000/admin`.

**Important:** Next.js env changes need a frontend restart/rebuild. MySQL credentials must never be exposed to the browser. Do not commit `.env` files.

## Live Darshan setup
- Set a specific YouTube live **video** URL, not just a channel URL.
- `AUTO`: With a valid `YOUTUBE_API_KEY` on the API service, checks YouTube's `snippet.liveBroadcastContent` for the video. Without API key, shows fallback image.
- `ON`: Operator forces player display; does **not** prove YouTube is actually live.
- `OFF`: Force backup image.
- Browser refreshes live state every 120 seconds. Current implementation makes API lookups per page refresh; for production use a shared server-side TTL cache / scheduler to avoid API quota exhaustion.
- Enter a permitted HTTPS image URL in `fallbackImageUrl`, preferably from the temple's own image storage. Avoid copyrighted third-party images.

## Deployment
- HTTPS reverse proxy recommended for `web` and `api` processes.
- MySQL backups must be encrypted and restore-tested; use least-privilege DB access.
- Run as non-root service accounts; restrict CORS; set real secrets and enable logging.
- No production go-live until financial rules, security and UAT checklist are fully implemented/tested.

## API routes
Public: `GET /api/health`, `/api/public/settings`, `/api/public/live`, `/api/public/committees`.
Login: `POST /api/auth/login`.
Admin bearer JWT: `GET /api/admin/summary`, `GET/POST /api/admin/members`, `POST /api/admin/contributions`, `GET/POST /api/admin/donations`, `PATCH /api/admin/donations/:id/confirm`, `GET/POST /api/admin/expenses`, `PATCH /api/admin/expenses/:id/status`, `PATCH /api/admin/settings/:key`, `POST /api/admin/committees`, `POST /api/admin/committee-members`.

## QA priority
Payment status idempotency, receipt numbering, expired/invalid JWT, data persistence after restart, committee-history retention, live-to-offline fallback, error handling, permission checks and backup restoration.
