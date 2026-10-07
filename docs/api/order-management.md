# Order Management API

## Document Information

| Field | Value |
|---|---|
| Document Name | Order Management API |
| Product | Multi-Vendor Clothing Marketplace |
| API Version | v1 |
| Status | Approved Baseline Specification |
| Parent Document | API Design |
| Source of Truth | [docs/SRS.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/SRS.md) (v1.2) |
| Last Updated | 2026-10-07 |

---

# 1. Overview

Order Management owns the multi-vendor split-order lifecycle, independent seller item fulfillment (`Placed` $\to$ `Packed` $\to$ `Shipped` $\to$ `Delivered`), manual delivery confirmation, pre-shipment cancellations, and the customer **"Not received" dispute** workflow.

# 2. Endpoints Summary

| Method | Endpoint | Actor | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/checkout` | Customer | Validate multi-vendor cart, calculate shipping, create checkout context |
| `POST` | `/api/v1/orders` | Customer | Create parent order and split order items following gateway payment |
| `GET` | `/api/v1/orders` | Customer | List own parent orders |
| `GET` | `/api/v1/orders/:orderId` | Customer | View own order details and split order item tracking |
| `POST` | `/api/v1/orders/items/:orderItemId/cancel` | Customer | Cancel unfulfilled order item before `Shipped` status |
| `POST` | `/api/v1/orders/items/:orderItemId/report-not-received` | Customer | Report non-delivery within 7 days of seller marking `Delivered` |
| `GET` | `/api/v1/sellers/me/orders` | Seller | View assigned order items fulfillment queue |
| `POST` | `/api/v1/sellers/me/orders/items/:orderItemId/pack` | Seller | Update status from `Placed` $\to$ `Packed` |
| `POST` | `/api/v1/sellers/me/orders/items/:orderItemId/ship` | Seller | Update to `Shipped` (records `courierName`, `trackingNumber`) |
| `POST` | `/api/v1/sellers/me/orders/items/:orderItemId/deliver` | Seller | Manually mark `Delivered` (starts return & settlement timers) |
| `POST` | `/api/v1/sellers/me/orders/items/:orderItemId/cancel` | Seller | Cancel item if out of stock before shipping |
| `POST` | `/api/v1/sellers/me/orders/items/:orderItemId/dispute-proof` | Seller | Submit delivery proof notes/documents for contested disputes |
| `GET` | `/api/v1/admin/orders` | Super Admin | View platform orders and filter by fulfillment/payment status |
| `POST` | `/api/v1/admin/disputes/:orderItemId/resolve` | Super Admin | Arbitrate dispute (`CUSTOMER_REFUND_UPHELD` or `DISPUTE_REJECTED`) |
| `GET` | `/api/v1/admin/settings/shipping` | Super Admin | Get platform shipping settings (flat fee and free shipping threshold) |
| `PATCH` | `/api/v1/admin/settings/shipping` | Super Admin | Update platform shipping settings (configurable, defaults: ₹79 / ₹999) |

---

# 3. Seller Fulfillment Endpoints

### 3.1 Pack Item
`POST /api/v1/sellers/me/orders/items/:orderItemId/pack`

Transitions item from `Placed` $\to$ `Packed`.

---

### 3.2 Ship Item
`POST /api/v1/sellers/me/orders/items/:orderItemId/ship`

**Request Body:**
```json
{
  "courierName": "BlueDart Express",
  "trackingNumber": "BLUDART-987654321"
}
```

**Business Rules:**
- Mandatory `courierName` and `trackingNumber`.
- Sets `status = Shipped` and records `shipped_at = now()`.
- Disables pre-shipment customer cancellation.

---

### 3.3 Mark Delivered (Manual Confirmation)
`POST /api/v1/sellers/me/orders/items/:orderItemId/deliver`

**Business Rules:**
- Sets `status = Delivered` and records `delivered_at = now()`.
- Initiates the **5-day customer return window**.
- Initiates the **7-day settlement holding period**.

---

# 4. "Not Received" Dispute Endpoints

### 4.1 Customer Report Non-Delivery
`POST /api/v1/orders/items/:orderItemId/report-not-received`

**Request Body:**
```json
{
  "reason": "Tracking indicates delivered, but package was not received at delivery address."
}
```

**Business Rules:**
- Customer can report within **7 calendar days** of the seller's `Delivered` mark.
- Transitions item status to `Not Received - Under Dispute`.
- Sets `dispute_status = OPEN` and `sla_due_at = now() + 3 business days`.
- **Freezes weekly settlement** eligibility for this item.
- Dispatches "Dispute raised" notifications to Super Admin and seller.

---

### 4.2 Seller Submit Delivery Proof
`POST /api/v1/sellers/me/orders/items/:orderItemId/dispute-proof`

**Request Body:**
```json
{
  "notes": "Delivered to security guard with signature verification. Attached POD copy.",
  "documentUrl": "https://storage.marketplace.com/proofs/pod-987654.pdf"
}
```

---

### 4.3 Super Admin List Disputes
`GET /api/v1/admin/disputes?status=OPEN`

**Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "disputes": [
      {
        "orderItemId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "orderNumber": "ORD-20261007-0012",
        "productName": "Classic Cotton Oxford Shirt",
        "sellerName": "Vanguard Apparel",
        "customerName": "Aarav Sharma",
        "deliveredAt": "2026-10-01T14:30:00.000Z",
        "notReceivedReportedAt": "2026-10-03T09:15:00.000Z",
        "slaDueAt": "2026-10-06T18:00:00.000Z",
        "isOverdue": true,
        "disputeStatus": "OPEN",
        "sellerProofNotes": "Delivered to security guard with signature verification.",
        "sellerProofDocumentUrl": "https://storage.marketplace.com/proofs/pod-987654.pdf"
      }
    ]
  },
  "message": "Open disputes retrieved successfully"
}
```

