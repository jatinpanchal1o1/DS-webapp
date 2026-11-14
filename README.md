# DropPilot — Dropshipping SaaS foundation

A full-stack, JavaScript-first SaaS foundation upgraded from the supplied starter. It is designed around tenant-owned stores and modular adapters, with a working authentication flow, MongoDB persistence, product/order/supplier APIs, pricing service, PayU hash endpoint, responsive React dashboard, Dockerized data services, demo seeding, and one-command local development.

> **Production status:** This is a deployable engineering foundation, not a claim that every module in the extensive product brief is already implemented. Supplier, Shopify, WooCommerce, carrier, marketplace, tax, AI, subscription billing and hosted checkout connections require provider credentials, compliance work and end-to-end certification. Adapter stubs are explicitly marked; no fake live connections are shown.

## Stack
- React 19 + Vite 7
- Node.js 20+ + Express 5
- MongoDB 7 + Mongoose
- JWT authentication + bcrypt password hashing
- Helmet, CORS allowlist, API rate limiting, structured error responses
- PayU India SHA-512 request hash generation (server-side only)
- Modular supplier / Shopify / WooCommerce connector interfaces
- Docker Compose for MongoDB and Redis

## Quick start (single command for app)

Prerequisites: Node.js 20+, npm 10+, Docker Desktop (or local MongoDB).

```bash
# 1. Start database services
 docker compose up -d

# 2. Configure backend environment
cp backend/.env.example backend/.env
# Set JWT_SECRET to a random value of at least 32 characters.
# Add your own PayU merchant key/salt only to backend/.env if using PayU.

# 3. Install all workspace dependencies
npm install

# 4. Start frontend and backend together
npm run dev
```

Frontend: http://localhost:5173  
API: http://localhost:5000/api/v1  
Health: http://localhost:5000/api/health

The root `npm run dev` command starts both processes together. Stop both with Ctrl+C.

## Demo data

```bash
npm run seed
```

Default demo login: `demo@droppilot.local` / `ChangeMe12345!`. Change this immediately outside local evaluation. Override with `DEMO_EMAIL` and `DEMO_PASSWORD` in `backend/.env` before seeding. Demo records are ordinary database records and should be removed before production.

## API overview

- `POST /api/v1/auth/register` — create account and initial store
- `POST /api/v1/auth/login` — obtain JWT
- `GET|POST /api/v1/stores` — current user's stores
- `GET|POST /api/v1/products` — store-scoped product catalog
- `GET /api/v1/orders` — orders belonging to the user's stores
- `GET|POST|PATCH /api/v1/suppliers` — tenant-owned supplier records
- `GET /api/v1/dashboard/summary` — dashboard aggregates
- `POST /api/v1/payments/payu/hash` — authenticated PayU request hash generation
- `POST /api/v1/payments/payu/return` — PayU response hash verification endpoint

Authenticated endpoints use `Authorization: Bearer <token>`.

## PayU security

The merchant salt is only read by the backend from `PAYU_SALT`. Never put it in Vite variables, frontend source, browser storage or a client bundle. The hash endpoint creates a transaction ID server-side. Configure `PAYU_KEY`, `PAYU_SALT`, `PAYU_BASE_URL`, `PAYU_SUCCESS_URL` and `PAYU_FAILURE_URL` in `backend/.env`. Test in PayU sandbox before enabling live transactions. The return endpoint verifies the response hash but must be extended to reconcile a persisted pending payment/order and enforce idempotency before being used for order settlement.

## Build and tests

```bash
npm run build
npm test
```

## Architecture / next implementation slices

1. Organization membership, invitations, role/permission matrix and explicit tenant context across every model/API.
2. BullMQ workers on Redis for sync, fulfillment, tracking and webhook delivery; idempotency keys and dead-letter queues.
3. Encrypted integration credential vault (KMS/secret manager in production), OAuth callback flows and official platform API certification.
4. Durable supplier order split/fulfillment entities and provider adapters with retry/backoff.
5. Payment intent/transaction/refund ledger and verified webhook-driven state transitions.
6. Subscription billing, usage metering, tax provider integrations and plan enforcement.
7. Audit/event log, observability, backups, retention/deletion workflows and CI/CD deployment pipeline.

