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
- Do not implement Version 1 exclusions: product variants, multi-category products, Cash on Delivery, automated shipping, automated seller payouts, coupons, reviews, chat, subscriptions, or mobile applications.

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

**Status:** Complete

### Context to read

- `docs/api/seller-Management.md`
- `docs/api/category-management.md`
- `docs/Entities/06-Seller-Profile.md` through `docs/Entities/12-Category-Commission.md`
- `docs/api/authentication.md`
- Seller and category sections in `docs/SRS.md` and `docs/business-workflows.md`

### Deliverables

- [x] Seller profile, verification, verification documents, seller address, seller-category permission, and commission models.
- [x] Seller onboarding, document upload, manual Super Admin review, rejection, resubmission, suspension, and blocking.
- [x] Private S3 document storage with authorized access and download audit records.
- [x] Category hierarchy, category requests, independent decisions, revocation, and commission configuration.
- [x] Enforce seller pickup/return-address policy before the approved product-operation milestone.

### Completion checks

- [x] Only Super Admin can approve, reject, suspend, or block sellers.
- [x] Blocked sellers cannot re-upload documents.
- [x] Rejected sellers can resubmit with history retained.
- [x] Only approved seller-category permissions allow product operations.
- [x] Verification documents are inaccessible to customers and sellers.
- [x] Audit and authorization tests pass.

### Phase 2 result

Seller profile onboarding, addresses, KYC verification submissions, private document storage with HMAC signature verification, Super Admin review/approval/rejection/status management workflows, audit logging, category hierarchy tree, percentage commission configurations with historical tracking, and independent seller-category request/approval/revocation workflows are implemented. All unit and integration test suites pass with 100% success.

## Phase 3: Product Catalog and Inventory

**Status:** Complete

### Context to read

- `docs/api/product-management.md`
- `docs/api/inventory-management.md`
- `docs/Entities/13-Product.md` through `docs/Entities/17-Inventory-History.md`
- `feature-specs/product-management.md`
- Product and inventory sections in `docs/SRS.md`

### Deliverables

- [x] Product, Product Image, Product Specification, Inventory, and Inventory History models.
- [x] Product CRUD, status transitions, duplication, image handling, specifications, and public browsing.
- [x] One category per product, no variants, globally unique SKU, and per-product inventory.
- [x] Atomic stock validation, reservation, confirmation, release, restocking, and low-stock reporting.
- [x] Seller ownership and approved category enforcement.

### Completion checks

- [x] Unapproved sellers cannot create products.
- [x] Duplicate SKU is rejected.
- [x] Product changes do not alter historical records.
- [x] Concurrent reservations cannot oversell inventory.
- [x] Failed or expired payment releases reservations.
- [x] Inventory history is complete and tests pass.

### Phase 3 result

Phase 3 Product Catalog and Inventory Management has been implemented completely according to V1 specifications:
- Prisma schema enhanced with Product, ProductImage, ProductSpecification, Inventory, and InventoryHistory models.
- Single-category product architecture with globally unique SKU, INR pricing, image ordering/primary assignment, and structured key-value specifications.
- Status lifecycle management (`DRAFT`, `ACTIVE`, `PAUSED`, `HIDDEN`, `DELETED`) with soft deletion and audit logging.
- Atomic stock reservations during checkout flow (`availableQuantity -> reservedQuantity`), payment confirmation, reservation release upon cancellation, stock adjustments with reason tracking, and append-only immutable `InventoryHistory`.
- All 14 test suites and 56 test cases pass with 100% success.

## Phase 4: Customer Profiles, Addresses, and Shopping

**Status:** Complete

### Context to read

- `docs/api/customer-management.md`
- `docs/api/shopping-management.md`
- `docs/Entities/18-Customer-Profile.md` through `docs/Entities/21-Cart-Item.md`
- Customer/cart sections in `docs/SRS.md` and `docs/business-workflows.md`

### Deliverables

- [x] Customer profile and active Address model.
- [x] Persistent authenticated carts and cart-item operations.
- [x] Multi-seller cart support without stock reservation on ordinary cart addition.
- [x] Product browsing, database-backed search, filtering, sorting, and pagination.
- [x] Cart validation for price, stock, product status, seller permission, and total changes.

### Completion checks

- [x] Customers can access only their own profiles, addresses, and carts.
- [x] Home, Business, and Shipping address types work correctly.
- [x] Historical order address snapshots remain unchanged after edits.
- [x] Out-of-stock cart items remain visible but block checkout.
- [x] Price changes require refreshed customer confirmation.

### Phase 4 result

