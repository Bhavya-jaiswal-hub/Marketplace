# Backend Coding Plan

## Purpose

This document is the execution tracker for implementing the confirmed Version 1 marketplace. The client clarification document defines what the system must do. The related entity, database, API, workflow, and feature documents define how each capability should behave.

## Working Rules

- Implement one phase at a time.
- Before coding a phase, read the phase context listed below and its dependent entity/API documents.
- Keep business rules inside module services, not only in controllers.
- Every protected operation must enforce authentication, authorization, ownership, validation, and safe error handling.
- Every financial or inventory operation must define idempotency, audit effects, concurrency behavior, and historical snapshots.
- A phase is complete only after implementation, migrations, focused tests, authorization tests, and documentation updates pass.
- Do not implement Version 1 exclusions: variant-level differential pricing, multi-category products, footwear/accessories (V2), Cash on Delivery, automated courier API integration, automated seller payouts, coupons, reviews, chat, subscriptions, or mobile applications.

## Phase 0: Technology and Project Bootstrap

**Status:** Complete

### Context to read

- `docs/decisions/Multi_Vendor_Marketplace_Client_Clarification_Completed.md`
- `docs/decisions/implementation-baseline.md`
- `docs/architecture.md`
- `docs/database-design.md`
- `docs/api-design.md`
- `docs/adr/ADR-003-database-selection.md`
- `docs/adr/ADR-005-deployment-strategy.md`

### Approved stack

- Backend: Node.js with TypeScript, NestJS, and the Fastify adapter.
- Database: PostgreSQL.
- ORM/migrations: Prisma.
- Tests: Jest with API integration tests.
- Object storage: private Amazon S3 for seller verification documents.
- Email: Amazon SES.
- Background jobs: Redis-backed worker or AWS-native queue, selected during deployment design.
- Payment gateway: Razorpay.

### Deliverables

- Approved technology decision and completed ADRs.
- Backend repository structure and module boundaries.
- Environment configuration and secret-loading strategy.
- Database connection and migration workflow.
- Health endpoint, structured logging, standard error envelope, and test runner.
- Local development instructions.

### Completion checks

- Application starts locally from a clean checkout.
- Database migration and rollback/recovery process is documented.
- Health check and one example API test pass.
- Secrets are not committed or logged.

### Phase 0 result

The backend foundation is implemented in `backend/`. PostgreSQL, Prisma, NestJS, Fastify, TypeScript, and Jest are configured. Prisma Client generation completed successfully and editor diagnostics report no TypeScript errors. The Jest smoke test is present, but the current terminal environment does not return a completion result for the Jest process and requires follow-up verification before the first feature phase.

## Phase 1: Identity and Access

**Status:** In progress

### Context to read

- `docs/api/authentication.md`
- `docs/Entities/01-User.md`
- `docs/Entities/02-Role.md`
- `docs/Entities/03-Session.md`
- `docs/Entities/04-Refresh-Token.md`
- `docs/Entities/05-Password-Reset-Token.md`
- Authentication sections in `docs/SRS.md` and `docs/business-workflows.md`

### Deliverables

- User, Role, Session, Refresh Token, and Password Reset Token migrations/models.
- Registration with separate Customer/Seller account type and email verification.
- Login, logout, logout-all, refresh-token rotation, and `auth/me`.
- Forgot-password and reset-password flows.
- Password hashing, protected-route middleware, RBAC, and rate limits.
- Audit/security logging and standard validation/error responses.

### Completion checks

- Pending accounts cannot log in before email verification.
- Suspended, Blocked, and Inactive accounts cannot authenticate.
- Refresh-token reuse is rejected.
- Users cannot access another user's sessions.
- Passwords and tokens never appear in responses or logs.
- Unit, API, authorization, and rate-limit tests pass.

### Current Phase 1 progress

Core identity models, authentication routes, active-session enforcement, and isolated service tests are implemented. Phase 1 remains open until the database migration, email provider, rate limiting, role guards, and executable integration tests are complete.

## Phase 2: Seller Onboarding and Category Management

**Status:** Needs rework (Size Sets & GSTIN)

### Context to read

- `docs/api/seller-Management.md`
- `docs/api/category-management.md`
- `docs/Entities/06-Seller-Profile.md` through `docs/Entities/12-Category-Commission.md`
- `docs/api/authentication.md`
- Seller and category sections in `docs/SRS.md` and `docs/business-workflows.md`

### Deliverables

- [ ] Seller profile, verification, verification documents, seller address, seller-category permission, commission models, and optional GSTIN for Business sellers (needs rework).
- [ ] Seller onboarding, document upload, manual Super Admin review, rejection, resubmission, suspension, and blocking.
- [ ] Private S3 document storage with authorized access and download audit records.
- [ ] Category hierarchy, category requests, independent decisions, revocation, commission configuration, and Admin-managed Size Sets (needs rework).
- [ ] Enforce seller pickup/return-address policy before the approved product-operation milestone.

### Completion checks

