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

**Status:** Not started

### Context to read

- `docs/api/seller-Management.md`
- `docs/api/category-management.md`
- `docs/Entities/06-Seller-Profile.md` through `docs/Entities/12-Category-Commission.md`
- `docs/api/authentication.md`
- Seller and category sections in `docs/SRS.md` and `docs/business-workflows.md`

### Deliverables

- Seller profile, verification, verification documents, seller address, seller-category permission, and commission models.
- Seller onboarding, document upload, manual Super Admin review, rejection, resubmission, suspension, and blocking.
- Private S3 document storage with authorized access and download audit records.
- Category hierarchy, category requests, independent decisions, revocation, and commission configuration.
- Enforce seller pickup/return-address policy before the approved product-operation milestone.

### Completion checks

- Only Super Admin can approve, reject, suspend, or block sellers.
- Blocked sellers cannot re-upload documents.
- Rejected sellers can resubmit with history retained.
- Only approved seller-category permissions allow product operations.
- Verification documents are inaccessible to customers and sellers.
- Audit and authorization tests pass.

## Phase 3: Product Catalog and Inventory

**Status:** Not started

### Context to read

- `docs/api/product-management.md`
- `docs/api/inventory-management.md`
- `docs/Entities/13-Product.md` through `docs/Entities/17-Inventory-History.md`
- `feature-specs/product-management.md`
- Product and inventory sections in `docs/SRS.md`

### Deliverables

- Product, Product Image, Product Specification, Inventory, and Inventory History models.
- Product CRUD, status transitions, duplication, image handling, specifications, and public browsing.
- One category per product, no variants, globally unique SKU, and per-product inventory.
- Atomic stock validation, reservation, confirmation, release, restocking, and low-stock reporting.
- Seller ownership and approved category enforcement.

### Completion checks

- Unapproved sellers cannot create products.
- Duplicate SKU is rejected.
- Product changes do not alter historical records.
- Concurrent reservations cannot oversell inventory.
- Failed or expired payment releases reservations.
- Inventory history is complete and tests pass.

## Phase 4: Customer Profiles, Addresses, and Shopping

**Status:** Not started

### Context to read

- `docs/api/customer-management.md`
- `docs/api/shopping-management.md`
- `docs/Entities/18-Customer-Profile.md` through `docs/Entities/21-Cart-Item.md`
- Customer/cart sections in `docs/SRS.md` and `docs/business-workflows.md`

### Deliverables

- Customer profile and active Address model.
- Persistent authenticated carts and cart-item operations.
- Multi-seller cart support without stock reservation on ordinary cart addition.
- Product browsing, database-backed search, filtering, sorting, and pagination.
- Cart validation for price, stock, product status, seller permission, and total changes.

### Completion checks

- Customers can access only their own profiles, addresses, and carts.
- Home, Business, and Shipping address types work correctly.
- Historical order address snapshots remain unchanged after edits.
- Out-of-stock cart items remain visible but block checkout.
- Price changes require refreshed customer confirmation.

## Phase 5: Checkout, Orders, and Razorpay Payments

**Status:** Not started

### Context to read

- `docs/api/order-management.md`
- `docs/api/payment-management.md`
- `docs/Entities/22-Order.md` through `docs/Entities/26-Payment-Transaction.md`
- `docs/api-design.md`
- Checkout, order, and payment sections in `docs/SRS.md` and `docs/business-workflows.md`

### Deliverables

- Checkout context and idempotency handling.
- One customer-facing Order with seller-associated Order Items.
- Order status and seller fulfillment workflow with manual shipping details.
- Razorpay initiation, verified webhook confirmation, payment expiry, and maximum three attempts.
- Order creation only after authoritative payment success.
- Cancellation before shipment, including partial item cancellation.
- Historical price, discount, tax, shipping, commission, and address snapshots.

### Completion checks