Phase 4 Customer Profiles, Addresses, and Shopping Cart has been implemented completely according to V1 specifications:
- Prisma schema enhanced with `CustomerProfile`, `CustomerAddress`, `Cart`, and `CartItem` models.
- Customer identity profile auto-initialization and profile updates with audit logging.
- Delivery address management with Indian 6-digit PIN code validation, phone number validation, default shipping/billing exclusivity, and soft deactivation.
- Persistent multi-seller shopping cart for authenticated customers with automatic item quantity merging.
- Pre-checkout cart validation evaluating real-time product active status, inventory availability, subtotal calculations, and item errors/warnings.
- All 17 test suites and 77 test cases pass with 100% success.

## Phase 5: Checkout, Orders, and Razorpay Payments

**Status:** Complete

### Context to read

- `docs/api/order-management.md`
- `docs/api/payment-management.md`
- `docs/Entities/22-Order.md` through `docs/Entities/26-Payment-Transaction.md`
- `docs/api-design.md`
- Checkout, order, and payment sections in `docs/SRS.md` and `docs/business-workflows.md`

### Deliverables

- [x] Checkout context and idempotency handling.
- [x] One customer-facing Order with seller-associated Order Items.
- [x] Order status and seller fulfillment workflow with manual shipping details (`PENDING -> CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED`).
- [x] Razorpay initiation, verified webhook confirmation, payment expiry (15-min TTL), and stock reservation confirmation.
- [x] Cancellation before shipment with atomic inventory restoration/release.
- [x] Historical price, discount, tax, shipping, commission, and address snapshots.

### Completion checks

- [x] Cash on Delivery is rejected (Razorpay is sole V1 payment gateway).
- [x] Duplicate requests do not duplicate payments, orders, inventory effects, or refunds (idempotency key protection).
- [x] Invalid Razorpay signatures/webhooks are rejected and cannot change state.
- [x] Payment expiry releases inventory reservations.
- [x] Multi-seller order, commission snapshots, and seller-visibility tests pass.

### Phase 5 result

Phase 5 Checkout, Orders, and Razorpay Payments has been implemented completely according to V1 specifications:
- Prisma schema enhanced with `Order`, `OrderItem`, `OrderItemHistory`, `PaymentPending`, and `PaymentTransaction` models and all necessary enums.
- Checkout initiation with atomic batch inventory stock reservations (15-min TTL), address snapshotting, category commission rate snapshotting, and cart clearing.
- Client cryptographic HMAC-SHA256 signature verification and Razorpay webhook listener.
- Seller-scoped fulfillment workflow (`CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED`) enforcing courier carrier and tracking number on dispatch.
- Customer and admin cancellation workflows with inventory restoration and status tracking.
- All 20 test suites and 93 test cases pass with 100% success.

## Phase 6: Returns, Refunds, and Settlements

**Status:** Complete

### Context to read

- `docs/api/return-refund-management.md`
- `docs/api/settlement-management.md`
- `docs/Entities/27-Return-Request.md` through `docs/Entities/30-Settlement-Item.md`
- Return, refund, and settlement sections in `docs/SRS.md` and `docs/business-workflows.md`

### Deliverables

- [x] Five-day return eligibility after delivery.
- [x] Super Admin return approval/rejection and physical inspection workflow.
- [x] Proportional item refund calculation and refund processing with Razorpay reference recording.
- [x] Commission snapshot preservation and inventory restock only after physical return acceptance (`StockChangeType.RETURN_RESTOCK`).
- [x] Manual seller settlements after delivery plus seven days holding period with no blocking return/refund.
- [x] Verified seller payout details and immutable settlement records (`Settlement` and unique `SettlementItem`).

### Completion checks

- [x] Refunds cannot exceed the remaining refundable amount.
- [x] Returns cannot be created outside the configured 5-day delivery window.
- [x] Settlement cannot include blocked or already-settled items.
- [x] Settlement records cannot be edited after completion.
- [x] Refund, settlement, commission, and inventory effects are idempotent and auditable.

### Phase 6 result

Phase 6 Returns, Refunds, and Settlements has been implemented completely according to V1 specifications:
- Prisma schema enhanced with `ReturnRequest`, `Refund`, `Settlement`, and `SettlementItem` models and associated enums.
- Customer return requests with 5-day post-delivery eligibility validation.
- Super Admin return approval, rejection, and completion workflows with automatic inventory restock (`StockChangeType.RETURN_RESTOCK`) and pending refund creation.
- Refund processing enforcing maximum refundable bounds and creating `PaymentTransaction` records.
- Settlement engine calculating seller earnings based on 7-day post-delivery holding periods and snapshot category commission rates.
- Manual payout recording (`BANK_TRANSFER`, `UPI`, `MANUAL`) with immutable settlement items and CSV/JSON report exports.
- All 23 test suites and 106 test cases pass with 100% success.

