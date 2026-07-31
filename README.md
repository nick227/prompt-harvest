# Image Harvest

AI image generation SaaS. Users write a prompt; the platform enhances it, queues it, calls one or more AI providers, and stores the result in cloud storage. Credits are purchased via Stripe and consumed per generation.

---

## Table of Contents

1. [Stack](#1-stack)
2. [User Features](#2-user-features)
3. [Admin Features](#3-admin-features)
4. [Architecture](#4-architecture)
5. [Key Patterns](#5-key-patterns)
6. [Developer Setup](#6-developer-setup)
7. [Environment Variables](#7-environment-variables)
8. [Database Models](#8-database-models)
9. [Testing](#9-testing)
10. [Deployment](#10-deployment)
11. [Docs Index](#11-docs-index)

---

## 1. Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20, ESM modules |
| Server | Express 4 |
| ORM / DB | Prisma 6 + MySQL 8 |
| Auth | Passport (Local + Google OAuth), JWT, express-session |
| Payments | Stripe Checkout + Webhooks |
| Email | Resend |
| Storage | Cloudflare R2 (AWS SDK v3) |
| Image processing | Sharp |
| AI — images | OpenAI DALL-E, Dezgo (Flux/SDXL/Lightning/Redshift), Google Vertex AI Imagen |
| AI — text | OpenAI GPT-4 / GPT-3.5 |
| NLP | Compromise.js, Datamuse API |
| Queue | p-queue |
| Security | Helmet, csrf-csrf, express-rate-limit, bcrypt |
| Frontend | Vanilla JS (ES modules), Tailwind CSS (CDN), Font Awesome |
| Testing | Jest 29, Playwright 1.55, Supertest |
| Linting | ESLint 8, Prettier 3 |
| Deploy | Docker (Node 20 Alpine), Railway + nixpacks |

---

## 2. User Features

### Auth
- Register with email/password or Google OAuth
- Email verification via Resend
- Password reset via time-limited token email
- Sessions persisted in MySQL via `PrismaSessionStore`

### Image Generation (`/`)
- Write a prompt; optionally enable **Enhance** (GPT-4 pre-processes it before generation)
- **Auto mode**: continuously generates on a timer
- **Magic prompt**: generates a fully random prompt
- **Max count**: up to 10 images per batch
- **Guidance slider**: controls diffusion faithfulness (Lightning=1, Redshift=5, SDXL=7.5)
- Provider and model selector loaded live from the database; each model shows its credit cost

**Generation pipeline:**
1. Client-side validation (bad words, length)
2. Optional GPT-4 prompt enhancement
3. Word-type substitution (Compromise.js / Datamuse)
4. Credit balance check — rejected immediately if insufficient
5. Job enters `QueueManager` (concurrency control, per-user rate limiting, retries)
6. AI provider called with exponential backoff retry (base 500ms, factor 2, ±20% jitter)
7. Base64 result validated for size, uploaded to Cloudflare R2
8. Credits deducted atomically; `CreditLedger` entry written
9. `Image` record created in MySQL
10. Image appears in feed

### Feed & Gallery
- Infinite-scroll grid or list view
- Full-text search across prompt text
- Filter by provider, model, public/private/hidden/deleted
- Like, tag, and rate images
- Toggle images public or private
- Full-screen lightbox
- Soft-delete (recoverable by admin)

### Profile (`/profile.html`)
- Upload avatar (JPEG/PNG/WebP, max 10 MB, stored in R2)
- Edit display name and username
- Change password (current password required)
- View generation stats and credit balance

### Credits & Billing (`/billing.html`)
- Credit balance always visible in the site header
- Purchase credit packages via Stripe Checkout
- Redeem promo codes (one per user per code, enforced at DB level)
- Full transaction history (debits and credits)

### Other
- Floating AI chat widget (GPT-4, conversations persisted in DB)
- Blog reader (`/blog/`) with view count tracking
- Terms (`/terms.html`), FAQ (`/faq.html`)

---

## 3. Admin Features

Access `/admin.html` — requires `isAdmin: true` on the user record. Every request is re-verified by `AdminAuthMiddleware.js` (session + JWT + DB check).

The admin panel is a single-page app; all sections load without page reload.

### Users
- Paginated user list with search
- View per-user stats, images, credit history, messages
- Manually add or remove credits (ledger entry created atomically)
- Suspend / unsuspend users
- Promote to admin

### Images
- Browse all images with filters (user, provider, model, status)
- Hide, soft-delete, or restore images

### Providers & Models
- Toggle providers active/inactive (disables for all users immediately)
- Add, edit, or deactivate models — controls what appears in the generator UI without a code deploy
- Set per-model credit cost

### Packages
- Create and manage credit bundles (name, price in cents, credits, sort order)
- Toggle active/inactive to show or hide on the billing page

### Promo Codes
- Create codes with credit amount, max redemptions, and expiry
- View redemption count; deactivate or delete

### Blog CMS
- Create, edit, publish/unpublish, and feature posts
- Auto-generated slugs; supports excerpt, thumbnail URL, and tags

### Violations
- Every prompt runs through `BadWordFilter.js`; violations are logged with: user, detected words, original content, sanitised content, severity (low/medium/high), IP, endpoint, and whether the request was blocked
- Filterable violations table in the admin panel

### Queue Monitor
- Live queue depth, active jobs, completed/failed counts
- Per-user rate limit status
- Queryable `QueueLog` table

### Messages
- Bidirectional user ↔ admin messaging
- Unread badges on both sides

### System Settings
- Runtime key/value config store (`SystemSettings` table)
- Supports string, number, boolean, and JSON values — change without redeploying

---

## 4. Architecture

### System overview

```
Browser (Vanilla JS + Tailwind)
        |
        | HTTP / REST
        v
Express server (server.js)
  Middleware stack -> Routes -> Controllers -> Services -> Repositories
        |
        +-- MySQL (Prisma)
        +-- Cloudflare R2 (images)
        +-- AI APIs (OpenAI, Dezgo, Google)
        +-- Stripe (payments)
```

### Middleware stack (applied in order)
`compression` → `helmet` → `morgan` → `cors` → `cookieParser` → `express-session` → `passport` → `bodyParser` → `csrf-csrf` → `apiRateLimit` → routes → `notFoundHandler` → `errorHandler`

### Route setup (`src/routes/index.js`)
Each domain has a `setupXxxRoutes(app, controller)` function. Protected routes use `authenticateTokenRequired` (JWT or session cookie).

### Services (`src/services/`)

| Service | Responsibility |
|---|---|
| `EnhancedImageService` | End-to-end image generation pipeline |
| `QueueManager` | Priority queue, concurrency, rate limiting, retries |
| `StripeService` / `StripeCheckoutService` | Payment processing and webhook handling |
| `TransactionService` | Credit accounting, double-entry ledger |
| `TaggingService` | AI-powered image auto-tagging |
| `ViolationService` | Bad-word detection, severity scoring, logging |
| `EmailService` | Transactional email via Resend |
| `BlogService` | Blog CRUD with slug management |
| `CloudflareR2Service` | Upload, delete, signed/public URL generation |
| `ModelInterface` | Reads and caches provider + model config from DB |

### Image generation pipeline (`src/services/generate/`)

```
QueueManager -> PromptProcessor -> ImageGenerator (provider router)
  |-- OpenAIProvider     (DALL-E)
  |-- DezgoProvider      (Flux, SDXL, Lightning, Redshift)
  +-- GoogleImagenProvider (Vertex AI)
-> GenerationResultProcessor -> ImageStorageService -> R2
-> DatabaseService (writes Image row)
```

Retry: exponential backoff, base 500ms, factor 2, ±20% jitter.
Retryable: network errors, 408, 429, 499, 500–504. Not retried: 400–407, content policy.

### Auth
- JWT for API requests (`Authorization: Bearer`)
- Session cookie for browser navigation
- Passport Local (email/password) and Google OAuth20
- Admin routes additionally verify `isAdmin: true` via DB query

### Frontend (`public/js/`)
Vanilla JS ES modules, no bundler. Modules communicate through a publish/subscribe event system — no direct cross-module references.

```
app.js / admin.js        # Page bootstrap
core/                    # Event system, base classes
components/              # Header, modals (shared across pages)
modules/                 # Feature modules: feed, image, search, textarea,
                         #   billing, profile, admin, views, providers
services/                # Thin fetch wrappers around REST endpoints
utils/                   # Input helpers, tag utilities
```

### Storage
All images in Cloudflare R2. `CloudflareR2Service` wraps AWS SDK v3. `ImageStorageService` selects public or signed URL based on `STORAGE_TYPE`.

### Stripe billing flow
```
POST /api/stripe/create-checkout-session
  -> Stripe Checkout page
  -> checkout.session.completed webhook (POST /webhooks/stripe)
  -> signature verified
  -> StripeIPManager checks stripeSessionId for duplicates
  -> TransactionService.addCredits()
  -> CreditLedger entry + User.creditBalance updated atomically
```

---

## 5. Key Patterns

| Pattern | Where used |
|---|---|
| **Strategy** | AI providers implement a shared `generateImage()` interface; orchestrator routes by type |
| **Factory** | `createSuccessResult()` / `createErrorResult()` are the sole response constructors |
| **Repository** | `ImageRepository` abstracts all DB access; controllers never query Prisma directly |
| **Queue** | `p-queue` with per-user rate limiting, priority promotion, graceful shutdown |
| **Dependency injection** | Services passed via constructors; every layer is independently testable |
| **Soft deletes** | Images and users use `isDeleted` / `deletedAt` / `deletedBy`; nothing is hard-deleted |
| **Credit ledger** | Every credit change writes a `CreditLedger` row; `creditBalance` is a denormalised cache |
| **CSRF** | `csrf-csrf`; client fetches token via `GET /api/csrf-token`, sends in `X-CSRF-Token` header |
| **Bad-word filter** | Runs on every prompt; logs violation with severity, blocks or sanitises, never silently drops |

---

## 6. Developer Setup

### Prerequisites
- Node.js 20+
- MySQL 8+
- Cloudflare R2 bucket
- OpenAI API key (minimum for generation to work)
- Stripe account (test keys sufficient for local dev)

### Steps

```bash
git clone https://github.com/nick227/prompt-harvest.git
cd prompt-harvest
npm install
cp .env.example .env   # fill in values — see Section 7
npm run db:migrate
npm run db:seed
npm run dev            # http://localhost:3200
```

### Stripe webhooks locally
```bash
npm run stripe:listen          # forwards Stripe events to localhost:3200/webhook
# or run both together:
npm run dev:with-stripe
```

### Promoting a user to admin
```sql
UPDATE users SET isAdmin = true WHERE email = 'you@example.com';
```
Or open Prisma Studio: `npm run db:studio`

### Generating secrets
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Project layout
```
server.js              # Express entry point
start.sh               # Production startup (migrations -> prisma generate -> node)
Dockerfile             # Node 20 Alpine
prisma/schema.prisma   # All DB models

src/
  config/              # Passport, ConfigManager, PrismaSessionStore
  controllers/         # Thin handlers delegating to services
  database/            # PrismaClient singleton
  middleware/          # Auth, CSRF, rate limiting, validation, error handler
  monitoring/          # SystemMonitor (production health polling)
  repositories/        # Data access abstractions
  routes/              # Route setup functions
  services/            # All business logic
    ai/                # GPT-4 chat service
    generate/          # Queue + provider adapters
  utils/               # Shared utilities

public/
  index.html           # Main generator page
  admin.html           # Admin dashboard
  billing.html         # Credits and billing
  profile.html         # User profile
  login.html / register.html / forgot-password.html
  blog/                # Blog reader
  css/                 # Design system stylesheets
  js/                  # Frontend modules (see Section 4)

docs/                  # Developer documentation (200+ files)
tests/                 # Unit, integration, E2E
scripts/               # DB and utility scripts
```

### Common scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Nodemon hot-reload dev server |
| `npm start` | Production start via `start.sh` |
| `npm run db:migrate` | Create and apply new migration |
| `npm run db:deploy` | Apply pending migrations (production) |
| `npm run db:studio` | Prisma Studio GUI |
| `npm run db:seed` | Seed initial data |
| `npm run db:reset` | Reset database (destructive) |
| `npm test` | Jest unit tests |
| `npm run test:coverage` | Unit tests + coverage |
| `npm run test:e2e` | Playwright E2E |
| `npm run test:e2e:ui` | Playwright interactive UI |
| `npm run test:search:all` | Search E2E suite (5 specs) |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run quality` | Lint strict + coverage (CI gate) |

### Adding a new AI provider
1. Create `src/services/generate/refactored/providers/NewProvider.js`
2. Add credential check in `core/CredentialValidator.js`
3. Wire routing in `ImageGenerator.js` (~3 lines)
4. Add `Provider` + `Model` rows in admin panel or seed script
5. Add API key to `.env`

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full walkthrough.

---

## 7. Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | MySQL connection string |
| `PORT` | Yes | Default 3200 |
| `NODE_ENV` | Yes | `development` or `production` |
| `SESSION_SECRET` | Yes | Min 32 chars; server exits in production if missing or default |
| `JWT_SECRET` | Yes | JWT signing secret |
| `OPENAI_API_KEY` | Yes | DALL-E + GPT |
| `OPENAI_MODEL` | No | Default: `gpt-3.5-turbo-16k` |
| `DEZGO_API_KEY` | No | Flux/SDXL models |
| `GOOGLE_CLIENT_ID` | No | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth |
| `GOOGLE_CLOUD_PROJECT_ID` | No | Vertex AI |
| `GOOGLE_APPLICATION_CREDENTIALS` | No | Path to service account JSON |
| `STRIPE_API_KEY` | No | Live secret key |
| `STRIPE_SECRET_TEST_KEY` | No | Test secret key |
| `STRIPE_WEBHOOK_SECRET` | No | Webhook signing secret |
| `RESEND_API_KEY` | No | Transactional email |
| `R2_ACCOUNT_ID` | Yes | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | Yes | R2 access key |
| `R2_SECRET_ACCESS_KEY` | Yes | R2 secret |
| `R2_BUCKET` | Yes | Bucket name |
| `R2_S3_ENDPOINT` | Yes | R2 S3-compatible endpoint |
| `R2_PUBLIC_BASE_URL` | Yes | CDN base URL for image delivery |
| `BASE_URL` | Yes | App's public URL (used in email links) |
| `UPLOAD_MAX_BYTES` | No | Default 10 MB |
| `SUPPRESS_PUNYCODE` | No | Set `1` to silence Node deprecation warning |

---

## 8. Database Models

All PKs are CUID strings. Managed by Prisma Migrate.

| Model | Table | Purpose |
|---|---|---|
| `User` | `users` | Accounts, credit balance, admin/suspended flags |
| `Image` | `images` | Generated images, metadata, tags, soft-delete fields |
| `UserMedia` | `user_media` | Uploaded files (avatars) |
| `Transaction` | `transactions` | Per-generation cost records |
| `CreditLedger` | `credit_ledger` | Authoritative credit history (double-entry) |
| `StripePayment` | `stripe_payments` | Payment records + Stripe session IDs |
| `Package` | `packages` | Credit bundle products |
| `PromoCode` | `promo_codes` | Discount/gift codes |
| `PromoRedemption` | `promo_redemptions` | One-per-user redemption enforcement |
| `Provider` | `providers` | AI provider registry |
| `Model` | `models` | AI model registry with cost-per-image |
| `BlogPost` | `blog_posts` | Blog articles |
| `Conversation` | `conversations` | AI chat sessions |
| `ChatMessage` | `chat_messages` | Chat history (user/assistant/system roles) |
| `Message` | `messages` | User ↔ admin messages |
| `Violations` | `violations` | Bad-word filter events |
| `SystemSettings` | `system_settings` | Runtime key/value config |
| `Session` | `sessions` | Database-backed express sessions |
| `QueueLog` | `queue_logs` | Generation queue events |
| `ApiRequest` | `api_requests` | API call audit log |
| `likes` | `likes` | Image likes |
| `tags` | `tags` | Image tags |
| `prompts` | `prompts` | User prompt history |
| `word_types` | `word_types` | Cached word-type lookups |

---

## 9. Testing

```bash
# Unit
npm test
npm run test:coverage
npm run test:billing:unit
npm run test:profile:unit
npm run test:admin-queue

# Integration
npm run test:integration
npm run test:profile:integration

# E2E (Playwright)
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:admin
npm run test:e2e:billing
npm run test:search:all
npm run test:blog
```

---

## 10. Deployment

### Railway
Pre-configured via `nixpacks.toml`. Set environment variables in the Railway dashboard, then:
```bash
railway up
```

`start.sh` runs on every boot: checks for pending Prisma migrations, applies them in production, generates the Prisma client, then starts the server.

### Docker
```bash
docker build -t image-harvest .
docker run -p 8080:8080 --env-file .env image-harvest
```

### Production checklist
- [ ] `SESSION_SECRET` is strong (≥ 32 chars) and not the example value
- [ ] `JWT_SECRET` is unique
- [ ] `NODE_ENV=production`
- [ ] `STRIPE_WEBHOOK_SECRET` matches the Stripe dashboard
- [ ] `BASE_URL` matches your production domain
- [ ] `R2_PUBLIC_BASE_URL` points to your CDN or custom domain
- [ ] HTTPS enabled (Railway handles this automatically)

---

## 11. Docs Index

The `/docs` directory contains detailed documentation for every subsystem.

| File | Covers |
|---|---|
| [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Image generation provider architecture |
| [`API_CONTRACTS.md`](docs/API_CONTRACTS.md) | REST API contracts |
| [`SECURITY_FIXES.md`](docs/SECURITY_FIXES.md) | Security audit and applied fixes |
| [`CLIENT_CSRF_GUIDE.md`](docs/CLIENT_CSRF_GUIDE.md) | CSRF token usage from the browser |
| [`RAILWAY_DEPLOYMENT.md`](docs/RAILWAY_DEPLOYMENT.md) | Railway deployment guide |
| [`MIGRATION.md`](docs/MIGRATION.md) | Database migration strategy |
| [`SEARCH_SYSTEM_FINAL_REVIEW.md`](docs/SEARCH_SYSTEM_FINAL_REVIEW.md) | Search system deep dive |
| [`ADMIN_API_DOCUMENTATION.md`](docs/ADMIN_API_DOCUMENTATION.md) | Admin REST API reference |
| [`PERFORMANCE_OPTIMIZATIONS.md`](docs/PERFORMANCE_OPTIMIZATIONS.md) | Performance work log |
| [`E2E_TESTING_GUIDE.md`](docs/E2E_TESTING_GUIDE.md) | Writing and running E2E tests |
| [`WORD_MATCHING_FLOW.md`](docs/WORD_MATCHING_FLOW.md) | NLP prompt enhancement flow |
| [`IMAGE_FLOW_DIAGRAM.md`](docs/IMAGE_FLOW_DIAGRAM.md) | Full generation flow diagram |
| [`TROUBLESHOOTING_MIGRATIONS.md`](docs/TROUBLESHOOTING_MIGRATIONS.md) | Migration troubleshooting |
| [`INFINITE_SCROLL.md`](INFINITE_SCROLL.md) | Infinite scroll implementation |
