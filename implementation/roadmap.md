# Implementation Roadmap

**Version 1 status:** Requirements and documentation baseline confirmed; implementation in progress.

The phase-by-phase coding execution tracker is maintained in [coding-plan.md](coding-plan.md).
Current status is maintained in [progress tracker.md](progress%20tracker.md), and active blockers are maintained in [current-issues.md](current-issues.md).

The approved client clarification document is the source of truth for Version 1 behavior:
[Multi_Vendor_Marketplace_Client_Clarification_Completed.md](../docs/decisions/Multi_Vendor_Marketplace_Client_Clarification_Completed.md)

## Progress Tracker

- [x] Consolidate client requirements and business rules.
- [x] Synchronize SRS, architecture, database, API, entity, and feature documents.
- [x] Standardize backend API contracts with endpoint, security, idempotency, failure, and test sections.
- [x] Complete project and database foundation.
- [ ] Complete authentication and authorization.
- [ ] Complete seller and category operations.
- [ ] Complete catalog and inventory.
- [ ] Complete customer shopping and cart.
- [ ] Complete checkout, orders, and payments.
- [ ] Complete returns, refunds, and settlements.
- [ ] Complete notifications, reporting, and administration.
- [ ] Complete production-readiness and compliance gates.

## 1. Delivery Strategy

Build the marketplace as a modular monolith with one deployable application, clear business-module boundaries, and layered dependencies.

Each phase should be completed with unit tests, API tests, authorization tests, database constraints, and workflow tests before the next phase begins.

## 2. Phase 0: Decisions and Documentation Baseline

**Status:** Complete

- [x] Confirm web-only Version 1, India, INR, single language, and excluded future features.
- [x] Confirm separate customer and seller accounts and the initial Super Admin model.
- [x] Confirm email verification, account statuses, soft deactivation/anonymization, and password-policy direction.
- [x] Confirm manual seller verification, resubmission, Super Admin control, private documents, and seller address requirement.
- [x] Confirm Admin-owned categories, one category per product, seller category permissions, and 0-100% commissions with two decimals.
- [x] Confirm no product variants, globally unique SKUs, product statuses, and per-product inventory.
- [x] Confirm checkout-time stock reservation, automatic release, manual shipping, and seller-grouped order items.
- [x] Confirm authenticated persistent multi-seller carts and historical address snapshots.
- [x] Confirm post-payment order creation, cancellation before shipment, and idempotent checkout.
- [x] Confirm Razorpay, no Cash on Delivery, verified webhook confirmation, and 15-minute payment expiry with three attempts.
- [x] Confirm five-day returns, Super Admin approval, inspection before restocking, partial refunds, and commission adjustment.
- [x] Confirm weekly manual settlements after delivery plus seven days, with no blocking return/refund.
- [x] Confirm in-app/email notifications, reporting, audit retention, security targets, AWS, S3, SES, and background workers.
- [ ] Synchronize all dependent documentation with the approved decisions.
- [ ] Resolve the referenced Seller onboarding Option A wording if the original option text is needed for implementation.

Exit criterion: client-approved decisions are reflected consistently in the SRS, entities, database design, APIs, and feature specifications.

## 3. Phase 1: Platform Foundation

**Status:** Not started

- Configure project structure and environment management.
- Implement database connection and migration workflow.
- Implement User, Role, Session, Refresh Token, and Password Reset Token.
- Implement password hashing, login, logout, refresh rotation, password reset, and RBAC.
- Add request validation, error format, audit/activity logging, and test infrastructure.

Exit criterion: all protected API requests enforce authentication, role, ownership, and consistent errors.

## 4. Phase 2: Seller and Category Operations

**Status:** Not started

- Implement Seller Profile, Verification, Verification Document, and Seller Address.
- Implement seller onboarding, document submission, Admin approval/rejection, resubmission, suspension, and blocking.
- Implement Category, Seller Category, and Category Commission.
- Implement category hierarchy and seller-specific category approval.
- Add secure document storage and audit records.

Exit criterion: only approved sellers with approved category permissions can perform seller product operations.

## 5. Phase 3: Catalog and Inventory

**Status:** Not started

