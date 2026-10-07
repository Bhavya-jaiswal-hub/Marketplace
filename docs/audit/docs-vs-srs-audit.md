# Cross-Document Audit Report: Documentation vs. docs/SRS.md (v1.1)

> **Document Status:** Reference Baseline Audit  
> **Source of Truth:** [docs/SRS.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/SRS.md) (Version 1.1 — Approved Baseline)  
> **Date Generated:** 2026-10-05

---

## 1. `docs/business-workflows.md`

| Topic | What the file says (exact quote + line) | What the SRS says (Section ID) | Verdict |
| :--- | :--- | :--- | :---: |
| **Order Item Fulfillment Lifecycle** | `"Order status moves PENDING -> CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED."` (L52) | Standardized Order Item statuses are `Placed` $\to$ `Packed` $\to$ `Shipped` $\to$ `Delivered`. (Section 8.1, FR-9, AC-5) | **Conflict** |
| **Product Variants (Size x Color)** | `"Seller creates product with title, description, category, SKU, base price, and inventory count."` (L21) | Products require Size $\times$ Color variants; each variant has its own unique SKU and stock count; price is at product level. (FR-5, BR-3, AC-3) | **Conflict** |
| **Delivery Confirmation & Dispute** | `"Carrier updates delivery status to customer and seller."` (L62) | Seller manually marks item `Delivered` in V1; starts 5-day return window & 7-day settlement hold; customer can raise `Not Received - Under Dispute` within 7 days. (FR-9, BR-11, BR-12, AC-5) | **Missing in file** |
| **Return Flow & Return Shipping Cost** | `"Customer requests return within return window; Admin approves; Seller inspects and issues refund."` (L74) | 5-day window; 8-stage lifecycle (`Verified` / `Rejected on Inspection` $\to$ Admin dispute resolution); fault-based return shipping allocation (seller-fault deducted from payout, customer-fault absorbed). (FR-11, BR-11, AC-6) | **Missing in file** |
| **Cancellation Cutoff** | `"Customer can cancel order before order is processed."` (L58) | Customers may cancel items strictly **before** status reaches `Shipped`. Once `Shipped`, cancellation is disabled. (FR-9, BR-9, C-6, AC-5) | **Conflict** |
| **Admin as Seller** | *Silent on 0% commission, category approval bypass, and settlement exclusion for Admin direct sales.* | Admin listings incur 0% commission, bypass category approval, generate no settlement records, and report in segregated accounting streams. (FR-4, FR-12, FR-14, BR-4, BR-7) | **Missing in file** |

---

## 2. `docs/database-design.md`

| Topic | What the file says (exact quote + line) | What the SRS says (Section ID) | Verdict |
| :--- | :--- | :--- | :---: |
| **Product Variants & Stock Schema** | `CREATE TABLE products ( ... sku VARCHAR UNIQUE, price NUMERIC, stock_quantity INT ... );` (L295-310) *No `product_variants` table defined.* | Database schema must support `ProductVariant` entity with variant-level `sku`, `stock_quantity`, `size`, `color`, and nullable `price_override`, while parent `Product` holds base price. (FR-5, BR-3, C-2, AC-3) | **Conflict** |
| **Order Item Variant Reference** | `CREATE TABLE order_items ( ... product_id UUID REFERENCES products(id), unit_price NUMERIC ... );` (L515-525) | `order_items` must reference `variant_id` (or store variant SKU, size, color snapshot) and immutable financial/commission snapshots. (FR-5, FR-8, BR-8, AC-3) | **Conflict** |
| **Order / Item Status Enums** | `CREATE TYPE order_status AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');` (L492) | Enums must strictly match SRS Section 8: `Placed`, `Packed`, `Shipped`, `Delivered`, `Cancelled`, `Not Received - Under Dispute`. (Section 8.1, 8.2) | **Conflict** |
| **Return Dispute & Fault Tracking** | `CREATE TABLE return_requests ( ... status VARCHAR, reason TEXT ... );` (L610) *Missing fault classification & dispute escalation fields.* | Schema must track return inspection outcomes (`Verified`, `Rejected on Inspection`), fault allocation (`seller_fault` vs `customer_fault`), and return shipping deduction amounts. (FR-11, BR-11, AC-6) | **Missing in file** |
| **Settlement Table Deductions** | `CREATE TABLE settlements ( ... gross_amount NUMERIC, commission_amount NUMERIC, net_payout NUMERIC ... );` (L690) | Net Payable calculation must include dedicated deduction columns for `seller_fault_return_shipping` and `return_adjustments`. (FR-12, BR-12) | **Missing in file** |

