# Database Design

## Document Information

| Field | Value |
|---|---|
| Document Name | Database Design |
| Product | Multi-Vendor Marketplace (Clothing & Apparel) |
| Version | 1.2 |
| Status | Approved Baseline Specification |
| Prepared By | Bhavya Jaiswal |
| Approved By | Super Admin (Client) |
| Source of Truth | docs/SRS.md (v1.2) |
| Last Updated | 2026-10-07 |

---

# 1. Purpose

## 1.1 Overview

This document defines the high-level database architecture, domain models, entity relationships, constraints, and data organization for the Multi-Vendor Clothing Marketplace.

It establishes the normalized data model required to support multi-vendor shopping, product variants (Size $\times$ Color), Admin-managed data-driven Size Sets, independent variant inventory, split order fulfillment, 5-day return dispute inspection workflows, 3-business-day target SLA for "Not received" disputes, weekly manual seller settlements with negative balance handling via a Seller Adjustment debit ledger, and segregated Super Admin direct retail operations.

---

# 2. Database Design Principles

The database is designed according to the following foundational principles:

- **DP-1 Business-Oriented & Domain-Driven:** Data models reflect business domains (Identity, Seller, Category, Size Sets, Product, Inventory, Customer, Shopping, Order, Payment, Return/Refund, Settlement, Seller Adjustments, Notifications, Audit).
- **DP-2 Single Source of Truth:** Each business attribute resides in its owning domain; cross-domain snapshots are explicitly marked as historical immutable snapshots.
- **DP-3 Referential Integrity & ACID Guarantees:** Foreign key constraints, unique constraints, and atomic multi-table transaction boundaries (order placement, inventory deduction, settlement compilation) prevent orphaned or inconsistent records.
- **DP-4 Normalization:** Data is normalized to 3NF, separating product catalog definitions from variant options, data-driven size sets, and operational inventory.
- **DP-5 Immutable Financial Records (SRS C-5):** Completed orders, captured payments, processed refunds, settled payouts, and order-item snapshots (price, SKU, size, color, commission rate/amount, shipping fee share) cannot be altered or deleted.
- **DP-6 Ledger-Based Adjustments & Shortfall Handling:** Financial shortfalls from negative settlements, dispute charges, and seller-fault returns are managed via a dedicated `SellerAdjustment` debit ledger rather than recording negative settlement records.
- **DP-7 Soft Deletion & Auditability:** Entities with historical dependencies (Users, Sellers, Categories, Products, Variants) utilize soft deletion (`deleted_at` or status transitions) to protect historical referential integrity.
- **DP-8 Scalability & Performance (SRS NFR-1, NFR-2):** Structured for horizontal read scaling, indexing on foreign keys, tenant IDs (`seller_id`, `customer_id`), order states, and composite unique keys.

---

# 3. Database Overview & Business Domains

```
Identity & Access Management (User, Role, Session, RefreshToken, PasswordResetToken)
  │
  ├─── Seller Management (SellerProfile, SellerVerification, VerificationDocument, SellerAddress)
  │      │
  │      ├─── Category & Size Management (Category, SizeSet, SizeSetValue, SellerCategory, CategoryCommission)
  │      │      │
  │      │      └─── Product Management (Product, ProductVariant, ProductImage, ProductSpecification)
  │      │             │
  │      │             └─── Inventory Management (Inventory, InventoryHistory)
  │      │
  ├─── Customer Management (CustomerProfile, Address)
  │      │
  │      └─── Shopping Management (Cart, CartItem)
  │             │
  │             └─── Order Management (Order, OrderItem, OrderStatusHistory)
  │                    │
  │                    ├─── Payment Management (Payment, PaymentTransaction)
  │                    ├─── Return & Refund Management (ReturnRequest, Refund)
  │                    └─── Settlement Management (Settlement, SettlementItem, SellerAdjustment)
  │
  └─── Operational & Compliance (Notification, NotificationTemplate, AuditLog, ActivityLog, ReportMetadata)
```

---

# 4. Entity Identification by Domain

### 4.1 Identity & Access Management
- **User:** Primary authentication entity (`SUPER_ADMIN`, `SELLER`, `CUSTOMER`).
- **Role:** RBAC system role definitions.
- **Session / Refresh Token / Password Reset Token:** Authentication security lifecycle entities.

