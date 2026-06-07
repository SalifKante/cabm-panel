# CLAUDE.md — CABM Panel (Backend + Admin)

## Project Overview

**CABM (Complexe Agro Business Mali)** is a professional agro-business e-commerce platform. This repo contains TWO projects:

1. **`backend/`** — Node.js/Express/MongoDB REST API serving both the client frontend and admin panel
2. **`cabm-admin/`** — Vite + React admin panel for managing products, activities, services, orders, blog, and users

The client-facing frontend lives in a separate repo (`cabm/`).

## Business Context

CABM operates in West Africa (Mali) where **WhatsApp is the dominant commerce channel**. The platform lets customers:
1. Browse products on the website
2. Build a cart
3. Submit an order that generates a **pre-filled WhatsApp message** to the seller
4. Negotiate payment (Orange Money, Moov, Wave, cash on delivery) and delivery via WhatsApp

There is **no payment processing on the website**. The website captures order intent and bridges to WhatsApp.

---

# BACKEND (`backend/`)

## Tech Stack

- **Runtime:** Node.js with Express 5
- **Database:** MongoDB Atlas via Mongoose 8
- **Auth:** JWT (httpOnly cookies) + Argon2 password hashing + Passport.js (Google OAuth)
- **File uploads:** Multer + Cloudinary
- **Email:** Nodemailer (SMTP) / Resend SDK
- **Security:** Helmet, CORS whitelist, express-rate-limit, express-mongo-sanitize, express-validator
- **Deployment:** Vercel (migrating to Railway)

## Architecture

```
backend/
├── src/
│   ├── config/
│   │   ├── cloudinary.js      # Cloudinary SDK config
│   │   ├── mongodb.js         # Mongoose connection with error handling
│   │   └── passport.js        # Google OAuth strategy (guarded if env missing)
│   ├── controllers/
│   │   ├── activityController.js  # CRUD activities + public list/detail
│   │   ├── adminController.js     # Admin login (legacy — aToken JWT)
│   │   ├── authController.js      # register/login/verify/reset/google/me/logout
│   │   ├── blogController.js      # posts, categories, comments, subscribers
│   │   ├── contactController.js   # contact form submission
│   │   ├── orderController.js     # order intent + WhatsApp + admin mgmt
│   │   ├── productController.js   # CRUD products + public list/detail
│   │   └── serviceController.js   # CRUD services
│   ├── emails/
│   │   └── templates.js       # All HTML+text email templates (Phase 10)
│   ├── middleware/
│   │   ├── auth.js            # requireAdminAny + requireVerified (User model)
│   │   ├── authAdmin.js       # Legacy admin auth (aToken header) — still used by admin panel
│   │   ├── multer.js          # Memory storage, image filter, 8MB limit
│   │   ├── sanitize.js        # Custom XSS strip (sanitize-html) — skips multipart
│   │   └── upload.js          # Cloudinary storage for activities
│   ├── models/
│   │   ├── AdminUser.js       # Legacy admin (email, passwordHash, role) — kept
│   │   ├── activityModel.js   # Activity (+ isPublished)
│   │   ├── categoryModel.js   # Blog category (name, slug, description)
│   │   ├── commentModel.js    # Blog comment (postId, userId, parentId, status)
│   │   ├── contactModel.js    # Contact message (name, email, phone, message)
│   │   ├── orderModel.js      # Order (+ Counter for CABM-YYYY-NNNNN)
│   │   ├── postModel.js       # Blog post (slug auto-gen, status, likes[], views)
│   │   ├── productModel.js    # Product (+ price, currency, unit, deliveryDetails, stock, category)
│   │   ├── serviceModel.js    # Service (title, desc, icon, order, isActive)
│   │   ├── subscriberModel.js # Newsletter subscriber (email, unsubscribeToken)
│   │   └── userModel.js       # User (name, email, role, googleId, isVerified, tokens…)
│   ├── routes/
│   │   ├── adminRoute.js      # Legacy admin CRUD under /api/admin (authAdmin)
│   │   ├── activityRoute.js   # Public activities under /api/activities
│   │   ├── authRoute.js       # Auth under /api/auth (cookie JWT + Google)
│   │   ├── blogRoute.js       # Blog under /api/blog (public/protected/admin)
│   │   ├── contactRoute.js    # Contact under /api/contact (rate limited)
│   │   ├── orderRoute.js      # Orders under /api/orders
│   │   ├── productRoute.js    # Public products under /api/products
│   │   ├── publicRoute.js     # Public services under /api/public
│   │   └── serviceRoute.js    # (empty — service routes live in adminRoute)
│   ├── utils/
│   │   ├── auth.js            # hash/verify password, sign/verify JWT, token + cookie helpers
│   │   ├── cloudinary.js      # Cloudinary instance export
│   │   ├── mailer.js          # Nodemailer transporter + sendMail(to, subj, html, text)
│   │   ├── queryBuilder.js    # getPagination / buildSearchFilter / paginate / meta
│   │   ├── seedAdmin.js       # ensureAdminFromEnv() — creates admin on first run
│   │   └── whatsapp.js        # generateWhatsAppLink(order) + message builder
│   ├── validators/
│   │   └── productValidators.js  # express-validator chains + runValidations
│   └── server.js              # Express app entry point (security stack + routes + error handler)
├── .env                       # Environment variables (NEVER commit)
├── .env.example               # Documented env template
├── package.json
└── vercel.json                # Vercel deployment config
```

