# Database Entities Specification Catalog

## 1. Purpose

This directory contains the detailed database entity specifications for the Multi-Vendor Marketplace.

Each entity has its own Markdown specification file defining attributes, data types, validation rules, business constraints, state lifecycles, relationships, indexing, audit rules, and security access policies.

The entity specifications are derived from and strictly aligned with:
1. **docs/SRS.md (v1.2)** — Software Requirements Specification (Single Source of Truth)
2. **docs/database-design.md** — High-Level Relational Database Design Architecture

---

## 2. Entity Catalog & Domain Ownership

| # | Domain | Entity Name | Specification File | Status | Notes |
|---|---|---|---|---|---|
| **01** | Identity & Access | User | [01-User.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/01-User.md) | Synchronized | User accounts, auth credentials |
| **02** | Identity & Access | Role | [02-Role.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/02-Role.md) | Synchronized | System RBAC (`SUPER_ADMIN`, `SELLER`, `CUSTOMER`) |
| **03** | Identity & Access | Session | [03-Session.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/03-Session.md) | Synchronized | Active user sessions |
| **04** | Identity & Access | Refresh Token | [04-Refresh-Token.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/04-Refresh-Token.md) | Synchronized | JWT rotation tokens |
| **05** | Identity & Access | Password Reset Token | [05-Password-Reset-Token.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/05-Password-Reset-Token.md) | Synchronized | Password recovery tokens |
| **06** | Seller Management | Seller Profile | [06-Seller-Profile.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/06-Seller-Profile.md) | Synchronized | Individual/Business store profiles, optional GSTIN |
| **07** | Seller Management | Seller Verification | [07-Seller-Verification.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/07-Seller-Verification.md) | Synchronized | Section 8.6 seller account statuses |
| **08** | Seller Management | Verification Document | [08-Verification-Document.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/08-Verification-Document.md) | Synchronized | Seller identity/business proofs |
| **09** | Seller Management | Seller Address | [09-Seller-Address.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/09-Seller-Address.md) | Synchronized | Dispatch & registered seller address |
| **10** | Category Management | Category | [10-Category.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/10-Category.md) | Synchronized | Clothing-only hierarchy (Men, Women, Kids), SizeSet FK |
| **10a** | Category Management | Size Set | [10a-Size-Set.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/10a-Size-Set.md) | Synchronized | Admin-managed data-driven sizing sets (Alpha, Waist, Kids, Free Size) |
| **10b** | Category Management | Size Set Value | [10b-Size-Set-Value.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/10b-Size-Set-Value.md) | Synchronized | Discrete sizes within a SizeSet, sort order, display names |
| **11** | Category Management | Seller Category | [11-Seller-Category.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/11-Seller-Category.md) | Synchronized | Section 8.8 category permission statuses |
| **12** | Category Management | Category Commission | [12-Category-Commission.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/12-Category-Commission.md) | Synchronized | Percentage commission rates (Admin 0% exemption) |
| **13** | Product Management | Product | [13-Product.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/13-Product.md) | Synchronized | Parent product, title, description, subcategory, base price |
| **13a** | Product Management | Product Variant | [13a-Product-Variant.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/13a-Product-Variant.md) | Synchronized | Size (from subcategory SizeSet), Color, SKU, stock quantity, low stock |
| **14** | Product Management | Product Image | [14-Product-Image.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/14-Product-Image.md) | Synchronized | Image assets, display order, thumbnail |
| **15** | Product Management | Product Specification | [15-Product-Specification.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/15-Product-Specification.md) | Synchronized | Clothing specs (fabric, weave, fit, care instructions) |
| **16** | Inventory Management | Inventory | [16-Inventory.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/16-Inventory.md) | Synchronized | Variant-level stock tracking & reservation |
| **17** | Inventory Management | Inventory History | [17-Inventory-History.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/17-Inventory-History.md) | Synchronized | Inventory audit logs & movement reasons |
| **18** | Customer Management | Customer Profile | [18-Customer-Profile.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/18-Customer-Profile.md) | Synchronized | Customer profile & account details |
| **19** | Customer Management | Address | [19-Address.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/19-Address.md) | Synchronized | Shipping & billing addresses |
| **20** | Shopping Management | Cart | [20-Cart.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/20-Cart.md) | Synchronized | Customer shopping basket container |
| **21** | Shopping Management | Cart Item | [21-Cart-Item.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/21-Cart-Item.md) | Synchronized | Cart line items referencing `variant_id` |
| **22** | Order Management | Order | [22-Order.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/22-Order.md) | Synchronized | Parent order, Section 8.2 & 8.4 order/payment enums |
| **23** | Order Management | Order Item | [23-Order-Item.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/23-Order-Item.md) | Synchronized | Section 8.1 enums, courier tracking, immutable snapshots, dispute SLA & seller proof |
| **24** | Order Management | Order Status History | [24-Order-Status-History.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/24-Order-Status-History.md) | Synchronized | State transition audit log |
| **25** | Payment Management | Payment | [25-Payment.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/25-Payment.md) | Synchronized | Payment gateway transaction & idempotency keys |
| **26** | Payment Management | Payment Transaction | [26-Payment-Transaction.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/26-Payment-Transaction.md) | Synchronized | Low-level gateway webhook/event logs |
| **27** | Return & Refund | Return Request | [27-Return-Request.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/27-Return-Request.md) | Synchronized | Section 8.3 return lifecycle, fault classification, return shipping |
| **28** | Return & Refund | Refund | [28-Refund.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/28-Refund.md) | Synchronized | Actual price refund ledger & gateway reference |
| **29** | Settlement Management | Settlement | [29-Settlement.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/29-Settlement.md) | Synchronized | Weekly batch payout, bank ref, return deductions, carried forward debits |
| **30** | Settlement Management | Settlement Item | [30-Settlement-Item.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/30-Settlement-Item.md) | Synchronized | Section 8.5 status enum (`Not Eligible`, `Eligible`, `Settled`), 7-day hold |
| **30a** | Settlement Management | Seller Adjustment | [30a-Seller-Adjustment.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/30a-Seller-Adjustment.md) | Synchronized | Double-entry debit/credit ledger, negative settlement shortfalls, write-offs |
| **31** | Notification Management | Notification | [31-Notification.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/31-Notification.md) | Synchronized | In-app/email notification dispatch (11 master events) |
| **32** | Notification Management | Notification Template | [32-Notification-Template.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/32-Notification-Template.md) | Synchronized | Message formatting templates |
| **33** | Reporting & Audit | Audit Log | [33-Audit-Log.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/33-Audit-Log.md) | Synchronized | Platform security & administrative audit trails |
| **34** | Reporting & Audit | Activity Log | [34-Activity-Log.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/34-Activity-Log.md) | Synchronized | Seller & customer activity records |
| **35** | Reporting & Audit | Report Metadata | [35-Report-Metadata.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/Entities/35-Report-Metadata.md) | Synchronized | Generated financial/settlement report registry |

