# Frontend Contract Synchronization Guide (SRS v1.2)

**Target:** Multi-Vendor Marketplace Web Application & Client SDKs  
**Backend API Base URL:** `/api/v1`  
**Single Source of Truth:** `docs/SRS.md` (v1.2)  
**Date:** 2026-10-15  
**Status:** Approved for Production Sync  

---

## 1. Overview & Architectural Updates

This guide documents the API contract changes introduced during the backend v1.2 refactoring. Frontend client applications, state stores, mock services, and TypeScript type declarations must align with these specifications.

---

## 2. Strict Enum Normalization (`UPPER_SNAKE_CASE`)

All database and API enumerations strictly adhere to **SRS Section 8** in `UPPER_SNAKE_CASE`. Legacy mixed-case or deprecated statuses (`PENDING`, `PROCESSING`, `CONFIRMED`, `COMPLETED`, `DELETED`) have been completely removed.

### 2.1 Enumeration Reference Table

| Enum Type | Spec Section | Supported Values | Deprecated Values Removed |
|---|---|---|---|
| **`SellerStatus`** | §8.6 | `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `SUSPENDED`, `BLOCKED` | `PENDING` |
| **`ProductStatus`** | §8.7 | `ACTIVE`, `PAUSED`, `HIDDEN`, `SOFT_DELETED`, `REMOVED_BY_ADMIN` | `INACTIVE`, `DELETED` |
| **`SellerCategoryStatus`** | §8.8 | `REQUESTED`, `APPROVED`, `REJECTED`, `REVOKED` | `PENDING` |
| **`OrderItemStatus`** | §8.1 | `PLACED`, `PACKED`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `NOT_RECEIVED_UNDER_DISPUTE` | `PENDING`, `CONFIRMED`, `PROCESSING` |
| **`OrderStatus`** | §8.2 | `PLACED`, `PARTIALLY_SHIPPED`, `PARTIALLY_DELIVERED`, `DELIVERED`, `PARTIALLY_CANCELLED`, `CANCELLED`, `UNDER_DISPUTE` | `PENDING`, `CONFIRMED`, `PROCESSING`, `COMPLETED` |
| **`ReturnRequestStatus`** | §8.3 | `REQUESTED`, `APPROVED`, `REJECTED`, `IN_TRANSIT`, `RECEIVED`, `VERIFIED`, `REJECTED_ON_INSPECTION`, `REFUNDED` | `COMPLETED` |
| **`PaymentStatus`** | §8.4 | `PENDING`, `PAID`, `FAILED`, `PARTIALLY_REFUNDED`, `REFUNDED` | - |
| **`SettlementItemStatus`** | §8.5 | `NOT_ELIGIBLE`, `ELIGIBLE`, `SETTLED` | `PENDING` |
| **`SettlementBatchStatus`** | §8.5 | `GENERATED`, `APPROVED`, `SETTLED`, `CANCELLED` | - |
| **`DisputeResolutionOutcome`**| §8.1 / FR-9 | `CUSTOMER_REFUND_UPHELD`, `DISPUTE_REJECTED` | - |

---

## 3. Product Catalog, Size Sets & Variant Architecture

### 3.1 Size Sets Governance (SRS FR-3, BR-3)
Clothing and apparel categories are governed by data-driven **Size Sets**:
- Standard Apparel: `XS`, `S`, `M`, `L`, `XL`, `XXL`
- Footwear: `UK 6`, `UK 7`, `UK 8`, `UK 9`, `UK 10`

**Endpoints:**
- `GET /api/v1/size-sets`: Retrieve all active Size Sets with their configured values.
- `GET /api/v1/categories/:id/size-set`: Retrieve the mandatory size curve values for a category.

### 3.2 Product Variants (`ProductVariant`)
- Products are containers for Size $\times$ Color variants.
- **SKU exists exclusively on the Variant:** Each variant has a globally unique `sku`.
- **Inventory is tracked exclusively per Variant:** `availableQuantity`, `reservedQuantity`, and `lowStockThreshold`.

```typescript
// Variant Shape in API Responses
interface ProductVariantDto {
  id: string;
  productId: string;
  sku: string;
  size: string;
  color: string;
  stockQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  priceOverride?: number | null;
  sizeSetValueId?: string | null;
  isActive: boolean;
  images: Array<{ id: string; imageUrl: string; isPrimary: boolean }>;
}
```

---

## 4. Multi-Vendor Cart, Pricing & Checkout

### 4.1 Cart Payload
When adding items to the cart, the client must supply `variantId`:
```json
POST /api/v1/cart/items
{
  "variantId": "858c8843-a46f-463d-be18-b9d16bd08d27",
  "quantity": 2
}
```

### 4.2 Checkout Snapshots
At checkout (`POST /api/v1/orders/checkout`), the backend captures immutable variant snapshots:
- Line item `productName`, `sku`, `size`, `color`, `unitPrice`
- Variant inventory is atomically reserved during order placement.

---

## 5. Split Fulfillment, Cancellations & Delivery Disputes

### 5.1 Item-Level Fulfillment Transitions
Each seller fulfills their line items independently:
- `PACKED`: `POST /api/v1/sellers/me/orders/:orderId/items/:orderItemId/pack`
- `SHIPPED`: `POST /api/v1/sellers/me/orders/:orderId/items/:orderItemId/ship` (requires `courierName` and `trackingNumber`)
- `DELIVERED`: `POST /api/v1/sellers/me/orders/:orderId/items/:orderItemId/deliver` (triggers 5-day return window and starts 7-day dispute eligibility)

### 5.2 Pre-Shipment Cancellation
Customers can cancel line items while in `PLACED` or `PACKED` state:
- `POST /api/v1/orders/:orderId/items/:orderItemId/cancel`

### 5.3 Non-Delivery Disputes (7-Day Window)
Customers can flag items not physically received within 7 days of delivery mark:
- `POST /api/v1/orders/:orderId/items/:orderItemId/not-received`
- Seller attaches tracking delivery proof: `POST /api/v1/sellers/me/orders/:orderId/items/:orderItemId/dispute-proof`
- Super Admin arbitrates outcome (`CUSTOMER_REFUND_UPHELD` or `DISPUTE_REJECTED`): `POST /api/v1/admin/disputes/:orderItemId/arbitrate`

---

## 6. 8-Stage Return Workflow & Fault Governance

Returns follow the full 8-stage state progression:
1. `REQUESTED`: Submitted by customer within 5 days (120 hours) of delivery.
2. `APPROVED`: Admin validates return window eligibility.
3. `IN_TRANSIT`: Customer submits tracking AWB (`POST /api/v1/returns/:returnId/ship`).
4. `RECEIVED`: Seller marks physical package arrival at facility (`POST /api/v1/sellers/me/returns/:returnId/receive`).
5. `VERIFIED`: Seller verifies condition; triggers gateway refund.
   - OR `REJECTED_ON_INSPECTION`: Seller disputes item condition with photos; escalated to Super Admin arbitration.
6. `REFUNDED`: Gateway refund finalized.

---

## 7. Weekly Settlements & Debit Shortfall Ledger

- Settlements compile delivered items ($\ge 7$ days post-delivery) with zero active disputes or returns.
- **₹0 Floor Rule:** Net payable cannot be negative. Shortfalls are recorded as `SETTLEMENT_SHORTFALL_DEBIT` in `SellerAdjustment` and automatically debited from future settlement cycles.
- Super Admin Direct Retail sales incur **0% commission** and are segregated into `/api/v1/admin/reports/admin-sales`.

---

## 8. Master Lifecycle Notification Events

Clients receive automated notifications across 11 master lifecycle events:
1. `SELLER_APPROVED` / `SELLER_REJECTED`
2. `CATEGORY_APPROVED` / `CATEGORY_REJECTED` / `CATEGORY_REVOKED`
3. `ORDER_PLACED` / `ORDER_PLACED_SELLER`
4. `ORDER_CANCELLED` / `ORDER_CANCELLED_SELLER`
5. `ORDER_SHIPPED`
6. `ORDER_DELIVERED`
7. `RETURN_REQUESTED` / `RETURN_APPROVED` / `RETURN_REJECTED` / `RETURN_REFUNDED`
8. `REFUND_COMPLETED`
9. `DISPUTE_RAISED_ADMIN` / `DISPUTE_RAISED_SELLER`
10. `DISPUTE_RESOLVED_CUSTOMER` / `DISPUTE_RESOLVED_SELLER`
11. `SETTLEMENT_COMPLETED`
