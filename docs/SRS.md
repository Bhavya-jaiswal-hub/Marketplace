# Software Requirements Specification (SRS)

**Project:** Multi-Vendor Clothing Marketplace

**Version:** 1.1

**Status:** Approved Baseline

**Author:** Bhavya Jaiswal

**Document Owner:** Product & Engineering Team

**Last Updated:** 2026-10-04

---

# Table of Contents

1. [Document Information](#1-document-information)
2. [Revision History](#2-revision-history)
3. [Project Overview](#3-project-overview)
4. [Product Objectives](#4-product-objectives)
5. [Project Scope](#5-project-scope)
6. [Stakeholders](#6-stakeholders)
7. [User Roles](#7-user-roles)
8. [Status Definitions](#8-status-definitions)
9. [Functional Requirements](#9-functional-requirements)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Business Rules](#11-business-rules)
12. [Use Cases](#12-use-cases)
13. [Assumptions](#13-assumptions)
14. [Constraints](#14-constraints)
15. [Risks](#15-risks)
16. [Success Metrics](#16-success-metrics)
17. [Out of Scope (Version 1)](#17-out-of-scope-version-1)
18. [Future Scope](#18-future-scope)
19. [Acceptance Criteria](#19-acceptance-criteria)
20. [Pre-Launch Checklist](#20-pre-launch-checklist)
21. [Glossary](#21-glossary)
22. [Open Questions](#22-open-questions)

---

# 1. Document Information

This document defines the Software Requirements Specification (SRS) for the Multi-Vendor Clothing Marketplace, Version 1.1. It specifies all functional requirements, non-functional requirements, business rules, system workflows, operational constraints, and acceptance criteria.

---

# 2. Revision History

| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-09-22 | Bhavya Jaiswal | Initial draft covering general multi-vendor marketplace architecture. |
| 1.1 | 2026-10-04 | Product & Engineering Team | Aligned scope strictly to Clothing & Apparel (Men, Women, Kids); added product variants (Size x Color) with per-category size configurations; standardized Manual Weekly Settlement by Super Admin; added Admin-as-Seller rules with 0% commission and moderation bounds; defined 5-day multi-stage return dispute workflow and pre-shipment cancellation rules; established Admin-configurable shipping parameters (flat fee and free shipping threshold with cart nudge); specified partial shipment shipping fee retention; added optional GSTIN for Business sellers; introduced Pre-Launch Checklist. |

---

# 3. Project Overview

The Multi-Vendor Clothing Marketplace is an e-commerce platform dedicated exclusively to **Clothing & Apparel** across Men, Women, and Kids categories. Independent apparel merchants and brands register, submit identity and business documentation, undergo verification by the Super Admin, and list clothing items across authorized clothing categories.

Customers can browse clothing collections, select size and color variants, consolidate apparel from multiple sellers into a single cart, execute unified payment via the integrated payment gateway, track shipment fulfillment, cancel unfulfilled items prior to dispatch, and submit return requests within a 5-day post-delivery inspection window.

The Super Admin governs the marketplace, manages seller approvals, configures category commission percentages and platform shipping parameters, resolves return disputes, and executes weekly manual bank payouts. The Super Admin may also sell clothing inventory directly on the platform with 0% commission, without category approval barriers, and with segregated financial reporting.

---

# 4. Product Objectives

- Provide a dedicated, high-trust digital marketplace specialized exclusively for clothing and apparel.
- Ensure seller authenticity through administrative verification of Aadhaar, PAN, address proofs, bank details, and optional GSTIN for Business sellers.
- Enforce category authorization so sellers list products strictly within approved clothing departments.
- Support clothing variants (Size x Color) in Version 1 with unique SKUs and independent stock tracking, utilizing category-specific size configurations.
- Allow customers to purchase clothing variants from multiple independent sellers in a single checkout with unified payment capture.
- Apply dynamic category-level platform commissions on seller orders while maintaining immutable financial snapshots per order item.
- Support Admin-configurable shipping rules (flat shipping fee per seller and free shipping subtotal threshold) with cart guidance nudges.
- Hold customer payments in the marketplace payment gateway account and execute weekly manual seller settlements for delivered, return-cleared orders.
- Provide a structured 5-day return and inspection workflow with transparent shipping cost fault allocation.
- Enable direct retail operations for the Super Admin at 0% commission with full auditability and reporting segregation.
- Deliver comprehensive operational dashboards, reporting, and automated notifications across in-app and email channels.

---

# 5. Project Scope

The platform encompasses three primary user roles:
- **Super Admin**
- **Seller**
- **Customer**

### In-Scope for Version 1:
- Clothing-only category hierarchy (Men's Clothing, Women's Clothing, Kids' Clothing, and subcategories).
- Category-configurable size sets (e.g., S/M/L/XL for tops, waist sizes 28–36 for trousers, age brackets for kids).
- Seller onboarding, verification (Individual and Business), optional GSTIN capture, and lifecycle status management.
- Category permission requests, approvals, and revocations.
- Product catalog management with size and color variants, per-variant SKUs, per-variant stock tracking, and product-level pricing (schema includes nullable price-override for future readiness).
- Product visibility states: Active, Paused ("Currently unavailable"), Hidden (delisted from search/storefront), and Soft-Deleted (archived if referenced in historical orders).
- Multi-vendor shopping cart with per-seller item grouping and "Add ₹X more for free shipping from this seller" progress message.
- Unified checkout capturing single customer payment via payment gateway.
- Admin-configurable shipping settings: flat fee per seller shipment and free shipping threshold per seller subtotal (defaults: ₹79 flat fee, free above ₹999).
- Split-order allocation with independent order item fulfillment tracking (`Placed`, `Packed`, `Shipped`, `Delivered`, `Cancelled`).
- Customer pre-shipment cancellation with proportional shipping fee handling (shipping fee retained for remaining items in partial cancellations; refunded fully only if all items in a seller's shipment are cancelled).
- 5-day post-delivery return window with multi-stage inspection flow: Customer Request $\to$ Admin Eligibility Approval $\to$ Return Shipment $\to$ Seller Verification $\to$ Admin Dispute Resolution (if rejected by seller) $\to$ Gateway Refund.
- Weekly manual seller settlement calculation: Net Payable = Delivered Sales (7+ days elapsed, no open return/refund) - Platform Commission - Return/Refund Adjustments - Seller-Fault Return Shipping Deductions.
- Super Admin direct retail sales with 0% commission, no category approval barrier, exclusion from seller settlements, and segregated reporting.
- Product moderation by Super Admin (takedown with mandatory reason to `Removed by Admin`, seller suspension, category revocation; no direct editing of seller product content).
- Master notification dispatch across in-app and email channels.
- Comprehensive sales, revenue, commission, settlement, inventory, and verification reporting.

---

# 6. Stakeholders

### 6.1 Super Admin (Marketplace Owner)
The platform owner governing commercial policies, vendor verification, product moderation, dispute resolution, shipping configuration, financial settlements, and direct retail sales.

### 6.2 Sellers
Approved individual merchants or commercial apparel businesses listing clothing variants, managing inventory, fulfilling orders, and inspecting customer returns.

### 6.3 Customers
Registered retail consumers browsing clothing catalogs, selecting variants, purchasing across multiple sellers in a single checkout, tracking orders, and managing returns.

### 6.4 Development & Operations Team
Engineering and operations personnel responsible for building, testing, deploying, monitoring, and maintaining the platform.

---

# 7. User Roles

### 7.1 Super Admin
- Authenticate securely with session management.
- Review, approve, reject, suspend, or block sellers.
- Manage clothing categories, subcategories, and category-specific size configurations.
- Approve or reject seller category requests; revoke category permissions.
- Configure category-level commission percentages.
- Configure platform shipping parameters (flat fee per seller and free shipping threshold).
- Moderate seller products: take down violating items with mandatory reason (status `Removed by Admin`), suspend sellers, or revoke category access. (Admin cannot edit seller prices, descriptions, or stock).
- Sell clothing directly without category approval barriers, with 0% commission, no settlement generation, and segregated sales reporting.
- Validate customer return eligibility, resolve seller-customer inspection disputes, and trigger gateway refunds.
- Execute weekly manual settlement runs, inspect eligible items (delivered 7+ days, no open disputes), record external bank/UPI reference numbers, and lock settlements as immutable.
- Access platform-wide reporting, financial summaries, and audit log streams.

### 7.2 Seller
- Register as Individual or Business with Aadhaar, PAN, address details, bank account info, and optional GSTIN.
- Resubmit rejected verification documents upon Admin feedback.
- Request category permissions within the clothing tree.
- Create, edit, duplicate, pause, hide, and soft-delete clothing products and variants (size x color).
- Maintain inventory counts and low-stock thresholds per variant SKU.
- View assigned order items; update fulfillment status (`Packed`, `Shipped` with courier name and tracking ID, `Delivered`).
- Cancel order items prior to shipping if stock is unavailable (triggers full customer refund).
- Receive returned items, inspect physical condition, and mark `Verified` (accept) or `Rejected on Inspection` with mandatory reason.
- Review weekly settlement statements, net payable calculations, and download historical payout reports.
- Receive system notifications via email and in-app feeds.

### 7.3 Customer
- Browse clothing catalog, search products, and apply multi-attribute filters (category, size, color, price, in-stock).
- View product detail pages with variant selector (size x color), live stock indicators, tax-inclusive pricing, and 5-day return policy disclosure.
- Maintain a persistent multi-vendor cart with seller-specific free shipping progress indicators.
- Complete unified checkout via payment gateway.
- Track order items through granular fulfillment statuses and view courier tracking numbers.
- Cancel order items prior to the seller marking them `Shipped` for an immediate refund.
- Submit return requests within 5 days of delivery with mandatory reason and optional photos.
- Ship approved return items back to the seller and track refund status.
- Receive transactional email and in-app notifications.

---

# 8. Status Definitions

The system enforces the following standardized status enumerations across all modules:

### 8.1 Order Item Status
- **Placed:** Order created and payment confirmed; item awaiting seller action.
- **Packed:** Item packed and prepared for courier pickup by the seller.
- **Shipped:** Item handed over to courier; courier name and AWB tracking number recorded.
- **Delivered:** Seller manually marked item as delivered to customer (tracking ID recorded at `Shipped`); initiates 5-day return window and 7-day settlement countdown.
- **Cancelled:** Item cancelled prior to shipping by customer or seller; refund processed.
- **Not Received - Under Dispute:** Customer reported item not received within 7 days of seller marking `Delivered`; escalated to Super Admin dispute review and blocks settlement calculation until resolved.

### 8.2 Parent Order Status (Derived from Items)
- **Placed:** All items in the order are in `Placed` status.
- **Partially Shipped:** At least one item is `Shipped`/`Delivered`, while others remain `Placed`/`Packed`.
- **Partially Delivered:** At least one item is `Delivered`, while others are in transit or processing.
- **Delivered:** All non-cancelled items in the order have been `Delivered`.
- **Partially Cancelled:** One or more items are `Cancelled`, while other items continue fulfillment.
- **Cancelled:** All items in the order have been `Cancelled`.
- **Under Dispute:** One or more items are in `Not Received - Under Dispute` status awaiting Admin arbitration.

### 8.3 Return Status
- **Requested:** Customer submitted return request within the 5-day delivery window; awaiting Admin review.
- **Approved:** Admin approved return eligibility; customer authorized to ship product to seller.
- **Rejected:** Admin rejected return request (e.g., out of window or non-compliant reason); process closed.
- **In Transit:** Customer provided return courier tracking details; package in transit to seller.
- **Received:** Seller confirmed physical receipt of return package at facility.
- **Verified:** Seller inspected item, confirmed acceptable condition, and accepted return.
- **Rejected on Inspection:** Seller inspected item and rejected return due to damage, wear, or missing tags (dispute escalated to Admin).
- **Refunded:** Admin approved refund following verification or dispute resolution; gateway refund triggered.

### 8.4 Payment Status
- **Pending:** Payment session initiated with gateway; awaiting confirmation.
- **Paid:** Gateway confirmed successful fund capture into marketplace account.
- **Failed:** Payment attempt failed, declined, or timed out.
- **Partially Refunded:** One or more items/cancellations refunded; remaining balance held.
- **Refunded:** Total transaction amount fully refunded to original customer payment method.

### 8.5 Settlement Item Status
- **Not Eligible:** Marked `Delivered` less than 7 days ago, currently in an open return/refund workflow, subject to an active "Not received" dispute, or payout not yet due.
- **Eligible:** Order item marked `Delivered` 7+ days ago with no open return, refund, or active dispute; queued for settlement.
- **Settled:** Payout calculated, external bank/UPI reference recorded by Super Admin, and financial record locked.

### 8.6 Seller Account Status
- **Pending Approval:** Newly registered seller awaiting Super Admin KYC document verification.
- **Approved:** Verified seller authorized to request categories, list clothing products, and fulfill orders.
- **Rejected:** Verification documents rejected by Super Admin with mandatory feedback (seller may resubmit).
- **Suspended:** Reversible administrative suspension (listings temporarily hidden; seller dashboard restricted).
- **Blocked:** Permanent or indefinite administrative block due to fraud, severe policy violations, or malicious activity (access barred).

### 8.7 Product Visibility Status
- **Active:** Listed, indexed in search, browsable on storefront, and available for purchase.
- **Paused:** Merchant-paused listing displaying a "Currently unavailable" indicator; cannot be added to cart.
- **Hidden:** Delisted from storefront, category browsing, and search index; existing order history intact.
- **Soft-Deleted:** Marked as deleted in seller dashboard; archived in database if associated with historical orders, never hard deleted.
- **Removed by Admin:** Administrative takedown of non-compliant or violating product by Super Admin with mandatory reason logged and seller notified.

### 8.8 Category Permission Status
- **Requested:** Seller submitted authorization request to list products in a clothing category; awaiting Admin review.
- **Approved:** Super Admin approved category authorization; seller can list products in this category.
- **Rejected:** Super Admin rejected category authorization request with feedback.
- **Revoked:** Super Admin revoked previously granted category permission; existing listings moved to `Removed by Admin`.

---

# 9. Functional Requirements

## FR-1 User Authentication & Account Management
The system shall:
- Support customer registration, login, profile management, and password reset.
- Support seller registration with business type selection (Individual or Business).
- Support secure Super Admin authentication with session management.
- Protect all endpoints using role-based authorization guards (`SUPER_ADMIN`, `SELLER`, `CUSTOMER`).

## FR-2 Seller Onboarding & Identity Verification
The system shall:
- Accept seller verification data: Aadhaar number and document, PAN number and document, registered address proof, bank account details (account number, IFSC code), seller photograph, and an **optional GSTIN field** for Business sellers.
- Provide Super Admin with an onboarding review queue to inspect documents and record approval or rejection with mandatory feedback.
- Allow rejected sellers to view rejection feedback and resubmit updated documents.
- Maintain seller account statuses: `Pending Approval`, `Approved`, `Rejected`, `Suspended`, `Blocked`.

## FR-3 Clothing Category Management
The system shall:
- Maintain a clothing-only category hierarchy:
  - **Men's Clothing:** Shirts, T-Shirts, Trousers, Jeans, Ethnic Wear, Jackets & Outerwear.
  - **Women's Clothing:** Dresses, Tops & Tees, Sarees & Ethnic Wear, Kurtas, Skirts & Pants, Winterwear.
  - **Kids' Clothing:** Boys' Clothing, Girls' Clothing, Baby & Toddler Wear.
- Allow Super Admin to create, update, and manage categories and subcategories.
- Support category-specific size configurations (e.g., alpha sizes S/M/L/XL for tops, numeric waist sizes 28–36 for bottoms, age brackets for kids) instead of a fixed global enum.
- Allow sellers to request authorization for specific categories (status: `Requested`).
- Enable Super Admin to approve, reject, or revoke seller category permissions (`Requested` $\to$ `Approved`, `Rejected`, or `Revoked`).
- Restrict sellers to listing products exclusively within approved categories.

## FR-4 Commission Management
The system shall:
- Store a distinct platform commission percentage for every category and subcategory.
- Allow Super Admin to update category commission percentages at any time.
- Apply updated commission rates exclusively to future orders, locking historical commission rates on existing orders.
- Automatically apply 0% commission on products listed and sold directly by the Super Admin.

## FR-5 Product & Variant Management
The system shall:
- Allow sellers and Admin to create, edit, duplicate, pause, hide, and soft-delete clothing products.
- Enforce that each product belongs to exactly one category/subcategory.
- Support clothing **variants** defined by **Size** and **Color**.
- Require a globally unique SKU for each product variant.
- Enforce product-level pricing (selling price and MRP) across all variants in Version 1. The underlying database schema shall support an optional nullable price-override column per variant for future readiness.
- Store an immutable price and financial snapshot on every order item at the time of purchase.
- Support multiple product images per product and per variant.
- Enforce product visibility rules:
  - **Active:** Listed, searchable, and purchasable.
  - **Paused:** Visible in search/storefront with "Currently unavailable" indicator; cannot be added to cart.
  - **Hidden:** Delisted from search, catalog browsing, and public storefront.
  - **Soft-Deleted:** Marked as deleted; permanently archived if associated with historical orders, never hard deleted.
  - **Removed by Admin:** Takedown of non-compliant listing by Super Admin with mandatory reason logged.

## FR-6 Inventory & Stock Management
The system shall:
- Maintain stock quantity and low-stock threshold independently for each variant SKU.
- Mark an individual variant as **Out of Stock** when its stock quantity reaches zero.
- Mark the parent product as **Out of Stock** when all of its variants have zero stock.
- Decrement available variant stock atomically upon successful payment confirmation.
- Restock variant inventory automatically upon confirmed order cancellation or accepted return.

## FR-7 Customer Browsing, Cart & Shipping Guidance
The system shall:
- Display active clothing products from all approved sellers with faceted search and filtering (category, size, color, price range, in-stock only, seller rating).
- Require size and color variant selection before allowing a customer to add an item to the shopping cart.
- Support a multi-vendor cart allowing items from multiple independent sellers in a single session.
- Group cart items by seller and display subtotal calculations per seller.
- Display a dynamic per-seller shipping indicator in the cart UI: *"Add ₹X more for free shipping from this seller"* based on Admin-configured platform thresholds.
- Enforce customer login before proceeding to checkout.

## FR-8 Checkout, Shipping Configuration & Order Creation
The system shall:
- Maintain Admin-configurable platform shipping settings (never hardcoded):
  - **Flat Shipping Fee per Seller Shipment** (default placeholder: ₹79).
  - **Free Shipping Subtotal Threshold per Seller** (default placeholder: ₹999).
- Calculate tax-inclusive product totals and apply shipping fees per seller shipment during checkout.
- Capture a single unified customer payment through the payment gateway into the marketplace account.
- Employ idempotency tokens to eliminate duplicate orders or double charges.
- Create one customer parent order upon payment confirmation and split it into seller-specific order items.
- Store immutable financial snapshots on every order item (unit price, item subtotal, commission rate, commission amount, and shipping fee share).

## FR-9 Order Fulfillment, Manual Delivery Confirmation & Pre-Shipment Cancellation
The system shall:
- Present each seller with only their assigned order items in a dedicated fulfillment queue.
- Allow sellers to update item fulfillment states: `Placed` $\to$ `Packed` $\to$ `Shipped` $\to$ `Delivered`.
- Require sellers to record the **Courier Name** and **AWB Tracking Number** when marking an item `Shipped`.
- Allow the seller to manually mark an order item as `Delivered` once physical delivery has occurred (Version 1 operates without direct courier API integration).
- Establish that the seller's `Delivered` timestamp initiates both the **5-day customer return window** and the **7-day settlement holding countdown**.
- Allow customers to report an order item as **"Not received"** within 7 calendar days of the seller marking it `Delivered`. This action sets the item status to `Not Received - Under Dispute`, escalates the case to Super Admin for arbitration, and immediately blocks weekly settlement calculation for that item until resolved.
- Allow customers to cancel individual order items at any time **before** the item is marked `Shipped`.
- Allow sellers to cancel an order item prior to shipping if stock is unavailable.
- Enforce proportional shipping fee handling on pre-shipment cancellations:
  - If a customer cancels **some** items from a seller shipment, the shipping fee is retained for the remaining items.
  - If **all** items from a seller shipment are cancelled, the shipping fee for that seller is refunded in full.
- Automatically execute an immediate gateway refund for pre-shipment cancellations.

## FR-10 Payment Management
The system shall:
- Receive and hold all customer checkout payments in the marketplace payment gateway account.
- Record payment gateway transaction IDs, payment methods, and timestamps against every order.
- Maintain immutable transaction logs for all captured payments, partial refunds, and full refunds.
- Process refunds programmatically back to the original customer payment method via gateway APIs.
- Exclude automated TCS calculation in Version 1.

## FR-11 Returns, Inspection & Refund Workflow
The system shall:
- Permit return requests within a strict **5-day window** following the seller marking the item `Delivered`.
- Require customers to select an order item, provide a mandatory return reason, and optional condition photos.
- Route return requests to Super Admin for eligibility validation (`Requested` $\to$ `Approved` / `Rejected`).
- Require customer to enter return shipping courier details and tracking ID (`In Transit`).
- Enable the seller to confirm package receipt (`Received`) and perform physical inspection:
  - If approved, seller marks `Verified`.
  - If rejected (due to damage, wear, or missing tags), seller marks `Rejected on Inspection` with a mandatory explanation.
- Route disputed rejections to Super Admin for final resolution.
- Enforce return shipping cost and refund rules:
  - **Seller Fault** (defective product, wrong size/item sent, damaged, not as listed): Seller bears return shipping cost (deducted from seller settlement); customer receives full refund of item price. Original shipping fee is refunded only if all items in that seller's shipment were returned due to seller fault.
  - **Customer Discretion** (size/fit mismatch, change of mind): Customer bears return shipping cost; customer receives refund of item price only (original shipping fee is retained).
- Trigger the gateway refund upon final Admin approval of the verified return.

## FR-12 Weekly Manual Settlement Management
The system shall:
- Run a weekly settlement calculation cycle initiated manually by the Super Admin.
- Identify all settlement items meeting eligibility criteria: marked `Delivered` $\ge 7$ days ago with no open return request, active inspection dispute, customer "Not received" dispute (`Not Received - Under Dispute`), or pending refund.
- Aggregate eligible items per seller and calculate:
  $$\text{Net Payable} = \text{Gross Eligible Sales} - \text{Platform Commission} - \text{Return/Refund Adjustments} - \text{Seller-Fault Return Shipping Deductions}$$
- Present Super Admin with a detailed breakdown and net payable amount per seller.
- Allow Super Admin to execute payouts via external banking/UPI channels and record the mandatory external **Bank Transaction Reference Number**.
- Mark settlement records as `Settled` and permanently lock them as immutable financial records.
- Provide sellers with downloadable weekly settlement statements.
- Exclude Super Admin retail sales from the seller settlement engine (0% commission, no settlement records generated).

## FR-13 Master Notification System
The system shall dispatch notifications across **In-App** and **Email** channels for the following 9 events:
1. Seller registration approval or rejection.
2. Category permission approval, rejection, or revocation.
3. Order placed (sent to customer and each affected seller).
4. Order cancelled (pre-shipment cancellation by customer or seller).
5. Order shipped (with courier name and tracking number).
6. Order delivered (notifying customer and starting 5-day return window).
7. Return requested, approved, or rejected.
8. Refund completed (with gateway refund reference).
9. Settlement completed (with external transaction reference number).

## FR-14 Reports & Analytics
The system shall generate exportable tabular and visual reports:
- **Sales & Revenue Reports:** Gross merchandise value (GMV), platform net commission, and average order value.
- **Admin Direct Sales Reports:** Segregated revenue and order volumes for products sold directly by the Admin.
- **Seller Performance Reports:** Order fulfillment velocity, pre-shipment cancellation rates, return frequencies, and customer ratings.
- **Settlement & Payout History:** Historical ledger of all completed weekly settlement runs with bank reference numbers.
- **Variant Inventory & Low Stock Reports:** Stock levels, out-of-stock alerts, and fast-moving size/color combinations.
- **Verification & Moderation Audit Reports:** History of seller document approvals, category revocations, and product takedowns.

---

# 10. Non-Functional Requirements

### NFR-1 Performance
- Catalog search, browsing, and category filtering responses shall render within $\le 1.5$ seconds under standard network conditions.
- Checkout initialization and order creation shall execute within $\le 2$ seconds.
- Background jobs (settlement eligibility compilation and notification dispatch) shall execute without degrading interactive user response times.

### NFR-2 Scalability
- Support horizontal scaling of API instances and database read replicas to accommodate up to 5,000 concurrent sellers and 500,000 product variant SKUs.
- Modular architecture allowing future migration to microservices if transaction volume warrants.

### NFR-3 Security & Privacy
- Enforce strict Role-Based Access Control (RBAC) on all backend API routes.
- Hash passwords using bcrypt (salt factor $\ge 12$).
- Store seller verification documents in protected, access-controlled storage buckets.
- Transmit all sensitive and financial data exclusively over TLS 1.3.

### NFR-4 Reliability & Data Consistency
- Enforce ACID transactional boundaries on multi-vendor split-order placement, inventory reservation, and settlement generation.
- Employ idempotency keys on payment capture and refund processing to eliminate duplicate charges.
- Ensure database integrity with strict foreign key constraints, atomic state transitions, and immutable financial snapshots.

### NFR-5 Availability & Recovery
- Maintain platform availability target of 99.5% uptime outside scheduled maintenance windows.
- Execute automated daily database backups with point-in-time recovery capabilities.

### NFR-6 Maintainability & Code Quality
- Enforce clean separation of concerns: Controller $\to$ Service $\to$ Repository/ORM layer.
- Maintain comprehensive OpenAPI/Scalar documentation for all endpoints.
- Preserve $\ge 85\%$ unit and integration test coverage across financial, inventory, and order modules.

### NFR-7 Usability & Responsiveness
- Deliver responsive, accessible user interfaces across desktop, tablet, and mobile browsers adhering to the Vanguard Design System.
- Provide explicit validation feedback, inline error messaging, and clear transaction confirmations on all forms.

---

# 11. Business Rules

### BR-1 Seller Registration & Identity Verification
- Every seller must register as an **Individual** or **Business** and submit mandatory verification documents (Aadhaar, PAN, address proof, photograph, bank account details, and optional GSTIN for Business sellers).
- Seller accounts remain in `Pending Approval` status and cannot list products until approved by the Super Admin.
- Super Admin rejection must include an explicit reason, allowing the seller to resubmit corrected documents.
- Seller account statuses conform strictly to: `Pending Approval`, `Approved`, `Rejected`, `Suspended`, `Blocked`.
- `Blocked` sellers are permanently or indefinitely barred from accessing the platform or registering new accounts due to fraud or severe policy violations.

### BR-2 Category Authorization & Commission Hierarchy
- Sellers are strictly restricted to listing products within approved clothing categories.
- Category authorization requests remain in `Requested` status until approved or rejected by the Super Admin.
- Category permission statuses conform strictly to: `Requested`, `Approved`, `Rejected`, `Revoked`.
- Every clothing category and subcategory has an Admin-configured commission percentage.
- Commission updates apply strictly to future orders; existing orders retain the historical commission rate captured at checkout.

### BR-3 Clothing Catalog & Variant Integrity
- Every product listed must belong exclusively to the **Clothing & Apparel** category tree (Men, Women, Kids).
- Every product must define one or more **Variants** based on **Size** and **Color**.
- Sizes are configured per category (e.g., S/M/L/XL for tops, waist sizes 28–36 for bottoms, age brackets for kids).
- Every variant must possess a globally unique SKU and an independent stock quantity.
- Selling price and MRP are defined at the product level; variant-level pricing is out of scope for Version 1.
- Each product must belong to exactly one category/subcategory.

### BR-4 Product Visibility & Archival
Product visibility states conform strictly to:
- **Active:** Available for public browsing, search, and purchase.
- **Paused:** Displayed with "Currently unavailable" badge; cannot be added to cart.
- **Hidden:** Delisted from storefront and search index; existing order history remains intact.
- **Soft-Deleted:** Marked as deleted in seller dashboard; permanently archived in database if referenced by historical orders, never hard deleted.
- **Removed by Admin:** Takedown of non-compliant product by Super Admin with mandatory reason logged and seller notified.

### BR-5 Inventory & Out-of-Stock Dynamics
- Individual variant with stock $= 0$ is marked `Out of Stock` and cannot be added to cart.
- Product with all variants at stock $= 0$ is marked `Out of Stock` on catalog cards.
- Stock is reserved atomically upon payment confirmation.

### BR-6 Administrative Moderation & Product Ownership Bounds
- Sellers have exclusive rights to create, edit, pause, hide, and delete their own clothing listings.
- Super Admin shall **NOT** edit third-party seller product content (prices, titles, descriptions, or stock levels).
- Super Admin **MAY** moderate listings by taking down non-compliant products with a mandatory reason (status `Removed by Admin`), suspending sellers, or revoking category permissions.
- All moderation actions generate audit log entries and notify the seller.

### BR-7 Admin-as-Seller Commercial Rules
- Super Admin may list and sell clothing inventory directly on the marketplace.
- Admin products require no category approval workflow.
- Commission on Admin-owned products is **0%**.
- Admin direct sales do not generate seller settlement records; revenues flow directly to marketplace accounts and appear in segregated sales reports.

### BR-8 Multi-Vendor Shopping Cart & Split Orders
- Customers must authenticate before adding items to cart or initiating checkout.
- Customers may add clothing variants from multiple sellers into a single cart.
- Checkout executes as a single financial transaction.
- The platform internally splits the parent order into discrete seller order items, allowing independent fulfillment and tracking.

### BR-9 Pre-Shipment Order Cancellation & Shipping Fee Rule
- A customer may cancel any individual order item until the seller updates the status to `Shipped`.
- Once an item is `Shipped`, cancellation is disabled; the customer must wait for delivery and initiate a return.
- A seller may cancel an order item before shipping if inventory is unavailable.
- **Partial vs. Full Cancellation Shipping Allocation:**
  - If a customer cancels **some** items from a seller shipment, the shipping fee is retained for the remaining items in that shipment.
  - If **all** items in that seller's shipment are cancelled, the shipping fee for that seller is refunded in full.

### BR-10 Tax & Shipping Rules
- All listed product prices are **tax-inclusive**. The platform does not calculate tax or deduct TCS in Version 1; sellers are responsible for their own tax compliance.
- Platform shipping rules are Admin-configurable (flat fee per seller shipment, free above a seller subtotal threshold; default seed placeholders: ₹79 flat fee, free above ₹999).
- Sellers must input the courier name and AWB tracking ID when dispatching shipments (`Shipped`).

### BR-11 5-Day Returns & Inspection Governance
- Customers may request a return within **5 calendar days** of the seller marking the item `Delivered` (the tracking ID having been recorded at `Shipped`).
- Customers may report an item as **"Not received"** within **7 calendar days** of the seller marking it `Delivered`. This action sets the item status to `Not Received - Under Dispute`, creates an administrative dispute for Super Admin arbitration, and immediately freezes weekly settlement for that item until resolved.
- Flow: Customer Request (reason mandatory) $\to$ Admin Eligibility Review $\to$ Customer Return Shipment $\to$ Seller Receipt & Inspection $\to$ Seller Verification / Dispute Escalation $\to$ Gateway Refund.
- **Return Shipping Cost & Refund Allocation:**
  - *Seller Fault* (defective, wrong item/size sent, damaged, not as listed): Seller bears return shipping (deducted from settlement); customer refunded item price. Original shipping fee is refunded only if all items in that seller shipment were returned due to seller fault.
  - *Customer Discretion* (fit/size preference, change of mind): Customer bears return shipping; customer refunded item price only (original shipping fee is retained).
- Refunds are calculated on the actual price paid.

### BR-12 Weekly Manual Seller Settlement Governance
- Seller earnings are held in the marketplace payment gateway account upon order delivery.
- Settlement eligibility requires:
  1. Item status is `Delivered` (manually marked by seller).
  2. At least **7 full days** have elapsed since the `Delivered` timestamp.
  3. No open return request, inspection dispute, customer "Not received" dispute (`Not Received - Under Dispute`), or pending refund exists for the item.
- Super Admin runs the settlement cycle manually once per week.
- Net Payable per seller:
  $$\text{Net Payable} = \text{Gross Delivered Sales} - \text{Platform Commission} - \text{Return Adjustments} - \text{Seller-Fault Return Shipping}$$
- Admin executes payment via external banking/UPI and enters the transaction reference number into the platform.
- Once recorded, the settlement item status becomes `Settled` and the record is immutable.

### BR-13 Standardized Notifications Master List
The system shall deliver notifications via in-app feeds and email for the following events:
1. Seller approval / rejection.
2. Category approval / rejection / revocation.
3. Order placed (customer and seller).
4. Order cancelled (pre-shipment).
5. Order shipped (with tracking details).
6. Order delivered.
7. Return requested / approved / rejected.
8. Refund completed.
9. Settlement completed.

---

# 12. Use Cases

### 12.1 Super Admin Use Cases
- **UC-ADM-01: Authenticate Super Admin:** Secure login with role validation.
- **UC-ADM-02: Moderate Seller Onboarding:** Review submitted KYC proofs (PAN, Aadhaar, bank, optional GSTIN); approve, reject, suspend, or block with mandatory reason.
- **UC-ADM-03: Manage Clothing Categories & Size Sets:** Add clothing subcategories; configure category-specific size configurations and commission percentages.
- **UC-ADM-04: Authorize Seller Categories:** Review seller category requests (`Requested`); approve, reject, or revoke access.
- **UC-ADM-05: Configure Shipping Parameters:** Set platform flat shipping fee and free shipping threshold per seller subtotal.
- **UC-ADM-06: Moderate Product Listings:** Take down non-compliant listings with mandatory reason (`Removed by Admin`); suspend violating sellers.
- **UC-ADM-07: Resolve Return Disputes & Not Received Claims:** Review contested seller inspection rejections and customer "Not received" disputes; arbitrate outcomes; trigger gateway refunds or release settlements.
- **UC-ADM-08: Execute Weekly Manual Settlements:** Compile 7+ day delivered items with no open disputes; review deductions; record external bank transaction reference; lock settlement.
- **UC-ADM-09: Manage Admin Direct Retail:** List, price, and fulfill Admin clothing inventory at 0% commission without self-approval.

### 12.2 Seller Use Cases
- **UC-SEL-01: Seller Onboarding:** Register as Individual/Business; upload KYC documents, bank details, and optional GSTIN; select initial clothing categories (`Requested`).
- **UC-SEL-02: Manage Clothing Catalog:** Create clothing products; add size and color variants using category size sets; assign unique SKUs; set product-level price; manage image galleries.
- **UC-SEL-03: Variant Inventory Control:** Update stock quantities and low-stock thresholds per variant SKU; monitor out-of-stock states.
- **UC-SEL-04: Fulfill Order Items:** View assigned order items; update status to `Packed`, `Shipped` (recording courier name and tracking ID), and `Delivered` (manual delivery confirmation).
- **UC-SEL-05: Pre-Shipment Seller Cancellation:** Cancel order item if stock is unavailable; system triggers customer refund.
- **UC-SEL-06: Inspect Returned Products:** Acknowledge receipt of return shipment; inspect condition; mark `Verified` (accept) or `Rejected on Inspection` with explanation.
- **UC-SEL-07: Access Weekly Settlement Reports:** View itemized settlement calculations, commission deductions, return adjustments, and payout transaction references.

### 12.3 Customer Use Cases
- **UC-CUS-01: Account Management:** Register, verify email, login, and maintain delivery addresses.
- **UC-CUS-02: Browse Clothing Catalog:** Search clothing items; apply category-specific size, color, price, and category filters; inspect variant details.
- **UC-CUS-03: Multi-Vendor Cart & Checkout:** Select size/color variant; view free-shipping progress nudges; complete unified payment via gateway.
- **UC-CUS-04: Track Shipments:** Monitor order item progress (`Placed` $\to$ `Packed` $\to$ `Shipped` $\to$ `Delivered`); view courier tracking numbers.
- **UC-CUS-05: Pre-Shipment Cancellation:** Cancel order item before it is marked `Shipped`; receive refund according to partial/full cancellation shipping rules.
- **UC-CUS-06: Initiate 5-Day Return or Dispute:** Submit return request within 5 days of seller marking `Delivered`, or report "Not received" within 7 days of `Delivered` mark to initiate Admin dispute review.

---

# 13. Assumptions

- **AS-1 Marketplace Specialization:** The marketplace specializes strictly in **Clothing & Apparel** for Men, Women, and Kids in Version 1. Footwear and accessories are deferred to V2.
- **AS-2 Product Variants in V1:** Clothing products require size and color variants in Version 1, each with a unique SKU and stock count. Price is defined at the product level.
- **AS-3 Dynamic Category Sizes:** Sizes are configurable per category (e.g., S/M/L/XL, numeric waist, kids age brackets) rather than a static global list.
- **AS-4 Single Category Assignment:** Each product belongs to exactly one category/subcategory node.
- **AS-5 Single Payment Capture:** Customers make one payment per checkout into the marketplace payment gateway account.
- **AS-6 Manual Weekly Settlement:** Super Admin manually reviews and executes seller payouts on a weekly cycle via external banking/UPI and records transaction references in the system.
- **AS-7 Tax Inclusivity & TCS:** All product prices are inclusive of taxes. Platform does not calculate tax or deduct TCS in Version 1; sellers manage their own tax filings.
- **AS-8 5-Day Return Window:** Post-delivery returns are strictly limited to 5 calendar days after the seller marks the item `Delivered`.
- **AS-9 7-Day Settlement Holding:** Seller funds are eligible for settlement only after 7 days have elapsed since the seller marked `Delivered` without open return or "Not received" disputes.
- **AS-10 Internet & Browser Standard:** Users access the platform via modern web browsers with standard broadband/mobile data connectivity.

---

# 14. Constraints

- **C-1 Product Category Constraint:** The platform is restricted strictly to clothing and apparel. Footwear, jewelry, and non-apparel accessories are excluded from Version 1.
- **C-2 Pricing Constraint:** Pricing is configured at the product level in Version 1. Variant-level differential pricing is reserved for future scope (database schema contains nullable override column).
- **C-3 Payment & Settlement Model:** Direct customer-to-seller payments are prohibited. All transactions flow through the marketplace gateway account and are settled manually by Super Admin.
- **C-4 Content Ownership & Moderation Constraint:** Super Admin cannot edit seller product content (prices, descriptions, stock). Admin moderation is limited to taking down listings with mandatory reason (`Removed by Admin`), revoking category access, or suspending sellers.
- **C-5 Immutable Financial Records:** Completed orders, commission records, processed refunds, and settled payouts cannot be altered or deleted. Every order item stores an immutable financial snapshot.
- **C-6 Pre-Shipment Cancellation Cutoff:** Customers cannot cancel order items once the status is updated to `Shipped`.

---

# 15. Risks

- **R-1 Seller Document Fraud:** Seller submits fraudulent identity documents.  
  *Mitigation:* Super Admin performs manual verification before activating seller accounts.
- **R-2 Inappropriate or Counterfeit Listings:** Seller lists non-compliant or counterfeit apparel.  
  *Mitigation:* Super Admin possesses product takedown authority (`Removed by Admin`) with mandatory audit logging and seller suspension capabilities.
- **R-3 Payment & Webhook Latency:** Gateway confirmation delays could cause checkout inconsistencies.  
  *Mitigation:* Employ idempotent webhook handlers and verification to confirm payment capture before order creation.
- **R-4 Return & Delivery Disputes:** Disagreements regarding returned item condition or claims of non-delivery ("Not received").  
  *Mitigation:* Structured dispute escalation workflows where Super Admin reviews evidence and makes binding determinations before releasing settlements.
- **R-5 Inventory Concurrency Conflicts:** Multiple customers attempting to buy the last variant unit simultaneously.  
  *Mitigation:* Atomic database inventory decrement during payment confirmation transactions.

---

# 16. Success Metrics

- **Business Success:** High seller onboarding throughput, accurate commission deductions, zero duplicate payouts during weekly settlement runs, and high return resolution satisfaction.
- **System Success:** $\le 1.5$s catalog search latency, 99.5% uptime, 0% inventory overselling errors, and 100% notification delivery reliability.
- **User Success:** Seamless multi-vendor variant selection, transparent order tracking, frictionless pre-shipment cancellations, and clear 5-day return self-service.

---

# 17. Out of Scope (Version 1)

The following features are explicitly excluded from Version 1:
- Footwear, jewelry, bags, and non-clothing fashion accessories (deferred to Version 2).
- Variant-level differential pricing (e.g., charging more for 3XL).
- Automated banking settlement via direct payout APIs.
- Automated tax (GST) and TCS calculation/filing engine.
- Automated courier API integration (label printing, auto-manifesting).
- Mobile native applications (iOS and Android).
- Customer-to-seller direct chat.
- Coupons, promotional voucher codes, and flash sales engines.
- Customer loyalty points and reward programs.
- Digital products and downloadable goods.
- Multi-currency and cross-border international shipping.

---

# 18. Future Scope

The architecture supports future expansion for:
- Variant-level differential pricing.
- Expansion into footwear, accessories, and lifestyle categories in Version 2.
- Automated bank payouts via payment gateway payout APIs.
- Direct automated logistics integrations (Shiprocket, Delhivery, BlueDart APIs).
- Automated GST / TCS tax reporting modules.
- Customer product reviews, ratings, and fit feedback.
- Seller subscription plans and premium storefront themes.
- Native mobile applications (React Native / Flutter).
- Coupons, gift cards, and promotional discount campaigns.

---

# 19. Acceptance Criteria

### AC-1 Seller Management
- Sellers register as Individual or Business and submit Aadhaar, PAN, address, bank details, and optional GSTIN.
- Super Admin can approve or reject with reason, suspend, or block sellers.
- Seller account statuses conform strictly to `Pending Approval`, `Approved`, `Rejected`, `Suspended`, `Blocked`.
- Sellers can log in and list products only after Super Admin approval.

### AC-2 Category & Commission Governance
- Sellers can request and sell only within approved clothing categories (status: `Requested` $\to$ `Approved`, `Rejected`, `Revoked`).
- Super Admin can configure category-specific size configurations and commission percentages.
- Super Admin can approve, reject, or revoke category access.
- Category commission rates apply automatically to seller orders; Admin direct sales incur 0% commission.

### AC-3 Product & Variant Catalog
- Sellers can create clothing products with multiple variants (Size x Color) using category size sets.
- Each variant has a globally unique SKU and independent inventory count.
- Variant at 0 stock displays as `Out of Stock`; product with all variants at 0 displays as `Out of Stock`.
- Product pricing is configured at the product level.
- Products support Active, Paused ("Currently unavailable"), Hidden, Soft-Deleted, and Removed by Admin states.

### AC-4 Customer Experience & Multi-Vendor Checkout
- Customers can search, filter (category-specific size, color, category, price), and select variants.
- Multi-vendor cart groups items by seller and shows free shipping threshold nudges.
- Checkout captures single payment via gateway and creates immutable financial snapshots per order item.
- Admin-configurable platform shipping rules are applied accurately.

### AC-5 Order Processing, Delivery Confirmation & Cancellation
- Parent order splits into seller-specific order items.
- Sellers update items from `Placed` $\to$ `Packed` $\to$ `Shipped` (recording courier name and tracking ID) $\to$ `Delivered` (manual delivery confirmation).
- Seller's `Delivered` timestamp initiates 5-day return window and 7-day settlement countdown.
- Customers can report "Not received" within 7 days of `Delivered` mark (`Not Received - Under Dispute`), creating an Admin dispute and freezing settlement.
- Customers can cancel items before `Shipped` status. In partial cancellations, shipping fee is retained for remaining items; in full cancellations, shipping fee is fully refunded.

### AC-6 5-Day Returns & Inspection
- Return requests are accepted within 5 days of seller marking `Delivered`.
- Super Admin validates eligibility $\to$ Customer ships item $\to$ Seller inspects (`Verified` or `Rejected on Inspection`) $\to$ Admin resolves disputes $\to$ Gateway refund processed.
- Return shipping cost allocated based on fault (seller bears if defective/wrong; customer bears if fit/preference).

### AC-7 Weekly Manual Settlement
- System compiles items marked `Delivered` $\ge 7$ days ago with no open returns, refunds, or "Not received" disputes.
- Super Admin reviews calculated Net Payable, executes external payout, records bank transaction reference, and locks settlement as immutable.
- Admin direct sales are excluded from seller settlements.

### AC-8 Notifications & Reporting
- Standardized notifications delivered via in-app and email across all 9 master lifecycle events.
- Reports generated for sales, revenue, commissions, settlements, inventory, and verifications.

---

# 20. Pre-Launch Checklist

The following items are operational prerequisites to be completed by the client prior to production go-live (these do not block software engineering or platform development):

| Item # | Prerequisite Task | Responsible Party | Target Deadline |
|---|---|---|---|
| **PLC-1** | **Payment Holding & Gateway Setup:** Client and payment gateway account manager confirm operational terms for holding customer payments prior to manual weekly seller payouts. | Client / Finance Team | Prior to Production Go-Live |
| **PLC-2** | **GST & TCS Obligation Sign-Off:** Client's Chartered Accountant / Tax Advisor confirms tax compliance and marketplace reporting obligations for merchant onboarding. | Client / Tax Advisor | Prior to Production Go-Live |
| **PLC-3** | **Initial Shipping Parameter Values:** Client confirms initial production values for flat shipping fee per seller and free shipping threshold (seeded defaults: ₹79 flat fee, ₹999 free threshold). | Client / Operations Team | Prior to Production Go-Live |

---

# 21. Glossary

| Term | Definition |
|---|---|
| **Super Admin** | The marketplace owner who governs platform policies, verifies sellers, resolves disputes, configures shipping rules, executes weekly settlements, and may sell direct clothing inventory. |
| **Seller** | An approved Individual or Business merchant authorized to list clothing variants and fulfill customer orders. |
| **Customer** | A registered consumer who browses, selects clothing variants, and purchases items via unified checkout. |
| **Clothing Category** | A classification within the clothing hierarchy (Men, Women, Kids) determining seller listing authorization and applicable size configurations. |
| **Product** | A clothing style listed under a single category with a product-level selling price and MRP. |
| **Product Variant** | A specific Size and Color combination of a product possessing a globally unique SKU and distinct inventory count. |
| **SKU (Stock Keeping Unit)** | A globally unique identifier assigned to each individual product variant. |
| **Commission** | The category-based percentage retained by the marketplace from seller clothing sales. |
| **Parent Order** | The overarching customer purchase transaction comprising one or more split seller order items. |
| **Order Item** | A single variant purchased from a specific seller, tracked through independent fulfillment states with immutable financial snapshots. |
| **Delivery Confirmation** | The timestamp recorded when the seller manually marks an order item as `Delivered` (without direct carrier API integration in V1), initiating the 5-day return window and the 7-day settlement holding countdown. |
| **Not Received Dispute** | A formal claim submitted by a customer within 7 calendar days of a seller marking an item `Delivered`, placing the item into `Not Received - Under Dispute` status and freezing weekly seller settlement until Super Admin arbitrates. |
| **Pre-Shipment Cancellation** | The cancellation of an order item before it is marked `Shipped`, triggering an immediate refund. |
| **Return Window** | The 5-calendar-day period after the seller marks an item `Delivered` during which a customer may request a return. |
| **Settlement Holding Period** | The 7-calendar-day period post-`Delivered` mark required before an item becomes eligible for weekly seller payout, provided no return or "Not received" dispute is active. |
| **Weekly Settlement** | The manual administrative payout cycle where eligible earnings minus commissions and deductions are disbursed to sellers. |
| **Admin Direct Retail** | Clothing products owned and sold directly by the Super Admin at 0% commission without settlement generation. |
| **Product Moderation** | Administrative takedown of non-compliant listings with mandatory reason (`Removed by Admin`), without directly editing seller content. |

---

# 22. Open Questions

1. **Category Size Configuration Sets:**
   - What is the definitive initial size chart mapping for each clothing subcategory (e.g., standard Alpha XS–3XL for shirts/tops, numeric waist 28–42 for bottoms, age groups 0–3M, 3–6M, 1–2Y, 3–4Y, etc., for kids)?
2. **Variant-Level Differential Pricing Roadmap:**
   - Will variant-level differential pricing (supported at the schema level via optional override) be enabled in Phase 2 or alongside the V2 expansion?