## Production deployment checklist

- Use managed MongoDB with TLS, private networking, backups and restore drills.
- Use managed Redis; run API and worker processes separately.
- Set strong secrets via a secret manager; rotate JWT and provider credentials.
- Set exact production `CLIENT_URL`; terminate HTTPS at a trusted ingress/CDN.
- Add email verification, password reset, MFA, session revocation and account recovery before public launch.
- Add tenant membership authorization (not only owner scoping) before inviting team members.
- Add integration tests against supplier/payment sandbox accounts and webhook replay/idempotency tests.
- Add Sentry/OpenTelemetry, metrics, alerting, WAF and security review.
- Complete privacy, tax, consumer protection and payment-provider compliance for target markets.

## Customer storefront + PayU checkout

The project now includes a public customer-facing storefront. Published products can be opened at:

`http://localhost:5173/shop/<store-slug>`

The storefront supports product browsing, cart quantities, customer checkout details, server-side order creation, PayU hash generation, PayU redirect, and verified payment return handling. The PayU salt never reaches the browser.

### PayU configuration

Create `backend/.env` from `.env.example` and set your **merchant key** and **merchant salt** there. Do not paste the salt into React/Vite code or commit it to Git. Use PayU sandbox credentials and endpoint while testing, then switch to the live credentials/endpoints only after your merchant account and callback URLs are configured.

The payment flow is:

1. Customer adds published products to cart.
2. Backend validates product, variant and inventory and creates a pending order.
3. Backend generates the PayU SHA-512 hash using the exact field sequence.
4. Browser posts the payment form to PayU.
5. PayU returns to the backend callback.
6. Backend verifies the reverse hash and updates the order payment status.
7. Customer is redirected to the frontend payment result screen.

For production, add idempotent payment settlement, atomic inventory decrement, webhook/reconciliation handling, shipping/tax calculation, fraud/risk controls, and email/SMS order notifications before processing real volume.

## Public customer storefront

Every active store has a public customer-facing route that does **not** require a customer account:

```text
http://localhost:5173/shop/<store-slug>
```