**Auth note:** two auth systems currently coexist. The **legacy** path
(`/api/admin/login` → JWT in the `aToken` request header, `authAdmin` middleware)
is what the **admin panel still uses**. The **new** Phase 6 system
(`/api/auth/*` → JWT in an httpOnly `access_token` cookie, `requireAuth`/`requireAdmin`/
`requireVerified` against the `User` model) powers the client site.

**`middleware/adminBridge.js` (`requireAdminAny`)** bridges the two so the same
endpoint works for both clients. It tries **Path A** (cookie/Bearer JWT → `User`
with role `admin`) and, failing that, **Path B** (the legacy `aToken` header). For
Path B it verifies the JWT and matches the real legacy token — the string
`ADMIN_EMAIL + ADMIN_PASSWORD` (what `adminController.adminLogin` signs and
`authAdmin` checks) — then resolves a backing admin `User` (so `req.user.id` is a
valid ObjectId for handlers like blog `createPost`), falling back to `AdminUser`.
It also supports a future `{ id, email }`/email-string legacy payload via
`AdminUser`. On success it sets `req.user`; if both paths fail it returns
`401 { ok: false, error: "Authentication required" }`.

The **order and blog admin endpoints now use `requireAdminAny`**, so they accept
**both** auth systems (legacy `aToken` from the admin panel *and* cookie JWT from
the client). `adminRoute.js` and `authAdmin` are unchanged. Fully migrating the
admin panel onto the cookie system remains optional/pending.

## Current API Endpoints

### Admin Routes (`/api/admin`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/login` | No | Admin login (legacy JWT) |
| POST | `/create-activity` | authAdmin | Create activity with images |
| POST | `/all-activities` | No | List all activities |
| GET | `/activity/:id` | No | Get single activity |
| DELETE | `/activity/:id` | authAdmin | Delete activity |
| GET | `/activities-count` | authAdmin | Count activities |
| POST | `/create-product` | authAdmin | Create product with images |
| POST | `/all-products` | No | List all products |
| PUT | `/product/:id` | authAdmin | Update product |
| DELETE | `/product/:id` | authAdmin | Delete product |
| GET | `/products-count` | authAdmin | Count products |
| PATCH | `/product/:id/status` | authAdmin | Toggle product isActive |
| GET | `/all-services` | authAdmin | List all services |
| POST | `/create-service` | authAdmin | Create service |
| PATCH | `/service/:id` | authAdmin | Update service |
| PATCH | `/service/:id/status` | authAdmin | Toggle service isActive |
| DELETE | `/service/:id` | authAdmin | Delete service |
| GET | `/services-count` | authAdmin | Count services |

### Public Products (`/api/products`) — Phase 2
| Method | Path | Description |
|---|---|---|
| GET | `/` | Paginated active products; `?q=` search (title/desc/category), `?category=`, `?page=`, `?limit=` |
| GET | `/:id` | Single active product by id |

### Public Activities (`/api/activities`) — Phase 3
| Method | Path | Description |
|---|---|---|
| GET | `/` | Paginated published activities; `?q=` (title/desc/tags), `?page=`, `?limit=`; sorted by date desc |
| GET | `/:id` | Single published activity by id |

### Public Services (`/api/public`)
| Method | Path | Description |
|---|---|---|
| GET | `/services` | List active services |

### Contact (`/api/contact`) — Phase 5
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | No (rate-limited 5/15min) | Validate + save message, email admin |