---

## 3. `docs/Entities/*`

| File | What the file says (exact quote + line) | What the SRS says (Section ID) | Verdict |
| :--- | :--- | :--- | :---: |
| **`13-Product.md` & `16-Inventory.md`** | `"Product entity stores sku, base_price, compare_price, and inventory status."` (`13-Product.md:L42`) | SKU, inventory count, low-stock threshold, size, and color belong to `ProductVariant`. Product entity holds name, description, category, and base pricing. (FR-5, BR-3, AC-3) | **Conflict** |
| **`22-Order.md` & `23-Order-Item.md`** | `"Status: PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED"` (`22-Order.md:L55`) | Statuses must match SRS Section 8.1 / 8.2 (`Placed`, `Packed`, `Shipped`, `Delivered`, `Cancelled`, `Not Received - Under Dispute`). `Order-Item` must link to `variant_id`. (Section 8.1, 8.2, FR-8) | **Conflict** |
| **`27-Return-Request.md`** | `"Statuses: PENDING, APPROVED, REJECTED, COMPLETED"` (L38) | Return lifecycle has 8 explicit statuses: `Requested`, `Approved`, `Rejected`, `In Transit`, `Received`, `Verified`, `Rejected on Inspection`, `Refunded`. (Section 8.3, FR-11) | **Conflict** |
| **`29-Settlement.md` & `30-Settlement-Item.md`** | `"Net amount = Gross sales - Platform commission"` (`29-Settlement.md:L45`) | Net Payable formula must include deduction for seller-fault return shipping; eligibility must check that item is not in `Not Received - Under Dispute`. (FR-12, BR-12, Section 8.5) | **Conflict** |
| **`Readme.md` (Entities Catalog)** | *No `ProductVariant` or `VariantInventory` entity catalogued in the master entity index.* (L12-40) | Product Variants are core entities in Version 1. (FR-5, BR-3, AC-3) | **Missing in file** |

---

## 4. `docs/api-design.md` & `docs/api/*`

| File | What the file says (exact quote + line) | What the SRS says (Section ID) | Verdict |
| :--- | :--- | :--- | :---: |
| **`docs/api/product-management.md`** | `POST /products` payload accepts single `sku` and `stock_quantity` directly on product body. (L55-70) | Product creation must accept variant array ($\text{Size} \times \text{Color}$ matrix) with per-variant SKU and stock quantity using category size sets. (FR-5, BR-3, AC-3) | **Conflict** |
| **`docs/api/order-management.md`** | Fulfillment endpoints use `PATCH /orders/items/:id/status` with `CONFIRMED` / `PROCESSING`. (L42) | Endpoints must support `Packed`, `Shipped` (recording courier & AWB), `Delivered` (manual seller mark), and `POST /orders/items/:id/report-not-received`. (FR-9, Section 8.1, AC-5) | **Conflict / Missing** |
| **`docs/api/return-refund-management.md`** | Endpoints cover basic `request` and `admin-approve`, omitting seller physical inspection and Admin dispute arbitration routes. (L30-60) | API must expose seller inspection endpoints (`/verify`, `/reject-inspection`) and Admin dispute arbitration endpoint (`/resolve-dispute`). (FR-11, BR-11, UC-ADM-07, UC-SEL-06) | **Missing in file** |
| **`docs/api/settlement-management.md`** | Settlement preview and compilation do not verify the 7-day "Not received" dispute block or deduct seller-fault return shipping. (L25-45) | Weekly manual settlement calculation endpoint must filter out items with active disputes and apply the full Net Payable deduction formula. (FR-12, BR-12, AC-7) | **Conflict / Missing** |