---

### 4.4 Super Admin Resolve Dispute
`POST /api/v1/admin/disputes/:orderItemId/resolve`

**Request Body:**
```json
{
  "outcome": "CUSTOMER_REFUND_UPHELD",
  "adminNotes": "Carrier confirmed loss in transit. Refunding customer and debiting seller account."
}
```

**Business Rules:**
- `outcome` must be `CUSTOMER_REFUND_UPHELD` or `DISPUTE_REJECTED`.
- If `CUSTOMER_REFUND_UPHELD`:
  - Full refund (price + shipping fee share) triggered to customer.
  - Refunded amount billed to seller as a `DISPUTE_CHARGE_DEBIT` in `SellerAdjustment` ledger.
  - Item status updated to `Cancelled` / `Refunded`.
- If `DISPUTE_REJECTED`:
  - Customer claim rejected.
  - Item status reverted to `Delivered` and becomes settlement-eligible (once 7-day post-delivery hold completes).
- Dispatches "Dispute resolved" notifications to customer and seller.

---

# 5. Pre-Shipment Cancellation Endpoint

`POST /api/v1/orders/items/:orderItemId/cancel`

**Request Body:**
```json
{
  "reason": "Change of size preference"
}
```

**Business Rules:**
- Only permitted **before** the item is marked `Shipped`.
- **Partial vs. Full Cancellation Shipping Allocation:**
  - If other items in the seller shipment remain active, shipping fee is retained.
  - If all items in the seller shipment are cancelled, shipping fee is refunded in full.
- Triggers immediate programmatic refund and restocks variant inventory.

---

# 6. Admin Shipping Settings Endpoints (SRS FR-8, BR-5, PLC-3)

Shipping rules are platform-wide parameters managed by Super Admin and dynamically fetched during cart/checkout calculations. They are configurable data values and never hardcoded in application logic.

### 6.1 Get Shipping Settings
`GET /api/v1/admin/settings/shipping`

**Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "flatShippingFeePerSeller": 79.00,
    "freeShippingThresholdPerSeller": 999.00,
    "currency": "INR",
    "updatedAt": "2026-10-07T10:00:00.000Z",
    "updatedBy": "super-admin-id"
  },
  "message": "Shipping settings retrieved successfully"
}
```

---

### 6.2 Update Shipping Settings
`PATCH /api/v1/admin/settings/shipping`

**Request Body:**
```json
{
  "flatShippingFeePerSeller": 79.00,
  "freeShippingThresholdPerSeller": 999.00
}
```

**Validation & Business Rules:**
- Only accessible by `Super Admin`.
- `flatShippingFeePerSeller` must be a non-negative decimal (default placeholder: ₹79.00).
- `freeShippingThresholdPerSeller` must be a non-negative decimal (default placeholder: ₹999.00).
- New settings take effect immediately for new cart sessions and subsequent checkouts.
- All modifications are recorded in the immutable `AuditLog`.