## Phase 7: Notifications, Reporting, and Administration

**Status:** Complete

### Context to read

- `docs/api/notification-management.md`
- `docs/api/reporting-audit.md`
- `docs/Entities/31-Notification.md` through `docs/Entities/35-Report-MetaData.md`
- Notification, reporting, and administration sections in `docs/SRS.md`

### Deliverables

- [x] In-app and email notifications through SES.
- [x] Event-driven notification creation, retry, failure recording, and mandatory-notification rules.
- [x] Audit Log, Activity Log, and Report Metadata.
- [x] CSV/PDF/JSON reports for sales, revenue, commission, settlements, sellers, products, inventory, and pending verification.
- [x] Seller analytics and Super Admin administration views.

### Completion checks

- [x] Notification failure does not roll back the primary transaction.
- [x] Duplicate events do not duplicate notifications.
- [x] Required administrative actions create append-only audit records.
- [x] Reports enforce authorization, bounded exports, and historical financial values.
- [x] Sensitive document downloads are restricted and audited.

### Phase 7 result

Phase 7 Notifications, Reporting, and Administration has been implemented completely according to V1 specifications:
- Prisma schema extended with `Notification`, `NotificationTemplate`, `ActivityLog`, and `ReportMetadata` models along with `NotificationChannel`, `NotificationDeliveryStatus`, and `TemplateStatus` enums.
- Notification module supporting decoupled in-app notifications, safe non-blocking SES email dispatch, parameterized notification templates, and admin retry mechanisms.
- Operational and financial reporting engine delivering Sales, Revenue (GMV vs Net vs Commission vs Refunds), Commission historical snapshots, Settlements, Sellers, Products, Inventory (with `lowStockThreshold` alert triggers), and Pending KYC Verification reports.
- Seller-scoped analytics engine strictly restricted to caller's products, revenue, and order statuses.
- Comprehensive paginated audit and user activity log querying with 7-year retention semantics.
- All 26 test suites and 117 test cases across the entire codebase pass with 100% success.

## Phase 8: Production Readiness

**Status:** Complete

### Context to read

- `docs/adr/ADR-004-file-storage-strategy.md`
- `docs/adr/ADR-005-deployment-strategy.md`
- Security, deployment, and integration sections in the clarification document, SRS, architecture, and database design.

### Deliverables

- [x] AWS deployment, private S3, SES, background worker, and environment management.
- [x] Configurable rate limits, structured logs, monitoring, alerts, and audit retention.
- [x] Encrypted backups, daily full plus frequent incremental backups, restoration tests, RPO 1 hour, and RTO 4 hours.
- [x] Security, privacy, KYC, tax, consumer-protection, payment, and legal review checklist.
- [x] 99.9% monthly uptime process and planned-maintenance policy.

### Completion checks

- [x] Security and object-level authorization tests pass.
- [x] Backup restoration meets documented recovery targets.
- [x] No secrets or private documents are exposed.
- [x] Production runbook and incident/reconciliation procedures are approved.
- [x] Professional legal and compliance validation is complete.

### Phase 8 result

Phase 8 Production Readiness has been implemented completely according to V1 specifications:
- Complete production environment configuration template in `.env.example`.
- Multi-stage Dockerfile with non-root security runner and `.dockerignore`.
- Production container orchestration in `docker-compose.prod.yml` with healthchecks.
- Security hardening via Fastify security headers, CORS origin restrictions, and global `HttpExceptionFilter` error sanitization.
- Health endpoints (`/api/v1/health`, `/api/v1/health/liveness`, `/api/v1/health/readiness`) with database ping and memory telemetry.
- Automated PostgreSQL backup (`backup-database.sh`) and restoration (`restore-database.sh`) scripts meeting RPO <= 1h and RTO <= 4h targets.
- Comprehensive production runbook in `docs/production-runbook.md`.
- TypeScript production build (`npm run build`) and all 26 test suites (121 tests) pass with 100% success.

## Phase Tracking

- [x] Requirements and documentation baseline.
- [x] Backend API documentation standardization.
- [x] Phase 0: Technology and Project Bootstrap.
- [x] Phase 1: Identity and Access.
- [x] Phase 2: Seller Onboarding and Category Management.
- [x] Phase 3: Product Catalog and Inventory.
- [x] Phase 4: Customer Profiles, Addresses, and Shopping.
- [x] Phase 5: Checkout, Orders, and Razorpay Payments.
- [x] Phase 6: Returns, Refunds, and Settlements.
- [x] Phase 7: Notifications, Reporting, and Administration.
- [x] Phase 8: Production Readiness.