---

## 3. Core Architectural & Domain Rules (SRS v1.2)

1. **Clothing-Only Niche & Data-Driven Size Sets**:
   - Product catalog is restricted strictly to clothing (Men, Women, Kids).
   - Sizes are managed via Admin-configurable `SizeSet` and `SizeSetValue` entities. Each subcategory is linked to exactly one `SizeSet`.
   - Product has 1..* `ProductVariant` instances (Size x Color).
   - Pricing is defined at the `Product` base level (MRP and Selling Price); `ProductVariant` holds SKU, size (from subcategory SizeSet), color, and physical inventory counts.
2. **Order Items & Immutable Snapshots**:
   - Every `OrderItem` references a `ProductVariant` (`variant_id`) and captures frozen immutable copies of product title, SKU, size, color, unit price, commission rate %, commission amount, and shipping fee share.
3. **Status Enums Source of Truth**:
   - All status transitions strictly implement the exact string literals defined in **SRS Section 8**.
4. **Delivery, Disputes & Target SLA**:
   - Seller marks items `Delivered` with courier details. This timestamp starts the 5-day return window and 7-day settlement hold.
   - Customer can lodge a "Not received" dispute within 7 days. Super Admin targets resolution within **3 business days** (no auto-resolution). Sellers can attach delivery proofs. Open disputes immediately freeze settlement eligibility.
5. **Fault-Based Return & Settlement Adjustments**:
   - Return shipping is classified as `SELLER_FAULT` (deducted from seller settlement) or `CUSTOMER_FAULT` (borne by customer / deducted from refund).
   - Weekly settlements are manually executed by Super Admin.
   - **Negative Settlement Shortfall:** If Net Payable $< 0$, payout is recorded as ₹0.00 and the shortfall is recorded in the `SellerAdjustment` ledger, carried forward to the next settlement run. Admin may write off debits with a mandatory reason.
   - Super Admin direct retail sales incur 0% commission and never generate settlement items.