### Auth (`/api/auth`) — Phase 6 (httpOnly cookie JWT)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | No (10/15min) | Create user, send verification email |
| GET | `/verify-email/:token` | No | Mark `isVerified = true` |
| POST | `/login` | No (10/15min) | Set `access_token` cookie, return user |
| POST | `/forgot-password` | No (5/15min) | Generate reset token, email it |
| POST | `/reset-password/:token` | No | Validate token, set new password |
| POST | `/logout` | No | Clear cookie |
| GET | `/me` | requireAuth | Current user |
| GET | `/google` | No (guarded) | Google OAuth redirect (503 if unconfigured) |
| GET | `/google/callback` | No (guarded) | Google callback → set cookie → redirect to frontend |

### Orders (`/api/orders`) — Phase 7
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | No (10/15min) | Create order intent; recompute totals server-side; return `orderNumber` + `whatsappUrl` |
| GET | `/:orderNumber` | No | Fetch order by number |
| GET | `/admin` | requireAdminAny | List orders; `?status=`, `?q=` (number/phone), pagination |
| PATCH | `/admin/:id/status` | requireAdminAny | Update order status (enum-validated) |
| GET | `/admin/stats` | requireAdminAny | Counts by status + delivered revenue |

### Blog (`/api/blog`) — Phase 8
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/posts` | No | Paginated published posts; `?category=<slug>`, `?tag=`, `?q=` |
| GET | `/posts/:slug` | No | Single published post (increments views) |
| GET | `/posts/:slug/comments` | No | Approved comments (threaded) |
| GET | `/categories` | No | All categories |
| GET | `/unsubscribe/:token` | No | Deactivate a subscriber |
| POST | `/posts/:slug/comments` | requireAuth + requireVerified | Create comment (pending) |
| POST | `/posts/:slug/like` | requireAuth + requireVerified | Toggle like |
| POST | `/subscribe` | requireAuth + requireVerified | Subscribe to blog notifications |
| DELETE | `/comments/:id` | requireAuth + requireVerified | Delete own comment |
| POST | `/posts` | requireAdminAny | Create post (cover via multipart) |
| PUT | `/posts/:id` | requireAdminAny | Update post (optional cover) |
| DELETE | `/posts/:id` | requireAdminAny | Delete post (+ its comments) |
| PATCH | `/posts/:id/publish` | requireAdminAny | Publish + subscriber email blast |
| GET | `/admin/comments` | requireAdminAny | List pending comments |
| PATCH | `/admin/comments/:id/approve` | requireAdminAny | Approve comment (+ author email) |
| DELETE | `/admin/comments/:id` | requireAdminAny | Delete any comment |

### Infrastructure
| Method | Path | Description |
|---|---|---|
| GET | `/` | Basic health check ("API is running…") |

> **Note:** `/api/health` is referenced in older docs but is **not yet implemented** — only `GET /` exists. A 404 handler and a global error handler (`{ success, message, code, errors?, stack? }`) are wired in `server.js`.

## Backend Implementation Status

**Phases 2–11 are implemented.** Status summary:

| Phase | Area | Status |
|---|---|---|
| 2 | Products API (e-commerce fields, public routes, validation, pagination) | ✅ Done |
| 3 | Activities API (`isPublished`, public routes, pagination) | ✅ Done |
| 4 | Services API (try/catch all handlers, consistent shape) | ✅ Done |
| 5 | Contact endpoint (model, route, rate limit, email) | ✅ Done |
| 6 | Auth system (User model, register/login/verify/reset/Google, cookie JWT, middleware) | ✅ Done |
| 7 | Orders + WhatsApp checkout (model, counter, server-side totals, admin mgmt, stats) | ✅ Done |
| 8 | Blog (Post/Category/Comment/Subscriber, public/protected/admin routes, subscriber blast) | ✅ Done |
| 10 | Email templates (`src/emails/templates.js`, used by contact/auth/order/blog controllers) | ✅ Done |
| 11 | Security hardening (helmet, mongo-sanitize, XSS strip, morgan, trust proxy, error/404 handlers) | ✅ Done |

**Still pending on the backend:**
- Resend SDK as primary email provider (currently nodemailer SMTP only).
- `/api/health` JSON endpoint with uptime (only `GET /` exists today).
- Express-5 note: `express-mongo-sanitize` needs the `req.query` writable shim in `server.js` (already wired) because Express 5 made `req.query` getter-only.
- Per-user email notification preferences (only blog `Subscriber` has unsubscribe).

The original phase specifications below are retained for reference (now implemented):

### Phase 2: Products API cleanup
- **Update Product model** — add fields: `price` (Number), `currency` (default "XOF"), `unit` (String, e.g. "kg", "pièce"), `deliveryDetails` (String), `stock` (Number, optional), `category` (String)
- **Create public routes:**
  - `GET /api/products` — paginated, search, filter by category, returns only isActive
  - `GET /api/products/:id` — single product (public)
- **Add** input validation with express-validator
- **Add** pagination helper (page, limit, total, totalPages)
- **Keep** admin routes unchanged for backward compatibility

### Phase 3: Activities API cleanup
- **Update Activity model** — add `isPublished` (Boolean, default true)
- **Create public routes:**
  - `GET /api/activities` — paginated, search, only isPublished
  - `GET /api/activities/:id` — single activity (public)
- **Add** validation and pagination

### Phase 4: Services API cleanup
- **Add** validation to create/update service controllers
- **Add** error handling (try/catch in all handlers)
- **Ensure** consistent response shape: `{ success, data?, message?, pagination? }`

### Phase 5: Contact endpoint
- **Create** `ContactMessage` model (name, email, phone, message, createdAt)
- **Create** `POST /api/contact` — validate input, save message, email admin via nodemailer
- **Add** rate limiting (5 requests per 15 minutes per IP)

### Phase 6: Authentication system
- **Extend/replace** AdminUser model → `User` model:
  - name, email, phone, passwordHash, role (user|admin), googleId, isVerified, verificationToken, resetPasswordToken, resetPasswordExpires, avatar, bio, timestamps
- **Create routes** under `/api/auth/`:
  - `POST /register` — hash password, create user, send verification email
  - `GET /verify-email/:token` — mark isVerified = true
  - `POST /login` — validate credentials, return JWT in httpOnly cookie
  - `GET /google` — Google OAuth redirect
  - `GET /google/callback` — Google callback, find/create user, set cookie
  - `POST /forgot-password` — generate reset token, email it
  - `POST /reset-password/:token` — validate token, hash new password
  - `POST /logout` — clear cookie
  - `GET /me` — return current user (protected)
- **Middleware:** `protect` (verify JWT cookie), `requireAdmin`, `requireVerified`
- **Rate limit** `/register`, `/login`, `/forgot-password`

### Phase 7: E-commerce / Orders
- **Create** `Order` model:
  - orderNumber (unique, e.g. "CABM-2026-00045")
  - customer: { name, phone, email, location, note, userId (optional ref) }
  - items: [{ productId, productName, price, unit, quantity, lineTotal }]
  - subtotal, deliveryEstimate, total, currency (default "XOF")
  - status: pending | contacted | confirmed | delivered | cancelled
  - whatsappSentAt (Date), timestamps
- **Create routes** under `/api/orders/`:
  - `POST /` — create order intent, validate products, compute totals server-side, return orderNumber + WhatsApp URL
  - `GET /:orderNumber` — fetch order status (public)
  - `GET /admin` — list orders with status filter, pagination (admin)
  - `PATCH /admin/:id/status` — update order status (admin)
  - `GET /admin/stats` — dashboard stats (admin)
- **WhatsApp helper:** `generateWhatsAppLink(order)` returns pre-filled WhatsApp URL
  - Phone: `22373879656`
  - Message format with order number, items table, totals, customer info
- **Validation:** prevent ordering inactive products, validate stock, recompute totals server-side (NEVER trust client totals)

### Phase 8: Blog API
- **Create models:**
  - `Post` (title, slug, excerpt, content, coverImage, category, tags[], status: draft|published, author, views, likes[], publishedAt, timestamps)
  - `Category` (name, slug, description)
  - `Comment` (postId, userId, content, parentId, status: pending|approved, timestamps)
  - `Subscriber` (email, isActive, unsubscribeToken, timestamps)
- **Create routes** under `/api/blog/`:
  - PUBLIC: `GET /posts`, `GET /posts/:slug`, `GET /categories`, `GET /posts/:slug/comments`
  - PROTECTED: `POST /posts/:slug/comments`, `DELETE /comments/:id`, `POST /posts/:slug/like`, `POST /subscribe`, `GET /unsubscribe/:token`
  - ADMIN: `POST /posts`, `PUT /posts/:id`, `DELETE /posts/:id`, `PATCH /posts/:id/publish`, `GET /admin/comments`, `PATCH /comments/:id/approve`, `DELETE /comments/:id`
- **On publish:** queue email blast to active subscribers

### Phase 10: Email system
- **Create** `/src/emails/` with HTML templates:
  - Welcome + verification
  - Password reset
  - Contact form received (admin notification)
  - Order intent received (admin notification)
  - Order status updated (customer)
  - New post notification (subscribers)
  - Comment approved (author notification)
- **All templates:** inline CSS, primary-900 background, accent amber CTA, Manrope font with web-safe fallback, plain-text fallback
- **Use** Resend as primary, nodemailer SMTP as fallback

### Phase 11: Security hardening
- **Global middleware** (in this order): helmet, cors, express-rate-limit, morgan, express.json (10kb), express-mongo-sanitize
- **Custom XSS sanitization** middleware using sanitize-html (replaces deprecated xss-clean)
- **All input** validated with express-validator or zod
- **Global error handler:** `{ success: false, message, code, stack (dev only) }`
- **404 handler** (already exists)
- **Admin routes** always behind `protect` + `requireAdmin`
- **Reusable** `queryBuilder` utility for pagination/search/sort
- **`/api/health`** endpoint (already exists)

## Core Constraints

- **Never store JWT in localStorage** — only httpOnly cookies
- **Never hardcode secrets** — always use `process.env.*`
- **Never trust client totals** — always recompute prices server-side in order flow
- **Never break existing API contracts** — admin panel depends on current endpoint signatures
- **Always validate input** with express-validator before processing
- **Always return** consistent response shape: `{ success: boolean, data?: any, message?: string, pagination?: object }`
- **Always use async/await** with try/catch in controllers
- **Always return complete files** — never partial snippets

## Environment Variables

```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net
MONGODB_DB_NAME=cabmsarl