### 4.2 Seller Management
- **Seller Profile:** Merchant details (`INDIVIDUAL` or `BUSINESS`), display name, contact info, and **optional GSTIN** (SRS FR-2).
- **Seller Verification:** KYC verification lifecycle tracking (SRS FR-2).
- **Verification Document:** PAN, Aadhaar, address proof, photograph, and bank account details.
- **Seller Address:** Merchant pickup and return facility addresses.

### 4.3 Category & Size Set Management
- **Category:** Clothing classification tree (Men's, Women's, Kids' apparel) linked to assigned `size_set_id` (SRS FR-3).
- **Size Set:** Admin-managed data entity defining sizing standards (Alpha Standard, Men's Waist, Women's Waist, Kids' Age Brackets, Free Size) (SRS FR-3, BR-3).
- **Size Set Value:** Discrete size labels, codes, and numerical sort orders within a Size Set (SRS FR-3).
- **Seller Category:** Seller authorization requests and permission grants (`Requested`, `Approved`, `Rejected`, `Revoked`) (SRS FR-3, Section 8.8).
- **Category Commission:** Category-level platform commission percentages, with explicit **0% commission** for Super Admin direct retail (SRS FR-4, BR-7).

### 4.4 Product Management
- **Product:** Parent clothing style entity storing title, description, subcategory, and **product-level pricing** (Selling Price and Compare At Price / MRP) (SRS FR-5, BR-3, AC-3).
- **Product Variant:** Purchasable combination of **Size** (from subcategory SizeSet) $\times$ **Color**, globally unique **SKU**, stock quantity, low-stock threshold, and nullable `price_override` (reserved for future scope) (SRS FR-5, BR-3).
- **Product Image:** Multi-image gallery associated with products and individual variants.
- **Product Specification:** Fabric, wash care, fit, and pattern specifications.

### 4.5 Inventory Management
- **Inventory:** Physical stock counts (`stock_quantity`) and reservation locks (`reserved_quantity`) tracked at the **Product Variant** level (SRS FR-6, BR-5).
- **Inventory History:** Audit ledger of stock movements (purchases, cancellations, returns, manual restocks).

### 4.6 Customer Management & Shopping
- **Customer Profile:** Registered consumer information.
- **Address:** Customer delivery addresses with 6-digit Indian PIN code validation.
- **Cart:** Customer's active shopping cart session.
- **Cart Item:** Specific `ProductVariant` and requested quantity grouped by seller for shipping threshold calculations (SRS FR-7, BR-8).

### 4.7 Order Management
- **Order (Parent Order):** Consolidated customer checkout transaction tracking derived parent status (SRS Section 8.2) and unified payment capture.
- **Order Item:** Split seller order line item referencing `variant_id`, tracking fulfillment states (`Placed`, `Packed`, `Shipped`, `Delivered`, `Cancelled`, `Not Received - Under Dispute`), courier tracking, immutable financial snapshots, customer "Not received" dispute fields (`sla_due_at`, `seller_proof_notes`, `seller_proof_document_url`, `resolution_outcome`, `resolved_by`, `resolved_at`) (SRS FR-9, Section 8.1).
- **Order Status History:** Immutable audit log of state transitions.

### 4.8 Payment, Returns, Settlements & Adjustments
- **Payment Transaction:** Payment gateway transaction details, gateway IDs, payment method, captured amounts, and idempotency tokens (SRS FR-10).
- **Return Request:** 8-stage return lifecycle tracking (`Requested`, `Approved`, `Rejected`, `In Transit`, `Received`, `Verified`, `Rejected on Inspection`, `Refunded`), fault classification (`SELLER_FAULT` / `CUSTOMER_FAULT`), and return shipping deductions (SRS FR-11, Section 8.3).
- **Refund:** Programmatic gateway refund records based on actual price paid (tax-inclusive) (SRS FR-10, FR-11).
- **Settlement:** Weekly administrative payout records executed by Super Admin with external **Bank Transaction Reference** numbers, accounting for gross sales, commissions, return deductions, seller-fault return shipping, applied carried-forward debits, and shortfall recording (SRS FR-12, Section 8.5).
- **Settlement Item:** Itemized calculation per delivered order item (SRS FR-12, BR-12).
- **Seller Adjustment:** Double-entry ledger tracking debits and credits (settlement shortfalls, dispute charges, seller-fault return shipping, manual adjustments, Admin write-offs) applied against weekly payouts (SRS FR-12, BR-12).

---

# 5. Standardized Status Enumerations (Single Source of Truth)

All database column enums must match **SRS Section 8** exactly:

| Status Group | SRS Section | Permitted Database Enum Values |
|---|---|---|
| **Order Item Status** | Section 8.1 | `Placed`, `Packed`, `Shipped`, `Delivered`, `Cancelled`, `Not Received - Under Dispute` |
| **Parent Order Status** | Section 8.2 | `Placed`, `Partially Shipped`, `Partially Delivered`, `Delivered`, `Partially Cancelled`, `Cancelled`, `Under Dispute` |
| **Return Status** | Section 8.3 | `Requested`, `Approved`, `Rejected`, `In Transit`, `Received`, `Verified`, `Rejected on Inspection`, `Refunded` |
| **Payment Status** | Section 8.4 | `Pending`, `Paid`, `Failed`, `Partially Refunded`, `Refunded` |
| **Settlement Item Status** | Section 8.5 | `Not Eligible`, `Eligible`, `Settled` |
| **Seller Account Status** | Section 8.6 | `Pending Approval`, `Approved`, `Rejected`, `Suspended`, `Blocked` |
| **Product Visibility Status** | Section 8.7 | `Active`, `Paused`, `Hidden`, `Soft-Deleted`, `Removed by Admin` |
| **Category Permission Status** | Section 8.8 | `Requested`, `Approved`, `Rejected`, `Revoked` |

---

# 6. Entity Relationships & Schema Architecture

```
User (1) ── (1) SellerProfile (1) ── (Many) Product (1) ── (Many) ProductVariant (1) ── (1) Inventory
 │                                              │                      │
 │                                              │                      ├── (Many) SizeSetValue (1) ── (1) SizeSet
 │ (1)                                          │                      │
 └── (1) CustomerProfile (1)                    │                      ▼
            │                                   │                 CartItem / OrderItem
            └── (1) Cart (1) ── (Many) CartItem ┘                      │
            │                                                          │
            └── (Many) Order (1) ── (Many) OrderItem (1) ──────────────┤
                         │                     │                       │
                         └── (Many) Payment    ├── (0..1) ReturnReq ───┤
                                               │           │           │
                                               │           └── Refund ─┘
                                               │
                                               ├── (0..1) SettlementItem (Many) ── (1) Settlement
                                               │                                          │
                                               └── (Many) SellerAdjustment (Many) ────────┘
```

### Key Relational Rules:
1. **`SizeSet` $\to$ `SizeSetValue` (1 : Many) & `Category` (1 : Many):** Each subcategory points to one `SizeSet`. When creating a `ProductVariant`, the variant size is validated against the subcategory's `SizeSetValue` records.
2. **`Product` $\to$ `ProductVariant` (1 : Many):** Each clothing product defines one or more variants (Size $\times$ Color). `Product` stores the shared base price; `ProductVariant` stores SKU, size, color, and stock.
3. **`ProductVariant` $\to$ `OrderItem` (1 : Many):** Order items point directly to the purchased `variant_id` and copy snapshot fields (`sku`, `size`, `color`, `unit_price`, `commission_rate`, `commission_amount`, `shipping_fee_share`).
4. **`OrderItem` $\to$ `SettlementItem` (1 : 0..1):** Third-party seller order items generate at most one settlement item upon reaching eligibility (delivered $\ge 7$ days, no open disputes). Admin direct sales never generate settlement items.
5. **`Settlement` $\leftrightarrow$ `SellerAdjustment` (1 : Many):** Settlements net pending debits from `SellerAdjustment`. If the calculated net amount is negative, payout is ₹0.00 and a new shortfall `SellerAdjustment` debit record is logged.

---

# 7. Critical Business Constraints & Financial Rules

### 7.1 Fulfillment & Cancellation Rules (SRS FR-9, BR-9, C-6)
- Customers can cancel order items strictly **before** status reaches `Shipped`. Once `Shipped`, cancellation is disabled.
- Partial cancellation retains the flat shipping fee if $\ge 1$ item in the seller shipment remains active; full cancellation refunds the shipping fee in full.
- Sellers manually mark items `Delivered` in Version 1 (recording courier & AWB at `Shipped`). The `Delivered` timestamp starts the 5-day return window and 7-day settlement hold.

### 7.2 Return & Dispute Rules (SRS FR-9, FR-11, BR-11, AC-5, AC-6)
- Return requests are accepted within **5 calendar days** of the `Delivered` mark.
- Customer reporting of "Not received" is accepted within **7 calendar days** of the `Delivered` mark, transitioning the item to `Not Received - Under Dispute` and freezing settlement eligibility.
- Super Admin targets dispute resolution within **3 business days** (no automated timeout resolution; overdue disputes flagged on Admin dashboard).
- Dispute outcomes:
  - `CUSTOMER_REFUND_UPHELD`: Customer is refunded in full and a `DISPUTE_CHARGE_DEBIT` is recorded in `SellerAdjustment`.
  - `DISPUTE_REJECTED`: Dispute is closed and item becomes settlement-eligible (once the 7-day post-delivery hold completes).
- Fault allocation determines return shipping deductions:
  - `SELLER_FAULT`: Return shipping fee is deducted from seller weekly payout.
  - `CUSTOMER_FAULT`: Return shipping fee is absorbed by customer.

### 7.3 Settlement, Negative Balance & Write-Off Rules (SRS FR-12, BR-12, AC-7)
- Net Payable Formula:
  $$\text{Net Calculated} = \text{Gross Delivered Sales} + \text{Shipping Collected} - \text{Platform Commission} - \text{Return Deductions} - \text{Seller-Fault Return Shipping} - \text{Carried-Forward Debits}$$
- If $\text{Net Calculated} \ge 0$: $\text{Payout Amount} = \text{Net Calculated}$, and applied debits are marked `APPLIED`.
- If $\text{Net Calculated} < 0$: $\text{Payout Amount} = \text{₹0.00}$. The shortfall is recorded as a `SETTLEMENT_SHORTFALL_DEBIT` in `SellerAdjustment` and carried forward.
- Super Admin may waive/write off an uncollectible seller debit balance with mandatory audit justification (`written_off_by`, `written_off_at`, `written_off_reason`).
- Admin direct sales incur 0% commission and are excluded from the settlement engine.
- Completed settlements require an external `Bank Transaction Reference` and are permanently immutable.

---

# 8. Indexing Strategy

- **Unique Constraints & Indexes:**
  - `users(email)`
  - `seller_profiles(user_id)`
  - `size_sets(code)`
  - `size_set_values(size_set_id, value)`
  - `categories(slug)`
  - `seller_categories(seller_id, category_id)`
  - `product_variants(sku)` (Globally unique)
  - `product_variants(product_id, size, color)`
  - `orders(order_number)`
  - `settlement_items(order_item_id)`
- **Query Performance Indexes:**
  - `categories(size_set_id)`
  - `size_set_values(size_set_id, sort_order)`
  - `products(seller_id, status)`
  - `products(category_id, status)`
  - `order_items(order_id, seller_id, status)`
  - `order_items(status, delivered_at)` (Settlement eligibility batch jobs)
  - `order_items(dispute_status, sla_due_at)` (Dispute dashboard & SLA monitoring)
  - `return_requests(order_item_id, status)`
  - `settlements(seller_id, status, period_to)`
  - `seller_adjustments(seller_id, status, direction)`

---

# 9. Future Database Evolution (SRS Section 18)

The schema is structured to accommodate future phases without breaking structural changes:
1. **Variant-Level Differential Pricing:** The `product_variants.price_override` column is provisioned as nullable and ignored in V1 billing logic.
2. **Footwear & Accessories Expansion (V2):** SizeSet schema natively supports extensible shoe sizes, dimension sets, and accessory standards.
3. **Automated Banking Payouts:** Settlement tables support gateway payout batch IDs for future API payout automation.