- [ ] Only Super Admin can approve, reject, suspend, or block sellers.
- [ ] Blocked sellers cannot re-upload documents.
- [ ] Rejected sellers can resubmit with history retained.
- [ ] Only approved seller-category permissions allow product operations.
- [ ] Verification documents are inaccessible to customers and sellers.
- [ ] Size Sets are assigned per subcategory and validated.
- [ ] Audit and authorization tests pass.

### Phase 2 result

Initial seller profile and category workflows were implemented. Phase 2 needs rework to incorporate Admin-managed Size Sets (`SizeSet` and `SizeSetValue` entities) and the optional GSTIN field for Business merchants in accordance with SRS v1.2.

## Phase 3: Product Catalog and Inventory

**Status:** Needs rework (built without variants)

### Context to read

- `docs/api/product-management.md`
- `docs/api/inventory-management.md`
- `docs/Entities/13-Product.md` through `docs/Entities/17-Inventory-History.md`
- `feature-specs/product-management.md`
- Product and inventory sections in `docs/SRS.md`

### Deliverables

- [ ] Product, Product Variant (Size x Color), Product Image, Product Specification, Inventory, and Inventory History models (needs rework).
- [ ] Product CRUD, status transitions, duplication (with unique variant SKUs), image handling, specifications, and public browsing.
- [ ] One subcategory per product, Size x Color variants constrained to subcategory Size Set, globally unique variant SKUs, and per-variant inventory (needs rework).
- [ ] Atomic stock validation, reservation, confirmation, release, restocking, and low-stock reporting per variant SKU.
- [ ] Seller ownership and approved category enforcement.

### Completion checks

- [ ] Unapproved sellers cannot create products.
- [ ] Duplicate variant SKU is rejected.
- [ ] Product changes do not alter historical records.
- [ ] Concurrent reservations cannot oversell variant inventory.
- [ ] Failed or expired payment releases reservations.
- [ ] Inventory history per variant is complete and tests pass.

### Phase 3 result

The initial implementation lacked product variants. Phase 3 needs rework to refactor the catalog to `ProductVariant` (Size x Color), data-driven Size Sets, and per-variant inventory tracking as mandated by SRS v1.2.

## Phase 4: Customer Profiles, Addresses, and Shopping

**Status:** Complete

### Context to read

## Phase 4: Customer Profiles, Addresses, and Shopping

**Status:** Needs rework (cart uses variantId)

### Context to read

- `docs/api/customer-management.md`
- `docs/api/shopping-management.md`
- `docs/Entities/18-Customer-Profile.md` through `docs/Entities/21-Cart-Item.md`
- Customer/cart sections in `docs/SRS.md` and `docs/business-workflows.md`

### Deliverables

- [x] Customer profile and active Address model.
- [ ] Persistent authenticated carts and cart-item operations using `variantId` (needs rework).
- [ ] Multi-seller cart grouped by seller with dynamic free-shipping threshold progress calculation (needs rework).
- [ ] Product browsing with subcategory-specific size/color filters and variant stock display (needs rework).
- [ ] Cart validation for variant price, variant stock, product visibility status, and seller permission (needs rework).

### Completion checks

- [x] Customers can access only their own profiles, addresses, and carts.
- [x] Home, Business, and Shipping address types work correctly.
- [x] Historical order address snapshots remain unchanged after edits.
- [ ] Out-of-stock variant cart items remain visible but block checkout (needs rework).
- [ ] Price changes require refreshed customer confirmation.

### Phase 4 result

Initial customer profile and address models were built. Phase 4 shopping and cart modules need rework to use `variantId` as the purchasable entity, group cart responses by seller, and compute free-shipping progress per seller.

## Phase 5: Checkout, Orders, and Razorpay Payments

**Status:** Needs rework (variant snapshots & webhook flow)

### Context to read

- `docs/api/order-management.md`
- `docs/api/payment-management.md`
- `docs/Entities/22-Order.md` through `docs/Entities/26-Payment-Transaction.md`
- `docs/api-design.md`
- Checkout, order, and payment sections in `docs/SRS.md` and `docs/business-workflows.md`

### Deliverables

- [x] Checkout context and idempotency handling.
- [ ] One customer parent Order split into seller-specific Order Items referencing `variant_id` (needs rework).
- [ ] Seller fulfillment workflow (`Placed -> Packed -> Shipped -> Delivered`) requiring courier name and tracking number at `Shipped` and manual delivery confirmation at `Delivered` (needs rework).
- [ ] 7-step Razorpay webhook transaction (verify signature, idempotency, mark Paid, create order, decrement variant stock, write immutable snapshots, send notifications) (needs rework).
- [ ] Pre-shipment cancellation with partial/full cancellation shipping fee allocation rules (needs rework).
- [ ] Immutable financial snapshots (name, SKU, size, color, unit price, commission rate/amount, shipping share) on each order item (needs rework).

### Completion checks

- [x] Cash on Delivery is rejected (Razorpay is sole V1 payment gateway).
- [x] Duplicate requests do not duplicate payments, orders, inventory effects, or refunds (idempotency key protection).
- [x] Invalid Razorpay signatures/webhooks are rejected and cannot change state.
- [ ] Multi-seller split orders and immutable variant snapshots verified (needs rework).
- [ ] Pre-shipment cancellations only allowed before `Shipped` status (needs rework).