---

## 5. `docs/architecture.md`

| Topic | What the file says (exact quote + line) | What the SRS says (Section ID) | Verdict |
| :--- | :--- | :--- | :---: |
| **Product Variants Architecture** | `"Product Variants (Size, Color, etc.) are planned for Phase 2 / Future Scope."` (L2381) | Variants (Size x Color) are core to Version 1 architecture and database models. (Section 5, FR-5, AS-2, AC-3) | **Conflict** |
| **Logistics Integration Model** | `"Logistics Module handles automated courier webhook integration for delivery confirmation."` (L512) | V1 has no courier API integration; Seller manually marks Delivered; customer can report "Not received" within 7 days. (FR-9, Section 17) | **Conflict** |
| **Admin Direct Selling Architecture** | *Lacks architectural segregation rules for Admin direct retail.* (L410-435) | Architectural separation required: Admin listings bypass category approval, incur 0% commission, generate no settlement items, and report separately. (FR-4, FR-12, BR-7) | **Missing in file** |

---

## 6. `docs/module-identification.md`

| Module ID | What the file says (exact quote + line) | What the SRS says (Section ID) | Verdict |
| :--- | :--- | :--- | :---: |
| **MOD-05: Product Management** | `"Product variants are future scope and are excluded from Version 1."` (L202) | Clothing variants (Size x Color) are mandatory in Version 1. (Section 5, FR-5, BR-3, AC-3) | **Conflict** |
| **MOD-09: Order Management** | Lists fulfillment transitions as `PENDING -> CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED`. (L254) | Order item fulfillment follows `Placed` $\to$ `Packed` $\to$ `Shipped` $\to$ `Delivered`. (Section 8.1, FR-9) | **Conflict** |
| **MOD-11: Returns & Refunds** | Mentions generic return processing without fault-based return shipping cost allocation. (L288) | Detailed return inspection rules: seller bears return shipping if seller-fault; customer bears if customer-fault. (FR-11, BR-11, AC-6) | **Missing in file** |
| **MOD-12: Settlements** | Does not list customer "Not received" dispute freeze mechanism or seller-fault shipping fee deductions. (L303) | Weekly manual settlement compilation rules: 7+ days elapsed post-Delivered, freeze on active dispute, deduction for seller-fault returns. (FR-12, BR-12, AC-7) | **Missing in file** |

---

## 7. `docs/decisions/*`

| File | What the file says (exact quote + line) | What the SRS says (Section ID) | Verdict |
| :--- | :--- | :--- | :---: |
| **`implementation-baseline.md`** | `"Product variants are excluded from Version 1. Each product has its own SKU, price, and inventory."` (L13) | Variants (Size x Color) with per-variant SKU and stock are IN Version 1. (Section 5, FR-5, BR-3, AC-3) | **Conflict** |
| **`Multi_Vendor_...Completed.md`** | `"PROD-01: Are product variants required in Version 1? No product variants in Version 1."` (L64) | Overridden by SRS v1.1: Clothing variants (Size x Color) are included in V1. (Section 5, FR-5, AS-2) | **Conflict** |
| **`Multi_Vendor_...Completed.md`** | `"INV-07: What order statuses are required for fulfillment? Pending, Confirmed, Processing, Shipped, Delivered..."` (L85) | Overridden by SRS v1.1 Section 8.1: `Placed`, `Packed`, `Shipped`, `Delivered`, `Cancelled`, `Not Received - Under Dispute`. | **Conflict** |

---

## 8. `docs/adr/*`

