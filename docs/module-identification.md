# Module Identification

## Document Information

| Field | Value |
|---|---|
| Document Name | Module Identification |
| Product | Multi-Vendor Clothing Marketplace |
| Version | 1.2 |
| Status | Approved Baseline Specification |
| Prepared By | Bhavya Jaiswal |
| Approved By | Super Admin (Client) |
| Source of Truth | [docs/SRS.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/SRS.md) (v1.2) |
| Last Updated | 2026-10-07 |

---

# 1. Purpose

This document identifies and defines the core business modules of the Multi-Vendor Clothing Marketplace.

Each module represents an independent, cohesive business capability with clearly bounded responsibilities, data ownership, and domain interfaces.

The objectives of this document are to:
- Decompose the marketplace into modular, domain-driven capabilities.
- Define explicit responsibilities and boundaries for each module.
- Prevent overlapping or duplicate business logic across modules.
- Ensure strict alignment with **docs/SRS.md (v1.2)**.
- Guide architecture, database schema, API design, and feature specifications.

---

# 2. Module Design Principles

- **2.1 Single Responsibility:** Every module represents exactly one business domain capability.
- **2.2 Loose Coupling:** Modules communicate through well-defined service interfaces and events, avoiding hidden database couplings.
- **2.3 High Cohesion:** All business rules and state transitions for an entity remain within its owning module.
- **2.4 Clear Ownership:** Every business operation and entity belongs to exactly one owning module.
- **2.5 Immutable Historical Financials (SRS C-5):** Financial calculations (order snapshots, commissions, returns, settlements) are permanently locked once committed.
- **2.6 Independent Testability:** Each module can be unit- and integration-tested independently.

---

# 3. High-Level Module List

| Module ID | Module Name | Domain Scope |
|---|---|---|
| **MOD-01** | Authentication & Authorization | User authentication, sessions, JWT rotation, RBAC guards |
| **MOD-02** | User Management | Customer, Seller, and Admin profile management, addresses |
| **MOD-03** | Seller Verification | Seller KYC onboarding, document checks, lifecycle statuses |
| **MOD-04** | Category & Size Set Management | Clothing category tree, data-driven Size Sets, commissions |
| **MOD-05** | Product Management | Clothing catalog, Size $\times$ Color variants, SKUs, base pricing |
| **MOD-06** | Inventory Management | Variant-level stock tracking, atomic reservation, restocking |
| **MOD-07** | Customer Marketplace | Storefront catalog browsing, faceted filtering, PDPs |
| **MOD-08** | Cart & Shipping Guidance | Multi-vendor cart grouping, free shipping threshold nudges |
| **MOD-09** | Order & Dispute Management | Split order fulfillment, courier tracking, "Not received" disputes |
| **MOD-10** | Payment Management | Gateway capture, idempotency, refund processing |
| **MOD-11** | Return & Refund Management | 5-day return lifecycle, seller inspection, fault allocation |
| **MOD-12** | Settlement & Adjustment Management | Weekly manual payouts, Seller Adjustment debit ledger, write-offs |
| **MOD-13** | Notification Management | In-app and email dispatch for 11 master lifecycle events |
| **MOD-14** | Reporting & Analytics | Sales, GMV, Admin direct retail, settlements, audit reports |
| **MOD-15** | Admin Governance & Moderation | Administrative product takedowns, seller suspensions, oversight |

---

# 4. Module Detailed Specifications

## MOD-01 Authentication & Authorization
- **Purpose:** Secure identity verification and access governance.
- **Responsibilities:** Login, registration, token refresh, password recovery, session lifecycle, and RBAC enforcement (`SUPER_ADMIN`, `SELLER`, `CUSTOMER`).

## MOD-02 User Management
- **Purpose:** Manages core user identity profiles and delivery addresses.
- **Responsibilities:** Customer profile updates, seller business metadata, Admin account settings, and 6-digit Indian PIN code address management.

## MOD-03 Seller Verification
- **Purpose:** Governs seller onboarding and KYC authenticity (SRS FR-2, BR-1).
- **Responsibilities:** Ingestion and verification of Aadhaar, PAN, address proofs, photograph, bank details, and optional GSTIN; lifecycle transitions (`Pending Approval`, `Approved`, `Rejected`, `Suspended`, `Blocked`).

