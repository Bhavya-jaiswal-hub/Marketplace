# Business Workflows

**Project:** Multi-Vendor Clothing Marketplace

**Version:** 1.2

**Status:** Approved Baseline Specification

**Owner:** Product & Engineering Team

**Source of Truth:** [docs/SRS.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/SRS.md) (v1.2)

**Last Updated:** 2026-10-07

---

## 1. Purpose

This document describes the end-to-end business workflows of the Multi-Vendor Clothing Marketplace. It defines how Super Admin, Sellers, and Customers interact across all platform operations. These workflows are strictly aligned with [docs/SRS.md (v1.2)](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/SRS.md), [docs/database-design.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/database-design.md), and the Entity Specifications.

---

## 2. Core Business Workflows

### Workflow 1: Seller Onboarding & Verification (SRS FR-1, FR-2, BR-1, UC-SEL-01, UC-ADM-02)
1. **Registration:** Merchant signs up as **Individual** or **Business**.
2. **KYC Submission:** Merchant uploads Aadhaar number & document, PAN number & document, registered address proof, bank account details (account number, IFSC), seller photograph, and optional GSTIN (for Business sellers).
3. **Category Selection:** Seller selects initial clothing subcategories requested for authorization (`Requested`).
4. **Administrative Review:** Super Admin inspects submitted documents in the verification queue.
   - **Approved:** Seller status transitions from `Pending Approval` $\to$ `Approved`. Seller gains access to seller portal.
   - **Rejected:** Super Admin provides mandatory feedback; status transitions to `Rejected`. Seller may view feedback and resubmit corrected documents.
   - **Suspension / Blocking:** Super Admin may temporarily suspend an active seller (`Suspended`) or permanently bar fraudulent sellers (`Blocked`).

---