| File | Content Status | Alignment with SRS | Verdict |
| :--- | :--- | :--- | :---: |
| **`ADR-001-modular-monolith.md`** | Empty stub file (0 bytes / 1 line). | Architecture aligns with SRS NFR-2 (Modular Monolith). Content needs to be written. | **Missing in file** |
| **`ADR-002-authentication-strategy.md`** | Empty stub file (0 bytes / 1 line). | Strategy aligns with SRS FR-1, NFR-3 (JWT / RBAC). Content needs to be written. | **Missing in file** |
| **`ADR-003-database-selection.md`** | Evaluates and selects PostgreSQL + Prisma ORM. (L1-27) | Matches SRS NFR-4 (Relational PostgreSQL with ACID boundaries). | **Match** |
| **`ADR-004-file-storage-strategy.md`** | Empty stub file (0 bytes / 1 line). | Aligns with SRS FR-2, NFR-3 (Protected KYC bucket). Content needs to be written. | **Missing in file** |
| **`ADR-005-deployment-strategy.md`** | Specifies Docker Compose containerization. (L1-30) | Matches SRS NFR-2 deployment baseline. | **Match** |

---

## 9. `feature-specs/*`

| File | What the file says (exact quote + line) | What the SRS says (Section ID) | Verdict |
| :--- | :--- | :--- | :---: |
| **`feature-specs/product-management.md`** | `"Version 1 supports one category per product. Product variants and multi-category products require a separate enhancement..."` (L7) | Variants (Size x Color) are in V1 with per-variant SKU and stock. (FR-5, BR-3, AC-3) | **Conflict** |
| **`feature-specs/product-management.md`** | Lists product statuses as `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `ACTIVE`, `INACTIVE`, `SUSPENDED`, `DELETED`. (L28) | Product visibility statuses conform strictly to SRS Section 8.7: `Active`, `Paused`, `Hidden`, `Soft-Deleted`, `Removed by Admin`. (Section 8.7, BR-4) | **Conflict** |

---

## 10. `implementation/*`

| File | What the file says (exact quote + line) | What the SRS says (Section ID) | Verdict |
| :--- | :--- | :--- | :---: |
| **`coding-plan.md`** | `"- [x] One category per product, no variants, globally unique SKU, and per-product inventory."` (L147) | Phase 3 implementation must support size x color variants with variant-level SKU and stock. (FR-5, BR-3, AC-3) | **Conflict** |
| **`coding-plan.md`** | `"- [x] Order status and seller fulfillment workflow (PENDING -> CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED)."` (L222, L241) | Order fulfillment workflow must implement `Placed` $\to$ `Packed` $\to$ `Shipped` $\to$ `Delivered`. (Section 8.1, FR-9, AC-5) | **Conflict** |
| **`roadmap.md`** | `"- [x] Confirm no product variants, globally unique SKUs..."` (L41) & `"Version 1 scope exclusions, including variants..."` (L176) | Roadmap Phase 3 must include clothing variant matrix implementation. (FR-5, BR-3, AC-3) | **Conflict** |
| **`progress tracker.md`** | `"Documentation synchronization: Complete"` (L13) | Secondary docs currently hold legacy V1.0 decisions that conflict with SRS v1.1. | **Conflict** |

---

# Prioritised List of Documents Needing Fixing

### Tier 1: Schema & Data Integrity Blockers (Immediate Risk to Backend Development)
1. **`docs/database-design.md`**
2. **`docs/Entities/*` (`13-Product.md`, `16-Inventory.md`, `22-Order.md`, `23-Order-Item.md`, `27-Return-Request.md`, `29-Settlement.md`, `30-Settlement-Item.md`, `Readme.md`)**

### Tier 2: API & Contract Blockers (Breaks Frontend/Backend Integration)
3. **`docs/api-design.md` & `docs/api/*` (`product-management.md`, `order-management.md`, `return-refund-management.md`, `settlement-management.md`)**
4. **`docs/business-workflows.md`**

### Tier 3: Architecture & Module Specifications (High Architectural Drift)
5. **`docs/module-identification.md`**
6. **`docs/architecture.md`**
7. **`feature-specs/product-management.md`**

### Tier 4: Execution Tracking & Historical Decisions (Project Management Clarity)
8. **`implementation/coding-plan.md` & `implementation/roadmap.md`**
9. **`docs/decisions/implementation-baseline.md` & `docs/decisions/Multi_Vendor_Marketplace_Client_Clarification_Completed.md`**
10. **`docs/adr/ADR-001`, `ADR-002`, `ADR-004`**