## MOD-04 Category & Size Set Management
- **Purpose:** Maintains the clothing hierarchy and sizing standards (SRS FR-3, BR-2, BR-3).
- **Responsibilities:** Clothing taxonomy (Men's, Women's, Kids' clothing), Admin-managed data-driven **Size Sets** (`SizeSet`, `SizeSetValue`), subcategory size set assignments, seller category authorization (`Requested`, `Approved`, `Rejected`, `Revoked`), and category commission configuration (0% on Admin direct sales).

## MOD-05 Product Management
- **Purpose:** Governs the clothing product catalog and variant definitions (SRS FR-5, BR-3, BR-4, BR-6).
- **Responsibilities:** Clothing product CRUD, Size $\times$ Color **Product Variants**, globally unique variant SKUs, product-level pricing (Selling Price and MRP), image galleries, and visibility states (`Active`, `Paused`, `Hidden`, `Soft-Deleted`, `Removed by Admin`).

## MOD-06 Inventory Management
- **Purpose:** Tracks operational inventory counts at the variant SKU level (SRS FR-6, BR-5).
- **Responsibilities:** Physical stock tracking (`stock_quantity`), low-stock threshold alerting, atomic checkout stock reservation, out-of-stock state triggers, and restock increments on cancellations/returns.

## MOD-07 Customer Marketplace
- **Purpose:** Provides the storefront browsing and discovery experience (SRS FR-7, UC-CUS-02).
- **Responsibilities:** Catalog search, faceted filtering (subcategory, size, color, price range, in-stock), and product detail pages with variant selector and 5-day return policy notice.

## MOD-08 Cart & Shipping Guidance
- **Purpose:** Manages the multi-vendor shopping basket and checkout preparation (SRS FR-7, FR-8, BR-8).
- **Responsibilities:** Adding variants to cart, per-seller item grouping, and dynamic shipping progress nudges (*"Add ₹X more for free shipping from this seller"*).

## MOD-09 Order & Dispute Management
- **Purpose:** Governs the split-order lifecycle, delivery confirmation, and delivery disputes (SRS FR-8, FR-9, BR-9, BR-11).
- **Responsibilities:** Split parent order into seller `OrderItem` records; immutable snapshot preservation; fulfillment transitions (`Placed` $\to$ `Packed` $\to$ `Shipped` [courier & AWB] $\to$ `Delivered` [manual seller confirmation]); pre-shipment cancellations before `Shipped`; "Not received" dispute arbitration (target 3 business days SLA, seller proof upload, Admin uphold/reject resolution).

## MOD-10 Payment Management
- **Purpose:** Manages payment gateway transactions and fund capture (SRS FR-10, NFR-4).
- **Responsibilities:** Gateway checkout session initiation, webhook verification, idempotent payment capture, and automated refund dispatch.

## MOD-11 Return & Refund Management
- **Purpose:** Manages the 5-day post-delivery return lifecycle and physical inspections (SRS FR-11, BR-11, AC-6).
- **Responsibilities:** 8-stage return lifecycle (`Requested`, `Approved`, `Rejected`, `In Transit`, `Received`, `Verified`, `Rejected on Inspection`, `Refunded`), seller physical inspection, Admin dispute resolution, and fault-based return shipping fee allocation.

## MOD-12 Settlement & Adjustment Management
- **Purpose:** Governs weekly manual seller payouts, debit carry-forward, and write-offs (SRS FR-12, BR-12, AC-7).
- **Responsibilities:** Weekly eligibility compilation (7+ days post-`Delivered`, no open disputes), Net Payable formula calculation, zero-payout floor on negative balances, **Seller Adjustment Ledger** debit carry-forward, Admin debit write-offs with mandatory audit reason, and bank transaction reference recording.

## MOD-13 Notification Management
- **Purpose:** Dispatches transactional alerts across in-app feeds and email (SRS FR-13, BR-13, AC-8).
- **Responsibilities:** Automated dispatch for the 11 master lifecycle events.

## MOD-14 Reporting & Analytics
- **Purpose:** Generates business intelligence and operational audits (SRS FR-14).
- **Responsibilities:** Sales & revenue reports, GMV, platform commission, segregated Admin direct retail reports, settlement payout ledgers, and inventory movement logs.

## MOD-15 Admin Governance & Moderation
- **Purpose:** Centralized administrative control and platform moderation (SRS BR-6, BR-7).
- **Responsibilities:** Seller KYC review, product takedown (`Removed by Admin`), seller suspension, dispute arbitration, shipping parameter configuration, and manual settlement execution.

---

# 5. Module Dependency Order

```
MOD-01 Authentication & Authorization
  ↓
MOD-02 User Management ──→ MOD-03 Seller Verification
  ↓                             ↓
MOD-04 Category & Size Set Management
  ↓
MOD-05 Product Management ──→ MOD-06 Inventory Management
  ↓
MOD-07 Customer Marketplace ──→ MOD-08 Cart & Shipping Guidance
  ↓
MOD-09 Order & Dispute Management ──→ MOD-10 Payment Management
  ↓
MOD-11 Return & Refund Management ──→ MOD-12 Settlement & Adjustment Management
  ↓
MOD-13 Notification Management ──→ MOD-14 Reporting & Analytics ──→ MOD-15 Admin Governance
```