### Workflow 2: Category & Size Set Governance (SRS FR-3, BR-2, BR-3, UC-ADM-03, UC-ADM-04)
1. **Size Set Management:** Super Admin creates and manages data-driven **Size Sets** (e.g., Alpha XS–3XL, Men's Waist 28–42, Women's Waist 26–38, Kids' Age Brackets 0–3M to 12–13Y, Free Size).
2. **Subcategory Assignment:** Super Admin assigns exactly one Size Set to each clothing subcategory.
3. **Seller Category Permission:** An approved seller submits an authorization request for a clothing category (`Requested`).
4. **Admin Review:** Super Admin reviews the request:
   - If approved: Status $\to$ `Approved`. Seller may list products in that subcategory.
   - If rejected: Status $\to$ `Rejected` with reason.
   - If revoked: Status $\to$ `Revoked`. Existing products under that category are moved to `Removed by Admin`.

---

### Workflow 3: Clothing Product & Variant Management (SRS FR-5, FR-6, BR-3, BR-4, BR-5, UC-SEL-02, UC-SEL-03)
1. **Product Creation:** Seller creates a clothing product under an approved subcategory.
2. **Variant Configuration:** Seller defines one or more **Variants** based on **Size** (selected strictly from the subcategory's assigned Size Set) and **Color**.
3. **SKU & Stock Assignment:** Seller assigns a globally unique SKU and stock quantity (`stock_quantity`) to each variant.
4. **Product-Level Pricing:** Base selling price and MRP (`compare_at_price`) are set at the parent product level in Version 1.
5. **Visibility Management:**
   - `Active`: Listed, searchable, and purchasable.
   - `Paused`: Visible with "Currently unavailable" indicator; cannot be added to cart.
   - `Hidden`: Delisted from storefront/search; historical orders intact.
   - `Soft-Deleted`: Archived if referenced in historical orders; never hard deleted.
   - `Removed by Admin`: Super Admin takedown with mandatory reason logged and seller notified.
6. **Out-of-Stock Dynamics:**
   - Variant stock $= 0 \implies$ Variant marked `Out of Stock`.
   - All variants stock $= 0 \implies$ Parent product marked `Out of Stock`.

---

### Workflow 4: Customer Browsing, Cart & Shipping Guidance (SRS FR-7, FR-8, BR-8, BR-10, UC-CUS-02, UC-CUS-03)
1. **Catalog Browsing:** Customers search and filter clothing items by subcategory, size, color, price range, and stock availability.
2. **Variant Selection:** Customer selects size and color on the product detail page.
3. **Multi-Vendor Cart:** Items from multiple independent sellers are grouped in a single shopping cart.
4. **Free Shipping Guidance:** Cart UI displays dynamic per-seller progress indicators: *"Add ₹X more for free shipping from this seller"* based on Admin-configured platform thresholds (default: flat ₹79 fee, free above ₹999 per seller).
5. **Unified Checkout:** Customer authenticates, selects/enters shipping address, and executes a single unified payment via the payment gateway into the marketplace account.

---

### Workflow 5: Order Allocation, Fulfillment & Pre-Shipment Cancellation (SRS FR-8, FR-9, BR-9, UC-SEL-04, UC-SEL-05, UC-CUS-04, UC-CUS-05)
1. **Split-Order Allocation:** Upon payment confirmation, the platform creates a parent order (`Placed`) and splits it into discrete seller `OrderItem` records (`Placed`).
2. **Immutable Financial Snapshot:** Every order item captures an immutable snapshot of variant SKU, size, color, unit price, commission rate %, commission amount, and shipping fee share.
3. **Seller Fulfillment Lifecycle:**
   - `Placed` $\to$ Seller packs item $\to$ `Packed`.
   - `Packed` $\to$ Seller hands to courier, records Courier Name and AWB Tracking Number $\to$ `Shipped`.
   - `Shipped` $\to$ Seller manually confirms physical delivery $\to$ `Delivered`.
4. **Pre-Shipment Cancellation (Cutoff at `Shipped`):**
   - Customer can cancel any item **before** the seller marks it `Shipped`.
   - Seller can cancel an item before shipping if out of stock.
   - **Refund & Shipping Fee Allocation on Cancellation:**
     - Partial cancellation (at least one item in seller shipment remains active): Item price actually paid for cancelled items is refunded; original flat shipping fee is retained for remaining items.
     - Full cancellation (all items in seller shipment cancelled): Item price actually paid and the original shipping fee for that seller are refunded in full.
   - Immediate gateway refund is triggered.

---

### Workflow 6: Delivery Confirmation & "Not Received" Dispute Arbitration (SRS FR-9, BR-11, BR-12, UC-ADM-07, UC-SEL-07, UC-CUS-06)
1. **Delivery Confirmation:** The seller manually marks an item `Delivered` in the seller portal, recording `delivered_at` in UTC.
2. **Dual Timing Boundaries Initiated:** The UTC `delivered_at` timestamp starts:
   - The **Return Window:** Allowed while `now <= delivered_at + 120 hours` (5 calendar days).
   - The **Settlement Holding Period:** Eligible only when `run_timestamp > delivered_at + 168 hours` (strictly later).
3. **"Not Received" Claim Submission:** Customer may report "Not received" strictly while `now <= delivered_at + 168 hours` (7 calendar days). Once `now > delivered_at + 168 hours`, reporting is blocked.
4. **Status & Settlement Freeze:** The item status transitions to `Not Received - Under Dispute`. Weekly settlement for this item is immediately frozen.
5. **SLA & Seller Proof:**
   - Business day is defined as Monday to Friday in IST (public holidays are not excluded in V1).
   - Target SLA deadline is computed as `sla_due_at = dispute_raised_at + 3 business days`, same IST time of day.
   - Dispute is escalated to Super Admin; overdue disputes past `sla_due_at` are flagged on the Admin dashboard.
   - Seller can upload delivery proof (courier delivery slip, tracking confirmation notes).
6. **Admin Arbitration Outcomes:**
   - **Dispute Upheld (Customer Refund):** Super Admin refunds the customer in full (price + shipping fee share) and charges the refunded amount to the seller as a `DISPUTE_CHARGE_DEBIT` in the `SellerAdjustment` ledger.
   - **Dispute Rejected:** Customer claim is rejected, item status reverts, and the item becomes eligible for weekly settlement once `run_timestamp > delivered_at + 168 hours` elapses.

---

### Workflow 7: 5-Day Returns & Fault-Based Inspection (SRS FR-10, FR-11, BR-10, BR-11, UC-SEL-06, UC-ADM-07, UC-CUS-06)
1. **Return Request:** Customer submits a return request while `now <= delivered_at + 120 hours` (`Requested`) with mandatory reason and optional photos.
2. **Admin Eligibility Validation:** Super Admin verifies return window and eligibility (`Approved` or `Rejected`).
3. **Customer Return Shipment:** Customer enters return courier and tracking number (`In Transit`).
4. **Seller Receipt & Physical Inspection:** Seller confirms receipt (`Received`) and performs physical inspection:
   - **Verified:** Condition accepted; return verified.
   - **Rejected on Inspection:** Item damaged/worn/missing tags; seller records mandatory explanation and escalates to Super Admin.
5. **Dispute Resolution:** Super Admin reviews contested rejections and makes final determination.
6. **Fault Allocation & Refund Execution (per return reason):**
   - **Seller Fault** (defective, damaged, wrong item/size sent): Customer receives full refund of item price actually paid. Original shipping fee is refunded if and only if all items in that seller shipment were returned due to seller fault. The return courier cost is reimbursed to the customer and deducted from the seller's weekly settlement via the `SellerAdjustment` ledger.
   - **Customer Discretion / Change of Mind** (fit/size preference, change of mind): The customer pays their own courier cost (borne directly by customer; not reimbursed). Customer receives refund of item price actually paid only (original shipping fee is retained).
7. **Gateway Refund:** Super Admin triggers gateway refund upon verified completion (`Refunded`).

---

### Workflow 8: Weekly Manual Settlement & Negative Balance Management (SRS FR-12, BR-12, UC-ADM-08, UC-SEL-08)
1. **Eligibility Compilation:** Weekly, Super Admin initiates the settlement cycle. The system compiles items where:
   - Status is `Delivered`.
   - Measured strictly against UTC `delivered_at`: only when `run_timestamp > delivered_at + 168 hours` (strictly later).
   - No open return, inspection dispute, customer "Not received" claim (`Not Received - Under Dispute`), or pending refund exists.
   - The settlement run re-checks all of these inside the same database transaction that creates the settlement to ensure atomic isolation.
2. **Calculation & Adjustment Netting:**
   $$\text{Net Calculated} = \text{Gross Delivered Sales} + \text{Shipping Collected} - \text{Platform Commission} - \text{Return Deductions} - \text{Seller-Fault Return Shipping} - \text{Carried-Forward Debits}$$
3. **Negative Balance Handling via Seller Adjustment Ledger:**
   - If $\text{Net Calculated} \ge 0$: Payout amount equals Net Calculated; applied debits are marked `APPLIED`.
   - If $\text{Net Calculated} < 0$: Payout amount is set to **₹0.00** (never generate a negative settlement record). The shortfall is recorded as a `SETTLEMENT_SHORTFALL_DEBIT` in the `SellerAdjustment` ledger and carried forward to the seller's next settlement run.
   - **Single Source of Truth for Debit Balances:** The `SellerAdjustment` ledger is the only source for debit balances; settlement columns (`carried_forward_debit_applied`, `shortfall_amount`) are frozen snapshots and never read as the current balance. Live outstanding debit balances are computed solely by aggregating active unsettled debits from the `SellerAdjustment` ledger.
4. **Admin Debit Write-Off:** Super Admin may waive an uncollectible debit balance with a mandatory audit justification (`written_off_by`, `written_off_at`, `written_off_reason`).
5. **Disbursement & Immutable Locking:** Super Admin executes external banking/UPI payouts for positive amounts, records the mandatory **Bank Transaction Reference Number**, and locks settlement records as immutable (`Settled`).
6. **Seller Statements:** Sellers view itemized settlement statements, gross sales, deductions, and outstanding carried-forward debit balances.

---

### Workflow 9: Super Admin Direct Retail Operations (SRS FR-4, FR-12, FR-14, BR-6, BR-7, UC-ADM-09)
1. **Direct Catalog Listing:** Super Admin lists clothing products directly under any subcategory without category authorization barriers.
2. **0% Platform Commission:** Admin products incur **0% commission** (`commission_rate = 0%`, `commission_amount = 0`).
3. **Settlement Exclusion:** Admin direct retail sales flow directly into the marketplace bank account and **never generate seller settlement records**.
4. **Segregated Reporting:** Admin sales, revenues, and inventory movements are reported in segregated accounting and sales reports.
5. **Content Moderation Bounds:** Super Admin cannot edit third-party seller product content (prices, descriptions, stock) directly, but may moderate listings via administrative takedown (`Removed by Admin`), seller suspension, or category revocation.

---

### Workflow 10: Master Notifications Dispatch (SRS FR-13, BR-13, AC-8)
The system dispatches standardized notifications across In-App feeds and Email for 11 master lifecycle events:
1. Seller registration approval / rejection.
2. Category permission approval / rejection / revocation.
3. Order placed (customer and seller).
4. Order cancelled (pre-shipment).
5. Order shipped (with tracking details).
6. Order delivered.
7. Return requested / approved / rejected.
8. Refund completed.
9. Dispute raised ("Not received" claim; sent to Admin and seller).
10. Dispute resolved (arbitration outcome; sent to customer and seller).
11. Settlement completed (with itemized payout breakdown and bank reference).
