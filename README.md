# 🌾 Image Harvest (AutoImage) — AI Image Generation Platform

> **Generate stunning AI images from plain-English prompts in seconds.** Image Harvest is a full-stack, production-grade SaaS platform that lets users craft, collect, and share AI-generated artwork across multiple providers — all backed by a credit-based billing engine, role-gated admin panel, and an enterprise-quality layered Node.js backend.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [User Guide — Full Functionality Tour](#2-user-guide--full-functionality-tour)
3. [Admin Guide — Full Control Panel Tour](#3-admin-guide--full-control-panel-tour)
4. [Technical Architecture](#4-technical-architecture)
5. [Key Patterns & Design Decisions](#5-key-patterns--design-decisions)
6. [Stack at a Glance](#6-stack-at-a-glance)
7. [Developer Starter Notes](#7-developer-starter-notes)
8. [Environment Variables Reference](#8-environment-variables-reference)
9. [Database Schema Overview](#9-database-schema-overview)
10. [Testing](#10-testing)
11. [Deployment](#11-deployment)
12. [Docs Directory](#12-docs-directory)

---

## 1. Product Overview

Image Harvest is a **multi-provider AI image generation SaaS**. Users describe what they want in natural language; the platform translates that into a polished prompt, charges credits, calls one or more AI backends, and stores the resulting images in cloud storage.

### What Makes It Special?

| Feature | Detail |
|---|---|
| **Multi-provider generation** | OpenAI DALL-E, Dezgo (Flux, SDXL, Lightning, Redshift), Google Imagen via Vertex AI |
| **Prompt intelligence** | AI-powered prompt enhancement via GPT-4 before generation |
| **Word-type magic** | Compromise.js + Datamuse API enrich prompts with semantic word variants |
| **Credit economy** | Full Stripe billing with packages, promo codes, and a double-entry credit ledger |
| **AI Chat widget** | Integrated floating AI assistant powered by GPT-4 conversations |
| **Social feed** | Public/private image feed, likes, tags, infinite scroll |
| **Admin superpowers** | Full dashboard with queue monitoring, violation tracking, user management, blog CMS |
| **Security-first** | Helmet, CSRF, JWT + session dual auth, bcrypt passwords, bad-word filter, rate limiting |

---

## 2. User Guide — Full Functionality Tour

### 2.1 Registration & Authentication

**Registration** (`/register.html`)
- Email + password, or **Sign in with Google** (OAuth 2.0 via Passport.js)
- Email verification flow: a verification link is sent via **Resend** email service
- Password strength validation enforced client-side and server-side
- Duplicate email / username detection with clear error messages

**Login** (`/login.html`)
- Email/password login with JWT session
- Google OAuth login — one-click, automatically creates an account on first use
- Persistent sessions stored in the MySQL database via `PrismaSessionStore`
- "Remember me" behavior via `express-session`

**Forgot Password** (`/forgot-password.html`)
- Enter email → receive a time-limited reset token via email
- Reset link takes the user to a secure password-reset form
- Tokens are single-use and expire automatically

---

### 2.2 Generating Images

The **main dashboard** (`/`) is where image creation happens.

#### Controls Bar (top of page)

| Control | Purpose |
|---|---|
| **Prompt textarea** | Describe what you want to generate in plain English |
| **Enhance checkbox** | Sends the prompt through GPT-4 before generation to improve quality |
| **Auto checkbox** | Continuously generates new images on a timer |
| **Max count (`maxNum`)** | Generate up to 10 images in a single batch |
| **Magic wand button** | Generates a completely random AI-crafted prompt |

#### Provider & Model Selection
- A **sidebar drawer** (desktop) or **hamburger menu** (mobile) exposes all AI providers and models
- Providers and their models are loaded live from the database — admins can add/remove models without code changes
- Each model shows its **credit cost per image** so users know before generating

#### The Generation Flow (what happens when you click Generate)
1. Prompt is validated client-side (bad words filtered, length checked)
2. If **Enhance** is on, prompt is sent to GPT-4 for enrichment
3. Word-type processing applies semantic substitutions (via Compromise.js / Datamuse)
4. Credit balance is validated — request is rejected instantly if insufficient
5. Request enters the **QueueManager** which handles concurrency, priority, and rate limiting
6. The appropriate AI provider is called (with retry + exponential backoff)
7. Image is returned as base64, validated for size, stored in **Cloudflare R2**
8. Credits are deducted atomically; a `CreditLedger` entry is written
9. The image record is created in MySQL via Prisma
10. The image appears in your feed immediately

#### Guidance Slider
- Controls the "guidance scale" parameter passed to diffusion models
- Higher values = more faithful to your prompt; lower values = more creative/loose
- Model-specific defaults: Lightning=1, Redshift=5, SDXL=7.5

---

### 2.3 Image Feed & Gallery

**Your Feed** — paginated, infinite-scroll gallery of all your generated images.

| Feature | How to use |
|---|---|
| **View modes** | Toggle between Grid view and List/detail view |
| **Search** | Full-text search across your image prompts with live results |
| **Filter by provider** | Show only images from DALL-E, Dezgo, Google, etc. |
| **Filter by model** | Narrow down to a specific model |
| **Public / Private toggle** | Mark images public (visible in global feed) or keep private |
| **Like images** | Heart button on any public image adds a like |
| **Tag images** | Add descriptive tags; auto-tagging runs via AI in the background |
| **Rate images** | Star rating stored per image |
| **Full-screen view** | Click any image to open a full-screen lightbox |
| **Delete images** | Soft-delete with `isDeleted` flag; recoverable by admin |

**Public Feed** — all images marked public, browseable by any logged-in user.

---

### 2.4 Profile Management

Profile page (`/profile.html`)

- **Avatar upload** — upload a profile picture (JPEG/PNG/WebP, max 10 MB), stored in R2
- **Display name / username** — editable in-place
- **Email** — shown (verified status badge displayed)
- **Password change** — current password required
- **Credit balance** — always visible in header and profile
- **Your stats** — total images generated, public images, likes received
- **Your images feed** — all your images browseable from profile

---

### 2.5 Credits & Billing

Billing page (`/billing.html`)

#### Checking your balance
Credit balance is always visible in the site header. The billing page shows a full breakdown.

#### Buying credits
1. Go to **Billing** in the navigation
2. Choose a credit **Package** (Bronze, Silver, Gold, etc. — configured by admin)
3. Click **Purchase** — redirects to a **Stripe Checkout** session
4. Complete payment; Stripe webhook fires automatically
5. Credits are added to your account instantly

#### Redeeming promo codes
- Enter a promo code in the billing page
- One redemption per code per user enforced at database level

#### Transaction history
- Full history of every credit debit (image generation) and credit (purchase/promo)
- Visible directly from the billing page

---

### 2.6 AI Chat Widget

- A floating chat bubble appears on supported pages
- Powered by GPT-4 via the `/api/ai/chat` route
- Conversations are persisted in the `conversations` + `chat_messages` tables
- Full conversation history maintained per session

---

### 2.7 Blog

Blog section (`/blog/`)

- Read published articles; view counts tracked per post
- Featured posts highlighted on the blog listing
- Articles have SEO-friendly slugs, excerpts, thumbnails, and tags
- Blog is admin-authored (see Admin Guide below)

---

### 2.8 Terms, FAQ, and Legal

| Page | Path |
|---|---|
| Terms of Service | `/terms.html` |
| FAQ | `/faq.html` |
| Purchase Success | `/purchase-success.html` |

---

## 3. Admin Guide — Full Control Panel Tour

Admin panel (`/admin.html`) — requires `isAdmin: true` on the user record.

> **Access is enforced by two layers:** the `AdminAuthMiddleware.js` (session + JWT check) and the `AdminApiController.js` which re-verifies admin status on every API call.

---

### 3.1 Dashboard Overview

The admin dashboard loads as a **single-page app** — navigation between sections happens without page reloads. All sections are rendered by modular JS components loaded from `public/js/admin/`.

---

### 3.2 Users

| Action | Detail |
|---|---|
| **List all users** | Paginated table with email, username, credits, created date |
| **Search users** | Find by email or username instantly |
| **View user detail** | Full stats: images generated, credit history, messages |
| **Add credits manually** | Enter an amount and reason; credits and ledger entry created atomically |
| **Suspend / unsuspend** | Sets `isSuspended` flag; suspended users cannot log in |
| **Promote to admin** | Sets `isAdmin: true` — use with extreme care |
| **Delete user** | Soft-removes user data (images remain soft-deleted) |

---

### 3.3 Images

| Action | Detail |
|---|---|
| **View all images** | Filter by user, provider, model, public/private/hidden/deleted |
| **Hide an image** | Sets `isHidden: true`; image disappears from all feeds |
| **Delete an image** | Sets `isDeleted: true`; soft-delete preserves data |
| **Restore deleted image** | Un-set `isDeleted`; image returns to feed |
| **View image full-size** | Click to open in lightbox |

---

### 3.4 Providers & Models

| Action | Detail |
|---|---|
| **List providers** | See all configured AI providers (OpenAI, Dezgo, Google) |
| **Toggle provider active/inactive** | Instantly disables a provider for all users without code change |
| **Add / edit models** | Set `displayName`, `costPerImage`, `apiUrl`, `apiModel`, `apiSize` |
| **Set model active/inactive** | Controls which models appear in the generator UI |

> This is the primary mechanism for managing AI model availability without deployments.

---

### 3.5 Packages (Credit Tiers)

| Action | Detail |
|---|---|
| **List packages** | See all purchasable credit bundles |
| **Create package** | Name, display name, price (cents), credits awarded, popular flag |
| **Edit package** | Update price or credit count; Stripe prices must match |
| **Toggle active/inactive** | Remove a package from the billing page instantly |
| **Sort order** | Control display order on the billing page |

---

### 3.6 Promo Codes

| Action | Detail |
|---|---|
| **Create promo code** | Code string, credits awarded, max redemptions, expiry date |
| **View usage** | See how many times a code has been redeemed |
| **Deactivate code** | Immediately prevents new redemptions |
| **Delete code** | Removes the code entirely |

---

### 3.7 Blog CMS

| Action | Detail |
|---|---|
| **Create post** | Title, slug (auto-generated), content (rich text), excerpt, thumbnail URL, tags |
| **Publish / unpublish** | Toggle `isPublished`; drafts are invisible to users |
| **Feature a post** | Sets `isFeatured`; highlighted on the blog listing |
| **Edit post** | Full in-dashboard editor |
| **Delete post** | Remove a blog post |

---

### 3.8 Violations

The **bad-word filter** (`BadWordFilter.js`) runs on every prompt submission. When a violation is detected:

| Field | Logged |
|---|---|
| User ID & email | Who submitted it |
| Detected words | What triggered the filter |
| Original content | Full raw text |
| Sanitized content | What was actually used (if allowed through) |
| Severity | `low` / `medium` / `high` |
| IP address | For abuse tracking |
| Endpoint | Which API route was called |
| Is blocked | Whether the request was blocked or just logged |

Admins see a filterable, searchable violations table with full detail on each event.

---

### 3.9 Queue Monitor

A real-time view of the **image generation queue** (`QueueManager.js`):

| Metric | Detail |
|---|---|
| **Queue depth** | How many jobs are waiting |
| **Active jobs** | Currently processing |
| **Completed / failed** | Historical counts |
| **Per-user rate limits** | See if any user is being throttled |
| **Queue logs** | Stored in `QueueLog` table; queryable from admin UI |

---

### 3.10 Messages

Bidirectional messaging between users and admins:

- Users can send a message from their profile or billing page
- Admins see all messages in the admin panel grouped by user
- Admin replies go back to the user's message thread
- Unread count badges on both sides

---

### 3.11 System Settings

Key-value store (`SystemSettings` table) for runtime configuration:

- Change settings without redeploying (feature flags, thresholds, limits)
- Data-typed values (`string`, `number`, `boolean`, `json`)

---

### 3.12 Monitoring

The `/api/monitoring/*` routes expose:

- Database health check
- Queue health check
- System uptime
- Recent error logs

In production, `SystemMonitor.js` polls these automatically and logs anomalies.

---

## 4. Technical Architecture

### 4.1 High-Level Overview

```
+-----------------------------------------------------+
|                     Browser                          |
|  Vanilla JS + Tailwind CSS + Modular ES Modules      |
+---------------------------+-------------------------+
                            |  HTTP/REST + WebSocket
+---------------------------v-------------------------+
|               Express.js Server (server.js)          |
|                                                      |
|  +----------+  +----------+  +--------------------+ |
|  | Middleware|  | Routes   |  | Error Handling     | |
|  | Stack     |  | Index    |  | (errorHandler.js)  | |
|  +----------+  +----+-----+  +--------------------+ |
|                     |                                |
|  +------------------v--------------------------------+|
|  |               Controllers Layer                  ||
|  |  EnhancedImageController | ProfileController     ||
|  |  AdminApiController      | BlogController        ||
|  |  TransactionController   | PromptController      ||
|  +------------------+--------------------------------+|
|                     |                                |
|  +------------------v--------------------------------+|
|  |                Services Layer                    ||
|  |  EnhancedImageService | QueueManager             ||
|  |  StripeService        | TransactionService       ||
|  |  EmailService         | BlogService              ||
|  |  TaggingService       | ViolationService         ||
|  +------------------+--------------------------------+|
|                     |                                |
|  +------------------v--------------------------------+|
|  |              Repositories Layer                  ||
|  |         ImageRepository + PrismaClient           ||
|  +------------------+--------------------------------+|
+---------------------+-------------------------------+
                      |
          +-----------+-----------+
          |           |           |
    +-----v-----+ +---v---+ +----v---------+
    |  MySQL DB  | |  R2   | |  AI APIs     |
    |  (Prisma)  | |  CDN  | |  OpenAI      |
    +------------+ +-------+ |  Dezgo       |
                             |  Google      |
                             +--------------+
```

---

### 4.2 Backend Layer Breakdown

#### Middleware Stack (applied in order in `server.js`)

1. `compression` — gzip for text responses; skips already-compressed media
2. `helmet` — security headers (CSP, X-Frame-Options, HSTS, etc.)
3. `morgan` — HTTP request logging
4. `cors` — cross-origin policy
5. `cookieParser` — cookie parsing
6. `express-session` + `PrismaSessionStore` — server-side sessions in MySQL
7. `passport` — authentication (Local + Google OAuth strategies)
8. `bodyParser` — JSON + URL-encoded payloads with per-route size limits
9. `csrf-csrf` — CSRF tokens required on all state-changing requests
10. `apiRateLimit` — per-IP rate limiting via `express-rate-limit`
11. Route handlers
12. `notFoundHandler` + `errorHandler` — catch-all error responses

#### Route Architecture (`src/routes/index.js`)

All routes are initialised in `setupRoutes()`. Each route module follows the same pattern:

```javascript
setupXxxRoutes(app, controller)
```

Route modules own their URL namespace and attach handlers to the express `app`. Protected routes apply `authenticateTokenRequired` middleware which validates the JWT from the `Authorization` header or session cookie.

#### Service Layer

Business logic lives exclusively in `src/services/`. Services are injected into controllers via constructor injection, making them independently testable.

| Service | Responsibility |
|---|---|
| `EnhancedImageService` | Orchestrates image generation pipeline end-to-end |
| `QueueManager` | Priority queue with concurrency control, rate limiting, retries |
| `StripeService` + `StripeCheckoutService` | Payment processing, webhook handling |
| `TransactionService` | Credit accounting and double-entry ledger |
| `TaggingService` | AI-powered image auto-tagging |
| `ViolationService` | Bad-word detection, logging, severity scoring |
| `EmailService` | Transactional email via Resend |
| `BlogService` | Blog CRUD with slug management |
| `AdminPromoService` | Promo code lifecycle |
| `CloudflareR2Service` | Image upload and signed URL generation |
| `ModelInterface` | Reads/caches provider+model config from database |

---

### 4.3 Image Generation Deep Dive

The generation system is a multi-layer architecture in `src/services/generate/`:

```
QueueManager.js (40 KB) -- priority queue orchestrator
    |
    v
PromptProcessor.js -- word substitution, AI enhancement
    |
    v
ImageGenerator.js (refactored, in lib/) -- provider router
    |-- providers/OpenAIProvider.js     (DALL-E)
    |-- providers/DezgoProvider.js      (Flux, SDXL, Lightning, Redshift)
    +-- providers/GoogleImagenProvider.js (Vertex AI Imagen)
    |
    v
GenerationResultProcessor.js -- size validation, base64 handling
    |
    v
ImageStorageService.js --> CloudflareR2Service (upload to CDN)
    |
    v
DatabaseService.js -- writes Image record via Prisma
```

**Retry strategy:** exponential backoff, base 500ms, factor 2, plus/minus 20% jitter.
Retryable: network errors, 408, 429, 499, 500-504.
Never retried: client errors 400-407, content policy violations.

---

### 4.4 Authentication System

Two complementary auth mechanisms:

| Mechanism | Used For |
|---|---|
| **JWT (`jsonwebtoken`)** | API requests (`Authorization: Bearer <token>`) |
| **Session cookie** | Browser-based page navigation |
| **Passport Local** | Email/password login |
| **Passport Google OAuth20** | Google Sign-In |

Admin routes use `AdminAuthMiddleware.js` which checks **both** session and JWT, then queries the database to confirm `isAdmin: true`.

---

### 4.5 Frontend Architecture

The browser layer is Vanilla JS with ES modules, Tailwind CSS (CDN), and Font Awesome icons. There is **no bundler** — scripts are served as static files by Express.

```
public/js/
+-- app.js                    # Main application bootstrap
+-- admin.js                  # Admin dashboard bootstrap
+-- core/                     # Base classes, event system
+-- components/               # Reusable UI components (header, modals)
+-- modules/                  # Feature modules
|   +-- feed/                 # Image feed rendering + infinite scroll
|   +-- image/                # Image card, lightbox, actions
|   +-- search/               # Search + filter logic
|   +-- textarea/             # Smart prompt textarea
|   +-- billing/              # Billing page UI
|   +-- profile/              # Profile page UI
|   +-- admin/                # Admin dashboard sections
|   +-- views/                # View mode switching (grid/list)
|   +-- providers/            # Provider/model selector UI
+-- services/                 # API call wrappers (thin fetch layer)
+-- utils/                    # Input helpers, tag utils, etc.
+-- pages/                    # Page-level entry scripts
```

The frontend uses a **publish/subscribe event system** to decouple modules. For example, when a new image is generated, an event fires and the feed module subscribes to re-render — neither module has a direct reference to the other.

---

### 4.6 Storage Architecture

Images are stored exclusively in **Cloudflare R2** (S3-compatible object storage).

| Config | Variable |
|---|---|
| Bucket | `R2_BUCKET` |
| Public CDN base URL | `R2_PUBLIC_BASE_URL` |
| Signed URL TTL | `R2_SIGNED_URL_TTL_SECONDS` (default: 300s) |
| Upload max size | `UPLOAD_MAX_BYTES` (default: 10 MB) |

`CloudflareR2Service.js` wraps the AWS SDK v3 client and handles upload, delete, and URL generation. `ImageStorageService.js` is a higher-level wrapper that decides whether to use public or signed URLs based on `STORAGE_TYPE`.

---

### 4.7 Stripe & Billing Architecture

```
User clicks "Purchase"
    |
    v
POST /api/stripe/create-checkout-session
    |
    v
StripeCheckoutService.createSession()  -->  Stripe API
    |
    v
Redirect to Stripe Checkout page
    |
    v
User completes payment
    |
    v
Stripe fires webhook: POST /webhooks/stripe
    |
    v
StripeWebhookRoutes --> StripeService.handleWebhook()
    |
    v
Verify signature (STRIPE_WEBHOOK_SECRET)
    |
    v
Handle event:
  checkout.session.completed -->
    StripeIPManager records payment
    TransactionService.addCredits(userId, credits)
    CreditLedger entry written
    User.creditBalance updated atomically
```

The `StripeIPManager.js` prevents duplicate credit awards on replayed webhooks by checking `stripeSessionId` uniqueness before processing.

---

## 5. Key Patterns & Design Decisions

### Strategy Pattern — AI Providers
Each provider (`OpenAIProvider`, `DezgoProvider`, `GoogleImagenProvider`) implements the same interface (`generateImage(prompt, guidance, ...options)`). The orchestrator routes by provider type without knowing provider internals.

### Factory Pattern — Result Builders
`createSuccessResult()` and `createErrorResult()` in `ResultTypes.js` are the single source of truth for response shape. Every provider uses them — no ad-hoc response objects.

### Repository Pattern — Data Access
`ImageRepository` (and Prisma-backed repositories) abstract all database access. Controllers and services never write raw Prisma queries directly in route handlers.

### Queue Pattern — Concurrency Control
`QueueManager.js` uses `p-queue` under the hood with per-user rate limiting, priority promotion, and graceful shutdown signals. This prevents a single user from monopolising AI API quota.

### Dependency Injection — Testability
Controllers receive services via constructor parameters. Services receive repositories the same way. This means every layer can be tested with mock dependencies.

### Soft Deletes — Data Safety
Images and users are never hard-deleted. `isDeleted`, `deletedAt`, `deletedBy` columns preserve history and allow admin recovery.

### Credit Ledger — Auditability
Every credit change (purchase, deduction, promo redemption) writes a `CreditLedger` row. The user's `creditBalance` is a denormalised cache; the ledger is the authoritative source.

### CSRF Protection
All state-changing API requests require a CSRF token (`csrf-csrf` library). Tokens are fetched by the client via `GET /api/csrf-token` and included in `X-CSRF-Token` headers. See [`docs/CLIENT_CSRF_GUIDE.md`](docs/CLIENT_CSRF_GUIDE.md).

### Bad-Word Filter
`BadWordFilter.js` (14 KB) runs on every prompt. It checks against a word list, detects context, assigns severity, logs the violation, and decides whether to block or sanitise. Violations are stored in the `violations` table for admin review.

---

## 6. Stack at a Glance

### Backend

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 (ESM `"type": "module"`) |
| Framework | Express 4 |
| ORM | Prisma 6 |
| Database | MySQL 8 |
| Auth | Passport.js (Local + Google OAuth), JWT, express-session |
| Email | Resend |
| Payments | Stripe (Checkout + Webhooks) |
| Image Storage | Cloudflare R2 (S3-compatible via AWS SDK v3) |
| Image Processing | Sharp |
| AI — Text | OpenAI GPT-4 / GPT-3.5 |
| AI — Images | OpenAI DALL-E, Dezgo (Flux/SDXL), Google Vertex AI Imagen |
| NLP | Compromise.js, Datamuse API |
| Queue | p-queue |
| Security | Helmet, CSRF-CSRF, express-rate-limit, bcrypt |

### Frontend

| Layer | Technology |
|---|---|
| Language | Vanilla JavaScript (ES Modules, no bundler) |
| CSS | Tailwind CSS (CDN) + custom CSS design system |
| Icons | Font Awesome 6 |
| Fonts | Google Fonts (Inter) |
| HTTP | Native `fetch` API |

### DevOps / Infrastructure

| Layer | Technology |
|---|---|
| Container | Docker (Node 20 Alpine) |
| Deployment | Railway (with nixpacks config) |
| DB Migrations | Prisma Migrate |
| Test — Unit | Jest 29 + jsdom |
| Test — Integration | Jest + Supertest |
| Test — E2E | Playwright 1.55 |
| Linting | ESLint 8 |
| Formatting | Prettier 3 |

---

## 7. Developer Starter Notes

### Prerequisites

- Node.js 20+
- MySQL 8+ (or a hosted MySQL-compatible database)
- A Cloudflare R2 bucket
- Stripe account (test keys for local dev)
- OpenAI API key (minimum for image generation)

### Local Setup

```bash
# 1. Clone and install
git clone https://github.com/nick227/prompt-harvest.git
cd prompt-harvest
npm install

# 2. Create your environment file
cp .env.example .env
# Edit .env -- see Environment Variables section below

# 3. Run database migrations
npm run db:migrate

# 4. Seed the database (providers, packages, system settings)
npm run db:seed

# 5. Start the dev server with hot-reload
npm run dev
```

Visit `http://localhost:3200` (or whatever `PORT` you set).

### Optional: Local Stripe Webhooks

```bash
# Install Stripe CLI, then:
npm run stripe:listen
# This forwards Stripe events to localhost:3200/webhook
```

Or run both the server and Stripe listener together:

```bash
npm run dev:with-stripe
```

### Making Yourself an Admin

After registering an account locally, update your user record:

```sql
UPDATE users SET isAdmin = true WHERE email = 'your@email.com';
```

Or via Prisma Studio:

```bash
npm run db:studio
```

Then visit `http://localhost:3200/admin.html`.

### Directory Map

```
image-harvest/
+-- server.js              # Express app entry point
+-- start.sh               # Production startup (runs migrations first)
+-- Dockerfile             # Docker build (Node 20 Alpine)
+-- prisma/
|   +-- schema.prisma      # All database models
+-- src/
|   +-- config/            # Passport, ConfigManager, PrismaSessionStore
|   +-- controllers/       # Route handlers (thin layer over services)
|   +-- database/          # PrismaClient singleton
|   +-- factories/         # Object construction helpers
|   +-- middleware/        # Auth, CSRF, rate limiting, validation, errors
|   +-- monitoring/        # SystemMonitor (production health checks)
|   +-- repositories/      # ImageRepository (data access abstraction)
|   +-- routes/            # Express route setup functions
|   +-- scripts/           # DB seeding, migration utilities
|   +-- services/          # Business logic
|   |   +-- ai/            # AI chat service (GPT-4 conversations)
|   |   +-- generate/      # Image generation queue + provider adapters
|   |   +-- queue/         # QueueManager and supporting modules
|   |   +-- ...            # Other services (Stripe, Email, Blog, Tags...)
|   +-- types/             # JSDoc type definitions
|   +-- utils/             # Shared utility functions
|   +-- webhook/           # Stripe webhook processing
+-- public/                # Static assets served by Express
|   +-- index.html         # Main app page
|   +-- admin.html         # Admin dashboard
|   +-- billing.html       # Billing and credits
|   +-- profile.html       # User profile
|   +-- login.html         # Login
|   +-- register.html      # Registration
|   +-- blog/              # Blog listing and article pages
|   +-- css/               # Stylesheets (design-system.css, optimized.css, ...)
|   +-- js/                # Frontend JavaScript modules
+-- docs/                  # 200+ developer documentation files
+-- tests/                 # Unit, integration, and E2E tests
+-- scripts/               # Developer utility scripts
+-- tools/                 # CSS analysis and cleanup tools
```

### Generating a Strong Secret

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Use this output for `SESSION_SECRET` and `JWT_SECRET` in production.

### Adding a New AI Provider

1. Create `src/services/generate/refactored/providers/NewProvider.js` (~150 lines)
2. Add credential check to `src/services/generate/refactored/core/CredentialValidator.js`
3. Wire into `src/services/generate/refactored/ImageGenerator.js` (~3 lines)
4. Add a `Provider` row and `Model` rows via the admin panel or seed script
5. Add the new API key to `.env`

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full provider addition walkthrough.

### Common npm Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start with nodemon (hot reload) |
| `npm start` | Production start (runs `start.sh`) |
| `npm run db:migrate` | Create and apply a new migration |
| `npm run db:deploy` | Apply pending migrations (production) |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:seed` | Seed initial data |
| `npm run db:reset` | Reset DB (destroys all data) |
| `npm test` | Run all Jest unit tests |
| `npm run test:coverage` | Unit tests + coverage report |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run test:e2e:ui` | Playwright with interactive UI |
| `npm run test:search:all` | All search-specific E2E tests |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run analyze:css` | CSS analysis tool |

---

## 8. Environment Variables Reference

Copy `.env.example` to `.env` and fill in real values.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | MySQL connection string |
| `PORT` / `API_PORT` | Yes | HTTP server port (default 3200) |
| `NODE_ENV` | Yes | `development` or `production` |
| `SESSION_SECRET` | Yes | Min 32 chars; server crashes in prod if missing |
| `JWT_SECRET` | Yes | JWT signing secret |
| `OPENAI_API_KEY` | Yes | OpenAI API key for DALL-E and GPT |
| `OPENAI_MODEL` | No | GPT model name (default: gpt-3.5-turbo-16k) |
| `DEZGO_API_KEY` | No | Dezgo API key (Flux/SDXL models) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `GOOGLE_CLOUD_PROJECT_ID` | No | Vertex AI project ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | No | Path to service account JSON |
| `STRIPE_API_KEY` | No | Stripe live secret key |
| `STRIPE_SECRET_TEST_KEY` | No | Stripe test secret key |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signing secret |
| `RESEND_API_KEY` | No | Resend email API key |
| `R2_ACCOUNT_ID` | Yes | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | Yes | R2 access key |
| `R2_SECRET_ACCESS_KEY` | Yes | R2 secret key |
| `R2_BUCKET` | Yes | R2 bucket name |
| `R2_S3_ENDPOINT` | Yes | R2 S3-compatible endpoint URL |
| `R2_PUBLIC_BASE_URL` | Yes | Public CDN URL for stored images |
| `BASE_URL` | Yes | App's own public URL (used in email links) |
| `STORAGE_PROVIDER` | No | `cloudflare_r2` (default) |
| `UPLOAD_MAX_BYTES` | No | Max upload size in bytes (default 10 MB) |
| `SUPPRESS_PUNYCODE` | No | Set to `1` to silence Node deprecation warning |

---

## 9. Database Schema Overview

Managed by **Prisma Migrate** against MySQL 8.

| Model | Table | Purpose |
|---|---|---|
| `User` | `users` | Accounts, credits, admin flag |
| `Image` | `images` | Generated images with metadata, tags, soft-delete |
| `UserMedia` | `user_media` | Uploaded files (avatars, etc.) |
| `Transaction` | `transactions` | Per-generation cost records |
| `CreditLedger` | `credit_ledger` | Double-entry credit accounting |
| `StripePayment` | `stripe_payments` | Payment records and Stripe IDs |
| `Package` | `packages` | Credit bundle products |
| `PromoCode` | `promo_codes` | Discount / gift codes |
| `PromoRedemption` | `promo_redemptions` | One-per-user redemption tracking |
| `Provider` | `providers` | AI provider registry |
| `Model` | `models` | AI model registry with cost |
| `BlogPost` | `blog_posts` | Blog articles |
| `Conversation` | `conversations` | AI chat sessions |
| `ChatMessage` | `chat_messages` | Chat messages (user/assistant/system) |
| `Message` | `messages` | User to admin messages |
| `Violations` | `violations` | Bad-word filter events |
| `SystemSettings` | `system_settings` | Runtime config key/value store |
| `Session` | `sessions` | Express sessions (database-backed) |
| `QueueLog` | `queue_logs` | Image generation queue events |
| `ApiRequest` | `api_requests` | API call audit log |
| `likes` | `likes` | Image likes |
| `tags` | `tags` | Image tags |
| `prompts` | `prompts` | User prompt history |
| `word_types` | `word_types` | Cached word-type lookups |

All primary keys use **CUID** strings (not auto-increment integers).
Most write-heavy queries are covered by composite indexes. See `prisma/schema.prisma` for the full index set.

---

## 10. Testing

### Unit Tests (Jest)

```bash
npm test                         # All unit tests
npm run test:coverage            # With coverage report
npm run test:unit                # Unit tests only
npm run test:billing:unit        # Billing module tests
npm run test:profile:unit        # Profile module tests
npm run test:admin-queue         # Admin queue tests
```

### Integration Tests

```bash
npm run test:integration         # All integration tests
npm run test:profile:integration # Profile API integration
```

### E2E Tests (Playwright)

```bash
npm run test:e2e                 # All Playwright tests
npm run test:e2e:ui              # Interactive Playwright UI
npm run test:e2e:headed          # Headed browser (visible)
npm run test:e2e:debug           # Debug mode
npm run test:e2e:admin           # Admin-specific E2E suite
npm run test:search:all          # Full search E2E suite (5 specs)
npm run test:e2e:billing         # Billing flows
npm run test:blog                # Blog E2E tests
```

### Code Quality

```bash
npm run lint                     # ESLint check
npm run lint:fix                 # Auto-fix lint errors
npm run lint:strict              # Zero-warning mode
npm run quality                  # Lint strict + test coverage (CI gate)
```

---

## 11. Deployment

### Railway (Recommended)

The project is pre-configured for [Railway](https://railway.app):

```bash
railway up
```

Railway picks up `nixpacks.toml` for build configuration. Environment variables are set in the Railway dashboard.

On startup, `start.sh` automatically:
1. Checks for pending Prisma migrations
2. Applies them if in production mode
3. Generates the Prisma client
4. Starts `node server.js`

### Docker

```bash
# Build
docker build -t image-harvest .

# Run
docker run -p 8080:8080 --env-file .env image-harvest
```

The container runs `npm start` which calls `start.sh`.

### Production Security Checklist

- [ ] `SESSION_SECRET` is set (at least 32 chars, not the example value)
- [ ] `JWT_SECRET` is unique and strong
- [ ] `NODE_ENV=production` is set
- [ ] `STRIPE_WEBHOOK_SECRET` matches your Stripe dashboard
- [ ] HTTPS is enabled (Railway provides this automatically)
- [ ] `R2_PUBLIC_BASE_URL` points to your CDN or custom domain
- [ ] `BASE_URL` matches your production domain (for email links)
- [ ] All AI provider keys are valid and have sufficient quota

---

## 12. Docs Directory

The [`/docs`](docs/) directory contains 200+ in-depth developer documents covering every major system. Key documents:

| Document | What it covers |
|---|---|
| [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Full image generation provider architecture |
| [`API_CONTRACTS.md`](docs/API_CONTRACTS.md) | REST API contract definitions |
| [`SECURITY_FIXES.md`](docs/SECURITY_FIXES.md) | Security audit and all applied fixes |
| [`CLIENT_CSRF_GUIDE.md`](docs/CLIENT_CSRF_GUIDE.md) | How to make CSRF-safe API calls from the browser |
| [`RAILWAY_DEPLOYMENT.md`](docs/RAILWAY_DEPLOYMENT.md) | Railway-specific deployment guide |
| [`MIGRATION.md`](docs/MIGRATION.md) | Database migration strategy and history |
| [`SEARCH_SYSTEM_FINAL_REVIEW.md`](docs/SEARCH_SYSTEM_FINAL_REVIEW.md) | Search system deep dive |
| [`ADMIN_API_DOCUMENTATION.md`](docs/ADMIN_API_DOCUMENTATION.md) | Admin REST API reference |
| [`INFINITE_SCROLL.md`](INFINITE_SCROLL.md) | Infinite scroll implementation notes |
| [`PERFORMANCE_OPTIMIZATIONS.md`](docs/PERFORMANCE_OPTIMIZATIONS.md) | Backend and frontend performance work |
| [`E2E_TESTING_GUIDE.md`](docs/E2E_TESTING_GUIDE.md) | How to write and run E2E tests |
| [`WORD_MATCHING_FLOW.md`](docs/WORD_MATCHING_FLOW.md) | NLP prompt enhancement flow |
| [`IMAGE_FLOW_DIAGRAM.md`](docs/IMAGE_FLOW_DIAGRAM.md) | Full image generation flow diagram |
| [`TROUBLESHOOTING_MIGRATIONS.md`](docs/TROUBLESHOOTING_MIGRATIONS.md) | Common migration issues and fixes |

---

*Built with love by the Image Harvest team.*
