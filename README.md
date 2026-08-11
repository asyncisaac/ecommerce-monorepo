<div align="center">

# 🛒 E-commerce Platform (Full-Stack)

**Production-ready online store with Stripe checkout, race-condition-safe stock & idempotent webhooks**

[![CI](https://img.shields.io/github/actions/workflow/status/asyncisaac/ecommerce-monorepo/ci.yml?style=for-the-badge&label=CI&logo=github)](https://github.com/asyncisaac/ecommerce-monorepo/actions)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![tRPC](https://img.shields.io/badge/tRPC-2596BE?style=for-the-badge&logo=trpc&logoColor=white)](https://trpc.io/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Stripe](https://img.shields.io/badge/Stripe-626CD9?style=for-the-badge&logo=stripe&logoColor=white)](https://stripe.com/)
[![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)

**[🚀 Live Demo](https://your-ecommerce-demo.com)** · **[👤 Demo Login](#-demo-credentials)** · **[⭐ Architecture](#-architecture)** · **[🛠️ Run Locally](#-running-locally)**

</div>

---

> ⚠️ **Screenshots coming soon.** Replace with real product screenshots, cart, checkout, admin dashboard:
> ```
> ![Storefront](https://your-image-host.com/storefront.png)
> ![Product Page](https://your-image-host.com/product-page.png)
> ![Checkout Flow](https://your-image-host.com/checkout.png)
> ![Admin Dashboard](https://your-image-host.com/admin-dashboard.png)
> ```

---

## 🎯 What It Does

A real, production-shape e-commerce monorepo: **Next.js storefront on the frontend, Express + tRPC API on the backend, PostgreSQL with Prisma, and real Stripe checkout**.

This is **not** a React "shopping cart tutorial." The interesting parts are the things that break under real load:

- **Stock concurrency protection** — two users checking out the last item at the same time → one wins cleanly (409 CONFLICT), never negative stock
- **Stripe checkout + webhooks** — paid, expired, and replayed webhooks all handled correctly
- **Idempotent webhook processing** — Stripe sends the same webhook twice? Second one is a no-op
- **Stock reservation + restore on expiry** — when a checkout session expires, reserved stock returns to inventory automatically

### Why I Built This

Every "React e-commerce tutorial" ends at "add to cart." Real stores need to survive:

> "What if 3 people click 'Buy Now' on the last in-stock item **at exactly the same time**?"

> "What if Stripe sends `checkout.session.completed` twice because my API was slow the first time?"

> "What if a user starts checkout and abandons it — when does their reserved stock come back?"

This project answers all three with database-enforced correctness.

---

## 🏗️ Architecture

### High-Level Overview
```mermaid
flowchart TB
    U[Customer Browser] -->|Next.js SSR/CSR| FE[Next.js Frontend<br/>App Router]
    FE -->|tRPC + fetch| API[Express + tRPC Backend]
    API -->|JWT auth + cookies| AUTH[Auth Layer]
    API -->|cart + products + orders| DB[(PostgreSQL<br/>Prisma ORM)]
    API -->|Stripe Checkout Session| STRIPE[Stripe API]
    STRIPE -->|Webhooks (at-least-once delivery)| WEBHOOK[POST /api/webhooks/stripe<br/>stripe-signature verified]
    WEBHOOK -->|DB transaction| DB

    subgraph DB_Safety[Database-enforced correctness]
        direction TB
        STOCK[Stock decrement<br/>UPDATE ... WHERE stock >= qty]
        HOOK[StripeWebhookEvent<br/>UNIQUE(event.id)]
        RESERVE[Order PENDING → stock reserved]
        RESTORE[Order CANCELLED → stock returned<br/>on checkout.session.expired]
    end

    ADMIN[Admin User] -->|Admin routes| API
```

### Critical Checkout Flow (With Race Handling)

```mermaid
sequenceDiagram
    autonumber
    participant C as Customer
    participant API as Backend
    participant DB as Postgres
    participant S as Stripe

    C->>API: POST /api/checkout (items in cart)
    API->>DB: BEGIN TRANSACTION
    API->>DB: INSERT Order (status=PENDING) + OrderItems
    API->>DB: UPDATE Product SET stock = stock - qty<br/>WHERE id = ? AND stock >= qty
    alt Any row affected = 0 (stock race lost)
        DB-->>API: 0 rows updated
        API->>DB: ROLLBACK
        API-->>C: ⚠️ 409 CONFLICT<br/>"Out of stock — someone beat you to it"
    else All stock decrements OK
        API->>DB: DELETE Cart / CartItems
        API->>S: Create Checkout Session (orderId → metadata)
        API->>DB: COMMIT
        API-->>C: 201 { order, checkoutUrl }
        C->>S: Pay via Stripe Checkout
    end

    Note over S,DB: ↓ Webhooks arrive at-least-once (Stripe retries)

    S->>API: webhook checkout.session.completed<br/>(Stripe-Signature verified)
    API->>DB: BEGIN TX
    API->>DB: INSERT StripeWebhookEvent(event.id) [UNIQUE]
    alt UNIQUE violation → duplicate webhook
        API->>DB: ROLLBACK
        API-->>S: 200 OK (duplicate, already processed)
    else First time processing
        API->>DB: UPDATE Order PENDING → PROCESSING<br/>WHERE status = PENDING
        API->>DB: COMMIT
        API-->>S: 200 OK
    end

    Note over S,DB: ↓ Abandoned checkout → stock comes back

    S->>API: webhook checkout.session.expired
    API->>DB: BEGIN TX
    API->>DB: INSERT StripeWebhookEvent(event.id) [UNIQUE]
    API->>DB: UPDATE Order → CANCELLED WHERE status = PENDING
    API->>DB: UPDATE Product SET stock = stock + qty<br/>via OrderItems join
    API->>DB: COMMIT
```

### Engineering Decisions

| Decision | Why |
|----------|-----|
| **`UPDATE ... WHERE stock >= qty` instead of `SELECT` → check → `UPDATE`** | Removes the TOCTOU race. Two concurrent checkouts both execute the same statement — Postgres serializes it; one gets 0 rows. |
| **Stock reserved at checkout, not at payment** | User in the checkout flow shouldn't lose the item to someone else while entering the card. |
| **`checkout.session.expired` restores stock** | No inventory leak from abandoned checkouts. |
| **`StripeWebhookEvent(event.id)` UNIQUE** | Stripe guarantees at-least-once delivery. The DB guarantees at-most-once processing. |
| **Stripe signature verification on webhooks** | Webhook endpoint isn't callable by anyone on the internet. |
| **Whole checkout in one DB transaction** | Partial state is impossible. Either: cart→order→stock→checkout all succeed, or nothing does. |

---

## ✨ Core Features

### 🛍️ Storefront
- Product browsing, search, sort, filter by category
- Product detail page with variants (optional)
- Persistent cart (guest cart → merges on login)
- Real Stripe Checkout page integration
- Order history & order detail view for logged-in users
- Responsive, mobile-first UI

### 🔒 Authentication
- Register / Login / Logout
- JWT access token + httpOnly refresh token (rotating)
- Password hashing (argon2/bcrypt)
- Current user session via `/api/auth/me`

### ⚡ Stock & Checkout (The Hard Parts)
- **Atomic stock decrement** (no `SELECT-then-UPDATE`, no negative stock)
- **Checkout stock reservation** (holds stock during Stripe flow)
- **Automatic stock restore** when Stripe checkout expires
- **409 CONFLICT** response on lost stock race (UX can tell user "someone just bought this")
- Order status machine: `PENDING → PROCESSING → PAID/SHIPPED` (or `CANCELLED`)

### 💸 Stripe Integration
- Server-side Checkout Session creation
- Signed webhook verification (`stripe-signature`)
- Idempotent webhook event processing (by `event.id`)
- Handles three webhook types:
  - `checkout.session.completed` → mark order PAID
  - `checkout.session.expired` → cancel + restore stock
  - `checkout.session.async_payment_failed` → cancel + restore stock

### 🛠️ Admin Panel
- Admin role required (role-based access control)
- Full CRUD on products & categories
- Order listing with status filter
- Create/edit variants, pricing, stock levels

### 📜 Observability
- **Structured JSON logging** (pino) with correlation IDs
- Every log carries, when available: `requestId`, `userId`, `orderId`, `productId`, `stripeEventId`
- `requestId` propagates: HTTP → tRPC context → service layer → logs
- `/healthz` endpoint for load balancer / uptime checks

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14+ (App Router) · React 18 · TypeScript |
| **Backend** | Node.js · Express · tRPC (end-to-end type-safe) |
| **Auth** | JWT (access) · rotating httpOnly refresh cookie · argon2 |
| **Database** | PostgreSQL 15+ · Prisma ORM · transactions · row-level logic |
| **Payments** | Stripe Checkout API + signed webhooks |
| **Validation** | Zod (API + webhook payloads) |
| **Logging** | pino (structured JSON) |
| **Security** | Helmet · CORS · rate-limit · cookie flags |
| **Tests** | Vitest · Supertest (HTTP E2E against real Postgres) |
| **DevOps** | Docker Compose · GitHub Actions CI (lint → test → build) |

---

## 🚀 Live Demo

> ⚠️ **Deploy first, then fill this in.**
>
> | Resource | URL |
> |----------|-----|
> | Storefront | `https://your-ecommerce-demo.com` |
> | Backend API | `https://your-ecommerce-demo.com/api` |
> | Health check | `https://your-ecommerce-demo.com/healthz` |
>
> Stripe is in **test mode** on the demo — use card `4242 4242 4242 4242` + any future date/CVC to test a successful checkout.

---

## 🔑 Demo Credentials

Seed data includes these accounts (when you run the seed):

| Role | Email | Password |
|------|-------|----------|
| 👤 Regular user | `test.user1@example.com` | `senha123` |
| 🛠️ Admin | `admin@example.com` | `admin123` |

---

## ⚙️ Running Locally

### Prerequisites
- Node.js 18+ (recommended 22)
- Docker Desktop (for Postgres)

### 1. Start PostgreSQL
```bash
docker compose up -d
```

### 2. Environment
Copy `.env.example` → `.env` and fill:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ecommerce?schema=public
JWT_SECRET=a_secure_random_string_at_least_16_chars

# Optional — Stripe test mode (checkout falls back to "order only" if unset)
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Install + Database
```bash
npm install
npm --prefix frontend install
npm run db:generate
npm run db:push
npm run seed
```

### 4. Run Everything
```bash
npm run dev:full
```
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001
- **Health**: http://localhost:3001/healthz

---

## 📘 API Overview

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login (returns access token + sets refresh cookie) |
| POST | `/api/auth/logout` | Logout (invalidates refresh) |
| GET  | `/api/auth/me` | Current session |

### Store
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/products` | List products (search, sort, category filter) |
| GET  | `/api/products/:id` | Single product detail |
| GET  | `/api/categories` | All categories |

### Cart (🔒 authenticated)
| Method | Endpoint |
|--------|----------|
| GET  | `/api/cart` |
| POST | `/api/cart/items` |
| PATCH | `/api/cart/items/:itemId` |
| DELETE | `/api/cart/items/:itemId` |

### Orders & Checkout (🔒)
| Method | Endpoint | Notes |
|--------|----------|-------|
| POST | `/api/checkout` | ⚠️ TX: create PENDING order + atomic stock decrement → Stripe Checkout URL or 409 |
| GET  | `/api/orders` | My orders |
| GET  | `/api/orders/:id` | Order detail + items |

### Webhooks
| Method | Endpoint | Notes |
|--------|----------|-------|
| POST | `/api/webhooks/stripe` | Stripe-signed; idempotent (dedup by `event.id`) |

### Admin (🔒🛠️)
- Full CRUD `/api/admin/products` and `/api/admin/categories`

---

## 🧪 Tests

Integration tests hit a **real Postgres database** (no mocking):

```bash
# 1. Start Postgres
docker compose up -d

# 2. Set DATABASE_URL, push schema, seed
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ecommerce?schema=public"
npm run db:push
npm run seed

# 3. Run tests
npm run test
```

### Test Coverage Highlights

| Scenario | What it proves |
|----------|---------------|
| ✅ Register → Login → Me | Auth lifecycle works |
| ✅ Add to cart → Cart summary | Persistent cart correct |
| ✅ **2 concurrent checkouts on last-in-stock item** | **One succeeds (201), one gets 409** → stock never goes negative |
| ✅ Stock decrement + cart cleared in same TX | Partial state impossible |
| ✅ Stripe webhook `completed` → Order PROCESSING | Webhook handler correct |
| ✅ **Same webhook sent twice** (by Stripe) | 2nd is no-op → idempotency by `event.id` |
| ✅ Stripe webhook `expired` → stock restored | No inventory leak on abandoned checkout |
| ✅ Forged Stripe webhook signature → 403 rejected | Webhook integrity enforced |
| ✅ Non-admin hits `/api/admin/products` → 403 | RBAC works |

---

## 🚢 Deployment

### Recommended Stack
| Service | Platform | Notes |
|---------|----------|-------|
| **Next.js Frontend** | Vercel | One-click Next.js deploy, hooks into repo |
| **Express API** | Render / Railway / Fly.io | Node service, port `PORT` |
| **PostgreSQL** | Supabase / Neon / Render Managed | Connection pooling recommended |
| **Stripe Webhook URL** | Point at `https://your-api.com/api/webhooks/stripe` | **Important**: webhook must be registered in Stripe dashboard with matching signing secret |

### Environment Required in Production
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=long_random_string
APP_URL=https://your-store.com
COOKIE_SECURE=true
CORS_ORIGIN=https://your-store.com
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Vercel + Render Setup (Short Version)
1. **Fork/deploy frontend to Vercel** → set NEXT_PUBLIC_API_URL to your backend
2. **Deploy backend to Render** → add `DATABASE_URL`, `JWT_SECRET`, `STRIPE_*` env vars
3. **In Stripe dashboard**: register `https://<render-api>/api/webhooks/stripe` as a webhook endpoint → copy the signing secret
4. **Run migrations**: `npm run db:push` against production DB on first deploy

---

## 📂 Project Structure

```
ecommerce-monorepo/
├── src/                     # Backend (Express + tRPC)
│   ├── server.ts            # HTTP entry + middleware
│   ├── trpc/                # tRPC routers + context
│   ├── routes/              # REST endpoints (auth, webhooks, health)
│   ├── services/            # Business logic (checkout, stock, orders)
│   ├── middleware/          # auth, rbac, requestId, cors, error
│   └── lib/                 # prisma, stripe, pino logger
├── prisma/
│   ├── schema.prisma        # Data model
│   └── seed.ts              # Demo products, users, categories
├── frontend/                # Next.js App Router store
│   └── src/app/
│       ├── (store)/         # home, product, cart, checkout, orders
│       └── (admin)/         # admin dashboard
├── docker-compose.yml       # Postgres dev server
├── package.json
└── .github/workflows/ci.yml # lint → test → build
```

---

## 🧠 Key Engineering Takeaways

1. **Race conditions are real, and SELECT-then-UPDATE is always a bug.** Use conditional `UPDATE ... WHERE` in a transaction, or use `SELECT ... FOR UPDATE` row locking.
2. **Webhooks arrive at-least-once. Plan on it.** Always persist `event.id` UNIQUE before processing, or you'll double-credit / double-ship.
3. **Stock is money.** If you reserve it at checkout, you **must** have a compensating path to return it. (Stripe checkout expiration is a real thing.)
4. **Correlation IDs are not optional for debugging.** `requestId` in every log means "find this customer's failed checkout in 5 seconds" instead of "3 hours grep hell."
5. **Transactions are your unit of correctness.** If multiple tables must change together, they go in one transaction. Partial writes = corrupted state.

---

<div align="center">

**[⬆ Back to Top](#-e-commerce-platform-full-stack)** · Production-shape correctness for real e-commerce.

</div>
