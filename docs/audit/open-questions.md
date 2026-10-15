# Backend Audit Open Questions

Date: 2026-10-12  
Last Updated: 2026-10-14  
Auditor: Antigravity AI  

The following questions arose from ambiguities, terminology variations, or discrepancies between `docs/SRS.md` (v1.2), `docs/Entities/*`, `docs/database-design.md`, and the existing backend implementation. All questions below have been formally resolved and answered.

---

### Question 1: Seller Account Status Enum Naming — [ANSWERED]
- **SRS Section 8.6 & `docs/Entities/06-Seller-Profile.md`**: Defines statuses as `Pending Approval`, `Approved`, `Rejected`, `Suspended`, `Blocked`.
- **Existing `prisma/schema.prisma` (`SellerStatus`)**: Used `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`, `BLOCKED`.
- **Resolution / Decision**:
  - **Enum Naming Rule**: Every Prisma enum value is the SRS Section 8 label converted to `UPPER_SNAKE_CASE` (spaces and hyphens become underscores).
  - `SellerStatus` values are strictly: `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `SUSPENDED`, `BLOCKED`.
  - Remove all non-SRS values.
  - API responses, `docs/api/*`, `docs/Entities/*`, `docs/database-design.md`, and tests must use these exact values. Frontend impact is planned accordingly.

---

### Question 2: Product Soft Deletion Status Enum Naming — [ANSWERED]
- **SRS Section 8.7 & `docs/database-design.md` Section 5**: Defines status as `Soft-Deleted` (alongside `Active`, `Paused`, `Hidden`, `Removed by Admin`).
- **Existing `prisma/schema.prisma` (`ProductStatus`)**: Used `DELETED` (alongside `ACTIVE`, `PAUSED`, `HIDDEN`, `REMOVED_BY_ADMIN`).
- **Resolution / Decision**:
  - Following the `UPPER_SNAKE_CASE` rule, `ProductStatus` values are strictly: `ACTIVE`, `PAUSED`, `HIDDEN`, `SOFT_DELETED`, `REMOVED_BY_ADMIN`.
  - The value `DELETED` is deprecated and replaced by `SOFT_DELETED`.

---

### Question 3: Seller Category Permission Status Enum Naming — [ANSWERED]
- **SRS Section 8.8 & `docs/database-design.md` Section 5**: Defines status as `Requested`, `Approved`, `Rejected`, `Revoked`.
- **Existing `prisma/schema.prisma` (`SellerCategoryStatus`)**: Used `PENDING`, `APPROVED`, `REJECTED`, `REVOKED`.
- **Resolution / Decision**:
  - Following the `UPPER_SNAKE_CASE` rule, `SellerCategoryStatus` values are strictly: `REQUESTED`, `APPROVED`, `REJECTED`, `REVOKED`.
  - The initial status is `REQUESTED`. The value `PENDING` is removed.

---

### Question 4: Settlement Batch Status vs. Settlement Item Status — [ANSWERED]
- **SRS Section 8.5**: Defines "Settlement Item Status" strictly as `Not Eligible`, `Eligible`, `Settled`.
- **Existing `prisma/schema.prisma`**: Defined a single enum `SettlementStatus` with `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`, `NOT_ELIGIBLE`, `ELIGIBLE`, `SETTLED`. Both `Settlement` (the weekly parent batch) and `SettlementItem` referenced this enum.
- **Resolution / Decision**:
  - Separate into two distinct enums:
    1. **`SettlementItemStatus`**: Strictly `NOT_ELIGIBLE`, `ELIGIBLE`, `SETTLED` (matches SRS Section 8.5).
    2. **`SettlementBatchStatus`**: Strictly `GENERATED`, `APPROVED`, `SETTLED`, `CANCELLED` (no automated payout gateway in V1, so no `PROCESSING`/`FAILED`).
  - **Batch Rules**:
    - `SETTLED` requires the external bank reference and renders the batch immutable.
    - `CANCELLED` returns all linked items back to `ELIGIBLE`.
  - `docs/SRS.md` Section 8, `docs/Entities/29-Settlement.md`, `docs/Entities/30-Settlement-Item.md`, and `docs/database-design.md` are updated to reflect this batch status and the enum naming rule.

---

### Question 5: Product-Level SKU vs. Variant-Level SKU & Stock Relations — [ANSWERED]
- **SRS FR-5 & BR-3**: States "Support clothing variants defined by Size and Color. Require a globally unique SKU for each product variant." Variant-level pricing is out of scope for V1 (defined at product level).
- **Existing `Product` model**: Defined `sku String @unique` on `Product` as well as `sku String @unique` on `ProductVariant`.
- **Resolution / Decision**:
  1. **Remove `Product.sku`**: SKU exists exclusively on `ProductVariant` (globally unique). No parent style code in V1.
  2. **Remove Product-level `Inventory` relation**: Stock quantity lives only on `ProductVariant` (independent stock per SKU).
  3. **Composite Unique Constraint**: Add `@@unique([productId, size, color])` on `ProductVariant`.
  4. **OrderItem**: Make `OrderItem.variantId` required (`String @db.Uuid`).
  5. **ProductImage**: Add nullable `variantId String? @db.Uuid` to `ProductImage` to support images per product and per variant (SRS FR-5).