# Server
PORT=3033

# CORS — comma-separated allowed origins
CORS_ORIGINS=https://www.cabmsarl.org,https://admin.cabmsarl.org,http://localhost:3030

# Admin seed
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=strong-password-here

# Cloudinary
CLOUDINARY_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# JWT / Cookies
JWT_SECRET=generate-64-char-random-string
JWT_EXPIRES=1h
COOKIE_SECURE=true
COOKIE_DOMAIN=.cabmsarl.org

# Email (Phase 10)
RESEND_API_KEY=re_xxxx
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=cabmsarl2022@gmail.com
SMTP_PASS=app-password-here

# Google OAuth (Phase 6)
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxx
GOOGLE_CALLBACK_URL=https://api.cabmsarl.org/api/auth/google/callback
```

## Contact Info

```
Phone:    +223 73 87 96 56
Email:    cabmsarl2022@gmail.com
WhatsApp: 22373879656 (used in order WhatsApp deep-links)
Address:  Bamako, Garantiguibougou, Nérécoro, Mali
```

## Commands

```bash
cd backend/
npm run dev      # Start with nodemon (localhost:3033)
npm start        # Production start
```

---

# ADMIN PANEL (`cabm-admin/`)

## Tech Stack

- **Framework:** React 19.1 with Vite 7
- **Styling:** Tailwind CSS 3.4 (same design tokens as client frontend)
- **Icons:** Lucide React + React Icons
- **HTTP:** Axios
- **Toasts:** React Toastify
- **Deployment:** Cloudflare Pages

## Current Architecture

```
cabm-admin/
├── src/
│   ├── admin/utils/
│   │   └── suggestIcon.js     # Icon suggestion helper
│   ├── components/
│   │   ├── IconPicker.jsx     # Service icon picker
│   │   ├── Navbar.jsx         # Admin navbar
│   │   ├── ServiceForm.jsx    # Service create/edit form
│   │   └── Sidebar.jsx        # Admin sidebar navigation
│   ├── context/
│   │   ├── AdminContext.jsx   # Auth state + API calls
│   │   └── AppContext.jsx     # App-level state
│   ├── pages/
│   │   ├── Login.jsx          # Admin login
│   │   └── Admin/
│   │       ├── Dashboard.jsx      # Admin dashboard
│   │       ├── ActivityList.jsx   # Activities management
│   │       ├── AddActivity.jsx    # Create activity
│   │       ├── ProductList.jsx    # Products management
│   │       ├── AddProduct.jsx     # Create product
│   │       ├── EditProduct.jsx    # Edit product
│   │       └── ServiceTable.jsx   # Services management
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env.development           # VITE_BACKEND_URL=http://localhost:3033
├── .env.production            # VITE_BACKEND_URL=https://cabm-panel.vercel.app
├── tailwind.config.js         # Same design tokens as client
└── package.json
```

### Routing (`App.jsx`)

Auth-gated single-layout app: when `aToken` exists, renders `Navbar` + `Sidebar` +
routed `<main>`; otherwise renders `<Login>`. Current routes:

| Path | Page | Notes |
|---|---|---|
| `/`, `/dashboard` | `Dashboard` | Counts for activities/products/services |
| `/add-activity` | `AddActivity` | Create activity (multipart) |
| `/activities` | `ActivityList` | List/delete activities |
| `/products/add` | `AddProduct` | Create product (now incl. e-commerce fields) |
| `/products` | `ProductList` | List/toggle/delete; shows price/category/stock |
| `/edit-product/:id` | `EditProduct` | Edit product (incl. e-commerce fields) |
| `/services` | `ServiceTable` | List/create/edit/toggle/delete (modal `ServiceForm`) |

### Auth & state

- **`AdminContext`** holds `aToken` (persisted in `localStorage`), `backendUrl`
  (`VITE_BACKEND_URL`), and an `activity` cache. Login posts to
  `POST /api/admin/login`; the returned JWT is stored as `aToken` and sent on every
  request via the **`aToken` request header** (legacy `authAdmin` path — not the
  cookie system). `Navbar` logout clears `localStorage` and reloads.
- **`AppContext`** is currently an empty placeholder.
- The admin panel talks **only to `/api/admin/*`** endpoints today (legacy CRUD).
  Orders/blog admin endpoints (cookie-auth) are not yet wired into the panel.

### Product forms — e-commerce fields (Phase 2 UI, done)

`AddProduct` and `EditProduct` send `price`, `currency` (fixed `"XOF"`, shown as a
non-editable label), `unit`, `stock` (optional — omitted from the request when
blank), `category`, and `deliveryDetails` alongside the existing title/description/
images. `ProductList` shows formatted price, category, and stock (`—` when not
tracked) in both the table and mobile cards.

## Remaining Admin Panel Work

### Phase 7: E-commerce admin
- ✅ **Done** — Product management with price/unit/stock/category/deliveryDetails
  fields (`ProductList` shows price/category/stock; `AddProduct` `/products/add`
  and `EditProduct` `/edit-product/:id` include the e-commerce fields).
- ⬜ **Pending** — `/admin/orders` orders dashboard (table with status filters,
  search, status update) backed by `GET /api/orders/admin` + `PATCH .../status`.
- ⬜ **Pending** — `/admin/orders/:id` order detail with full customer info.
- ⬜ **Note** — orders endpoints use the **cookie-JWT** auth (`requireAuth`/
  `requireAdmin`), so wiring them requires either migrating the panel to the cookie
  system or adding an admin login through `/api/auth/login`.

### Phase 8-9: Blog admin — ⬜ Pending
- `/admin/blog` — Post management table with status badges
- `/admin/blog/new` — TipTap rich text editor (title, slug, excerpt, content, cover, category, tags, status)
- `/admin/blog/:id/edit` — Pre-populated editor
- `/admin/comments` — Comment moderation queue (approve/reject) via `GET /api/blog/admin/comments`
- Backend blog admin endpoints exist (Phase 8) and use cookie-JWT auth.

### Phase 12: Admin improvements — ⬜ Pending
- Stats dashboard with charts (orders, revenue, products, visitors) — `GET /api/orders/admin/stats` available
- User management (list users, change roles, ban)
- Migrate admin panel auth from the legacy `aToken` header to the cookie-JWT
  (`/api/auth`) system so it can call the order/blog admin endpoints.

## Design System

Same as client frontend:
```
Primary:    #166534 (forest green)
Accent:     #f59e0b (amber)
Font:       Manrope
```

The admin panel should have a **clean, functional, data-dense** UI — less marketing aesthetic, more dashboard efficiency. But still use the same color palette and typography for brand consistency.

## Admin Commands

```bash
cd cabm-admin/
npm run dev      # Start dev server
npm run build    # Production build
```

---

## Deployment

| Project | Platform | Domain |
|---|---|---|
| Client frontend (`cabm/`) | Cloudflare Pages | www.cabmsarl.org |
| Backend (`backend/`) | Vercel → Railway | api.cabmsarl.org / cabm-panel.vercel.app |
| Admin panel (`cabm-admin/`) | Cloudflare Pages | admin.cabmsarl.org |

## Git Repos

- `cabm/` — own GitHub repo (client frontend)
- `cabm-panel/` — own GitHub repo (contains both `backend/` and `cabm-admin/`)