For example, after running the demo seed, open the `slug` printed/created for the Demo Store (the slug includes the demo owner's ID suffix). The public storefront supports product browsing, text search, category filtering, price sorting, product/variant detail, a client-side cart and guest checkout. Only products with `status: "published"` are shown. The checkout endpoint validates published products and inventory on the server and then redirects to PayU; it returns a clear configuration error until valid PayU credentials are configured.

The `/shop/:slug` and `/payment/result` frontend routes are deliberately evaluated before the dashboard login check. The SaaS dashboard remains authenticated. Do not put customer login in front of the public catalog.

Public catalog API: `GET /api/v1/storefront/:slug` (optional `q`, `category` query parameters). This endpoint is intentionally unauthenticated and returns only published products belonging to the active store.

## Supplier network, fulfillment connectors and product ingestion

The platform now includes a provider registry and a credential-vault-backed integrations workspace for CJ Dropshipping, Amazon FBA/Multi-Channel Fulfillment, Zendrop, Spocket, AliExpress, ShipBob, ShipMonk, DSers and SaleHoo. Provider cards show the intended capabilities, documentation link and connection state. Credentials are encrypted at rest using AES-256-GCM; set `CREDENTIAL_ENCRYPTION_KEY` to a random secret of at least 32 characters and keep it outside source control.

### Connector implementation status (read before enabling production)

- **CJ Dropshipping:** API-key authentication and product catalogue search/import are implemented against CJ API 2.0. Imported products are drafts, with a starter 2.2x markup that must be reviewed before publication. CJ's API requires an API key, server-side token caching and the `CJ-Access-Token` header. See [CJ developer docs](https://developers.cjdropshipping.com/en/api/introduction.html).
- **ShipBob:** credential capture and a live API authentication probe are implemented. Order creation, inventory mapping, webhook verification and tracking sync still need to be wired and tested against the merchant's sandbox/account. See [ShipBob developer docs](https://developer.shipbob.com/introduction).
- **Amazon FBA/MCF:** the connection form stores the required seller app/LWA fields, but the OAuth authorization, SP-API signing, region routing and production approval flow are not yet implemented. Do not mark it live until these are complete. See [Amazon SP-API onboarding](https://developer-docs.amazon.com/sp-api/docs/onboarding-overview).
- **Zendrop, Spocket, AliExpress, ShipMonk, DSers and SaleHoo:** provider definitions, credential fields, capability metadata and documentation links are included. Their API adapters must be completed using the access level, partner approval and current API contract granted to your account. The UI deliberately labels these as partner/approval-required instead of claiming a live connection.

### Import products

The authenticated product page includes a CSV/XLSX import tool. Uploads are limited to 12 MB and 5,000 product rows. Imports are created as drafts by default. Expected headers include `title`, `description`, `sku`, `costPrice`, `sellingPrice`, `inventory`, `category`, `image` and `tags`. XLSX parsing is handled by a small server-side ZIP/XML reader, so no spreadsheet runtime dependency is required.

### Push products with your own script

1. Open Products → Product import studio and generate a store import key.
2. Copy the key immediately; only its SHA-256 hash is stored by DropPilot.
3. Send JSON to `POST /api/v1/import/products/<store-slug>` with `X-DropPilot-Key` header.
4. Send one product or `{ "products": [...] }` (maximum 500 per request). Use a stable `externalId` to upsert product records.

Example:

```js
const response = await fetch('https://YOUR_API_HOST/api/v1/import/products/YOUR-STORE-SLUG', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-DropPilot-Key': process.env.DROPPILOT_IMPORT_KEY
  },
  body: JSON.stringify({
    products: [{
      externalId: 'SUP-1001',
      title: 'Wireless Desk Lamp',
      sku: 'LAMP-01',
      costPrice: 12.5,
      sellingPrice: 29.99,
      inventory: 80,
      category: 'Home & Living',
      imageUrl: 'https://example.com/lamp.jpg'
    }]
  })
});
const result = await response.json();
```

Never expose this key in browser code or public repositories. Rotate/revoke it by deleting the corresponding key from the store's `apiKeys` collection or add a dedicated key-management UI before public multi-user launch.

### API endpoints

- `GET /api/v1/integrations/providers` — provider catalogue and capabilities.
- `GET /api/v1/integrations` — current user's integration connections.
- `POST /api/v1/integrations/:providerId/connect` — save encrypted credentials and run supported provider auth test.
- `POST /api/v1/integrations/:id/test` — retest supported live connector.
- `POST /api/v1/integrations/:id/sync-products` — CJ Dropshipping catalogue search/import (draft products).
- `POST /api/v1/import/products/file` — authenticated CSV/XLSX import (multipart field `file`, plus `storeId`).
- `POST /api/v1/import/script-key` — generate a store-specific product-ingestion key.
- `POST /api/v1/import/products/:storeSlug` — API/script product upsert using `X-DropPilot-Key`.

### Install / environment

```bash
npm install
```

Set both `JWT_SECRET` and `CREDENTIAL_ENCRYPTION_KEY` in `backend/.env` to different, randomly generated secrets. The `.env.example` intentionally contains no real payment/provider credentials. Do not reuse any API key, PayU salt or database password that was previously committed or shared in a project archive; rotate those values before deployment.

**Production gap:** This is an expanded implementation foundation, not a claim that every named provider is already live. Before real order volume, implement the remaining official provider OAuth/API contracts, fulfillment queues, webhook signature verification, idempotency, retries, reconciliation, tenant roles, audit logs, rate-limit policies, monitoring and sandbox acceptance tests. Provider API permissions and access are controlled by each provider.