- Cash on Delivery is rejected.
- Duplicate requests do not duplicate payments, orders, inventory effects, or refunds.
- Invalid Razorpay webhooks cannot change state.
- Payment expiry releases reservations.
- Payment success followed by order failure enters reconciliation.
- Multi-seller order and seller-visibility tests pass.

## Phase 6: Returns, Refunds, and Settlements

**Status:** Not started

### Context to read

- `docs/api/return-refund-management.md`
- `docs/api/settlement-management.md`
- `docs/Entities/27-Return-Request.md` through `docs/Entities/30-Settlement-Item.md`
- Return, refund, and settlement sections in `docs/SRS.md` and `docs/business-workflows.md`

### Deliverables

- Five-day return eligibility after delivery.
- Super Admin return approval/rejection and physical inspection workflow.
- Full and partial refunds with proportional tax and partial shipping policy.
- Commission reversal/adjustment and inventory restock only after acceptance.
- Weekly manual settlements after delivery plus seven days with no blocking return/refund.
- Verified seller payout details and immutable settlement records.
- Exceptional post-settlement adjustment workflow.

### Completion checks

- Refunds cannot exceed the remaining refundable amount.
- Returns cannot be approved outside the configured window.
- Settlement cannot include blocked or already-settled items.
- Settlement records cannot be edited after completion.
- Refund, settlement, commission, and inventory effects are idempotent and auditable.

## Phase 7: Notifications, Reporting, and Administration

**Status:** Not started

### Context to read

- `docs/api/notification-management.md`
- `docs/api/reporting-audit.md`
- `docs/Entities/31-Notification.md` through `docs/Entities/35-Report-MetaData.md`
- Notification, reporting, and administration sections in `docs/SRS.md`

### Deliverables

- In-app and email notifications through SES.
- Event-driven notification creation, retry, failure recording, and mandatory-notification rules.
- Audit Log, Activity Log, and Report Metadata.
- CSV/PDF reports for sales, revenue, commission, settlements, sellers, products, inventory, and pending verification.
- Seller analytics and Super Admin administration views.

### Completion checks

- Notification failure does not roll back the primary transaction.
- Duplicate events do not duplicate notifications.
- Required administrative actions create append-only audit records.
- Reports enforce authorization, bounded exports, and historical financial values.
- Sensitive document downloads are restricted and audited.

## Phase 8: Production Readiness

**Status:** Not started

### Context to read

- `docs/adr/ADR-004-file-storage-strategy.md`
- `docs/adr/ADR-005-deployment-strategy.md`
- Security, deployment, and integration sections in the clarification document, SRS, architecture, and database design.

### Deliverables

- AWS deployment, private S3, SES, background worker, and environment management.
- Configurable rate limits, structured logs, monitoring, alerts, and audit retention.
- Encrypted backups, daily full plus frequent incremental backups, restoration tests, RPO 1 hour, and RTO 4 hours.
- Security, privacy, KYC, tax, consumer-protection, payment, and legal review checklist.
- 99.9% monthly uptime process and planned-maintenance policy.

### Completion checks

- Security and object-level authorization tests pass.
- Backup restoration meets documented recovery targets.
- No secrets or private documents are exposed.
- Production runbook and incident/reconciliation procedures are approved.
- Professional legal and compliance validation is complete.

## Phase Tracking

- [x] Requirements and documentation baseline.
- [x] Backend API documentation standardization.
- [x] Phase 0: Technology and Project Bootstrap.
- [ ] Phase 1: Identity and Access.
- [ ] Phase 2: Seller Onboarding and Category Management.
- [ ] Phase 3: Product Catalog and Inventory.
- [ ] Phase 4: Customer Profiles, Addresses, and Shopping.
- [ ] Phase 5: Checkout, Orders, and Razorpay Payments.
- [ ] Phase 6: Returns, Refunds, and Settlements.
- [ ] Phase 7: Notifications, Reporting, and Administration.
- [ ] Phase 8: Production Readiness.