### Phase 5 result

Initial order models and Razorpay flow were scaffolded. Phase 5 needs rework to enforce the 7-step webhook execution flow, immutable variant snapshots on order items, pre-shipment cancellation rules, and manual delivery confirmation without carrier webhook assumptions.

## Phase 6: Returns, Refunds, and Settlements

**Status:** Needs rework (manual delivery & signed debit ledger)

### Context to read

- `docs/api/return-refund-management.md`
- `docs/api/settlement-management.md`
- `docs/Entities/27-Return-Request.md` through `docs/Entities/30a-Seller-Adjustment.md`
- Return, refund, dispute, and settlement sections in `docs/SRS.md` and `docs/business-workflows.md`

### Deliverables

- [ ] Five-day return eligibility strictly starting from seller manual `Delivered` mark (needs rework).
- [ ] 7-day post-delivery "Not received" dispute workflow with target 3-business-day SLA and settlement freezing (needs rework).
- [ ] Super Admin return approval/rejection and physical seller inspection workflow (`Verified` / `Rejected on Inspection`) with fault-based return shipping allocation (needs rework).
- [ ] Weekly manual settlement calculation triggered by Super Admin (no cron job) with 7-day post-delivery hold (needs rework).
- [ ] Negative balance governance via `SellerAdjustment` ledger with signed amounts (₹0 payout floor, carried-forward debits, Admin write-offs) (needs rework).
- [ ] Admin direct retail sales excluded from settlement engine (needs rework).

### Completion checks

- [ ] Returns rejected after 5 days from `Delivered` mark.
- [ ] "Not received" dispute blocks settlement until Super Admin resolution.
- [ ] Negative settlements generate ₹0.00 payout and record carried-forward debit adjustment.
- [ ] Admin write-offs record mandatory reason in audit log.
- [ ] Payout confirmation requires external bank transaction reference number.

### Phase 6 result

Initial return and settlement scaffolding requires rework to incorporate manual delivery confirmation, the 5-day return window, the 7-day settlement hold, "Not received" disputes, and the signed seller adjustment ledger.

## Phase 7: Notifications, Reporting, and Administration

**Status:** Needs rework (11 master events & Admin sales)

### Context to read

- `docs/api/notification-management.md`
- `docs/api/reporting-audit.md`
- `docs/Entities/31-Notification.md` through `docs/Entities/35-Report-MetaData.md`
- Notification, reporting, and administration sections in `docs/SRS.md`

### Deliverables

- [ ] In-app and email notifications across the exact 11 master lifecycle events (needs rework).
- [ ] Event-driven notification creation, retry, failure recording, and non-blocking delivery.
- [ ] Audit Log, Activity Log, and Report Metadata.
- [ ] Segregated Admin direct retail sales report (`GET /api/v1/admin/reports/admin-sales`) kept separate from marketplace sales (needs rework).
- [ ] Admin shipping settings management (`GET / PATCH /api/v1/admin/settings/shipping`) (needs rework).

### Completion checks

- [ ] All 11 master lifecycle events trigger notifications.
- [ ] Admin retail sales are segregated from marketplace GMV and revenue reports.
- [ ] Shipping settings are configurable by Admin and dynamically applied.

### Phase 7 result

Phase 7 needs rework to synchronize with the 11 master lifecycle events, add the dedicated Admin direct sales report endpoint, and support Admin platform shipping parameter management.

## Phase 8: Production Readiness

**Status:** In progress

### Context to read

- `docs/adr/ADR-004-file-storage-strategy.md`
- `docs/adr/ADR-005-deployment-strategy.md`
- `docs/production-runbook.md`
- Security, deployment, and integration sections in `docs/SRS.md`.

### Deliverables

- [x] Multi-stage Dockerfile and container orchestration (`docker-compose.prod.yml`).
- [x] Security headers, CORS, error sanitization, and health check endpoints.
- [x] Automated database backup and restore scripts.
- [ ] Full end-to-end integration test verification against refactored v1.2 backend services (in progress).

### Phase Tracking

- [x] Requirements and documentation baseline (`docs/SRS.md` v1.2).
- [x] Backend API documentation standardization.
- [x] Phase 0: Technology and Project Bootstrap.
- [ ] Phase 1: Identity and Access (In progress).
- [ ] Phase 2: Seller Onboarding and Category Management (Needs rework: Size Sets & GSTIN).
- [ ] Phase 3: Product Catalog and Inventory (Needs rework: ProductVariant Size x Color).
- [ ] Phase 4: Customer Profiles, Addresses, and Shopping (Needs rework: variantId cart).
- [ ] Phase 5: Checkout, Orders, and Razorpay Payments (Needs rework: variant snapshots & webhook).
- [ ] Phase 6: Returns, Refunds, and Settlements (Needs rework: manual delivery & signed debit ledger).
- [ ] Phase 7: Notifications, Reporting, and Administration (Needs rework: 11 master events & Admin sales).
- [ ] Phase 8: Production Readiness (In progress).