- Implement Product, Product Image, and Product Specification.
- Implement product ownership, lifecycle, soft deletion, duplication, and public browsing.
- Implement Inventory and Inventory History.
- Add atomic stock validation, reservation, confirmation, release, and low-stock reporting.

Exit criterion: sellers can manage their own catalog and customers cannot purchase unavailable products.

## 6. Phase 4: Customer Shopping

**Status:** Not started

- Finalize Customer Profile and active Address.
- Implement Cart and Cart Item.
- Implement marketplace search, filtering, sorting, pagination, and product details.
- Implement cart validation before checkout.

Exit criterion: an authenticated customer can maintain a multi-seller cart and receive clear validation when cart data changes.

## 7. Phase 5: Checkout, Orders, and Payments

**Status:** Not started

- Implement Order, Order Item, and Order Item History.
- Implement checkout idempotency and seller grouping by Order Item.
- Implement Payment Pending and Payment Transaction.
- Integrate the payment gateway with verified webhooks.
- Create orders only after authoritative successful payment confirmation.
- Implement customer cancellation and seller fulfillment status updates.

Exit criterion: a multi-seller checkout produces one customer order, correct seller-specific item visibility, one payment flow, and no duplicate financial effects.

## 8. Phase 6: Returns, Refunds, and Settlements

**Status:** Not started

- Implement Return Request and Refund.
- Implement return eligibility, Admin review, return completion, and inventory disposition.
- Implement Settlement and Settlement Item.
- Implement commission snapshots, settlement preview, manual processing, retry, and reports.
- Apply the approved holding-period policy.

Exit criterion: returns, refunds, and settlements remain financially traceable and cannot exceed eligible amounts.

## 9. Phase 7: Notifications, Reporting, and Admin Dashboard

**Status:** Not started

- Implement Notification and Notification Template.
- Add event-driven notification creation and retry handling.
- Implement Audit Log, Activity Log, and Report Metadata.
- Implement sales, revenue, commission, settlement, seller, product, inventory, and verification reports.
- Build Admin Dashboard views over the completed module APIs.

Exit criterion: required events are observable, auditable, reportable, and visible to authorized actors.

## 10. Cross-Phase Quality Gates

- Unit tests for domain rules.
- Integration tests for repositories and transactions.
- API tests for authentication, RBAC, ownership, validation, and errors.
- Idempotency tests for orders, payments, refunds, and settlements.
- Concurrency tests for inventory deductions.
- Historical-data tests for price, commission, refund, and settlement snapshots.
- Security tests for object-level authorization and sensitive-data exposure.
- Backup, logging, monitoring, and recovery verification.

## 11. First Development Sprint

**Status:** Not started

The first implementation sprint should deliver:

1. Project and database bootstrap.
2. User/Role/Session persistence.
3. Registration, login, logout, refresh, and `auth/me`.
4. Password hashing and protected route middleware.
5. Standard validation and error response handling.
6. Initial unit and API test setup.

The first feature sprint after the foundation should implement seller onboarding and verification, because all later seller-owned marketplace operations depend on seller approval.

## 12. Documentation Synchronization Order

Update the documents in dependency order:

1. Business workflows and SRS.
2. Module identification and architecture.
3. Entities and database design.
4. API design and module API specifications.
5. Feature specifications and frontend design.
6. Implementation baseline and this roadmap.

The synchronization must explicitly cover:

- Version 1 scope exclusions, including variants, multi-category products, COD, automated shipping, and automated payouts.
- Account separation, seller verification, category permissions, and sensitive-document access.
- One order with seller-associated order items for multi-seller checkout.
- Payment confirmation, payment expiry, retries, and idempotency.
- Five-day return eligibility, refund calculations, inventory disposition, and commission reversal.
- Seven-day settlement holding period, weekly manual processing, eligibility blocking, and immutable records.
- Customer address lifecycle and historical order address snapshots.
- Seven-year retention, rate limits, RPO/RTO, uptime, AWS services, and legal/compliance review.

## 13. Definition of Done

A phase is complete only when its implementation, database constraints, authorization rules, audit behavior, error handling, and focused tests are complete. Cross-module financial workflows additionally require idempotency, concurrency, historical-snapshot, failure-recovery, and reconciliation tests.
