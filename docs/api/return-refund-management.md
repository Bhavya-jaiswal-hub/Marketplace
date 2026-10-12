# Return and Refund Management API

## Document Information

| Field | Value |
|---|---|
| Document Name | Return and Refund Management API |
| Product | Multi-Vendor Clothing Marketplace |
| API Version | v1 |
| Status | Approved Baseline Specification |
| Parent Document | API Design |
| Source of Truth | [docs/SRS.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/SRS.md) (v1.2) |
| Last Updated | 2026-10-07 |

---

# 1. Overview

This module manages the 5-day post-delivery return lifecycle, seller physical inspection (`Verified` vs. `Rejected on Inspection`), Super Admin dispute arbitration, fault-based return shipping allocation, and gateway refund execution.

# 2. Endpoints Summary

| Method | Endpoint | Actor | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/orders/items/:orderItemId/returns` | Customer | Submit return request within 5 days of delivery |
| `GET` | `/api/v1/returns` | Customer | List own return requests |
| `GET` | `/api/v1/returns/:returnRequestId` | Customer / Admin / Seller | View return details and inspection status |
| `POST` | `/api/v1/returns/:returnRequestId/ship` | Customer | Provide return courier name and tracking number (`In Transit`) |
| `GET` | `/api/v1/sellers/me/returns` | Seller | View return requests assigned to own products |
| `POST` | `/api/v1/sellers/me/returns/:returnRequestId/received` | Seller | Acknowledge physical package receipt at facility (`Received`) |
| `POST` | `/api/v1/sellers/me/returns/:returnRequestId/verify` | Seller | Verify condition and accept return (`Verified`) |
| `POST` | `/api/v1/sellers/me/returns/:returnRequestId/reject-inspection` | Seller | Reject return condition (`Rejected on Inspection` with reason) |
| `GET` | `/api/v1/admin/returns` | Super Admin | Review return requests and inspection disputes |
| `POST` | `/api/v1/admin/returns/:returnRequestId/approve-eligibility` | Super Admin | Validate return window and approve request (`Approved`) |
| `POST` | `/api/v1/admin/returns/:returnRequestId/reject-eligibility` | Super Admin | Reject invalid return request (`Rejected`) |
| `POST` | `/api/v1/admin/returns/:returnRequestId/resolve-dispute` | Super Admin | Arbitrate inspection dispute (approve refund or deny return) |
| `POST` | `/api/v1/admin/returns/:returnRequestId/process-refund` | Super Admin | Trigger programmatic gateway refund following verification |

---

# 3. Customer Return Workflow

### 3.1 Request Return
`POST /api/v1/orders/items/:orderItemId/returns`

**Request Body:**
```json
{
  "reason": "Defective stitching along sleeve seam",
  "reasonCategory": "DEFECTIVE_PRODUCT",
  "notes": "Stitching unraveled upon opening package.",
  "photoUrls": ["https://storage.marketplace.com/returns/stitch-defect-1.jpg"]
}
```

**Business Rules:**
- Request must be submitted within **5 calendar days** of the seller's `Delivered` timestamp.
- Sets status to `Requested`.

---

### 3.2 Customer Submit Return Shipment Details
`POST /api/v1/returns/:returnRequestId/ship`

**Request Body:**
```json
{
  "courierName": "Delhivery",
  "trackingNumber": "DLV-9876543210"
}
```

Sets status to `In Transit`.

---

# 4. Seller Inspection Endpoints

### 4.1 Confirm Package Receipt
`POST /api/v1/sellers/me/returns/:returnRequestId/received`

Sets status to `Received`.

---

### 4.2 Verify and Accept Return
`POST /api/v1/sellers/me/returns/:returnRequestId/verify`

**Business Rules:**
- Seller confirms item is in acceptable condition (tags intact, unworn, undamaged).
- Sets status to `Verified`.
- Restocks variant inventory count.
- Notifies Super Admin to trigger gateway refund.

---

### 4.3 Reject Return on Inspection
`POST /api/v1/sellers/me/returns/:returnRequestId/reject-inspection`

**Request Body:**
```json
{
  "reason": "Garment shows clear signs of wash and perfume odor; brand tags removed.",
  "photoUrls": ["https://storage.marketplace.com/returns/worn-evidence.jpg"]
}
```

**Business Rules:**
- Sets status to `Rejected on Inspection`.
- Escalates dispute to Super Admin for arbitration.

---

# 5. Admin Dispute Resolution & Fault-Based Refund

### 5.1 Arbitrate Return Dispute
`POST /api/v1/admin/returns/:returnRequestId/resolve-dispute`

**Request Body:**
```json
{
  "resolution": "OVERRULE_SELLER_APPROVE_REFUND",
  "faultClassification": "SELLER_FAULT",
  "returnShippingDeduction": 79.00,
  "adminNotes": "Inspection photos verify product was defective prior to dispatch."
}
```

---

### 5.2 Fault Allocation & Refund Rules (SRS FR-10, FR-11, BR-10, BR-11)

Per return reason, refund disbursements are calculated as follows:
1. **Item Price:** The customer is refunded the tax-inclusive item price actually paid.
2. **Original Shipping Fee:** The original shipping fee is refunded if and only if the return is seller-fault (and all items in that seller shipment were returned due to seller fault) or the order/seller shipment was cancelled in full prior to shipping. For partial cancellations or change-of-mind returns, the original shipping fee is retained.
3. **Return Courier Cost:**
   - **Customer Discretion / Change of Mind (`CUSTOMER_FAULT`):** The customer pays their own courier cost (borne directly by the customer; not reimbursed). Customer receives a refund of the item price actually paid only.
   - **Seller Fault (`SELLER_FAULT` - Defective, damaged, wrong item/size sent):** The return courier cost is reimbursed to the customer and deducted from the seller's weekly settlement via the `SellerAdjustment` ledger. Customer receives a full refund of the item price actually paid (+ original shipping fee if all items in the seller shipment were returned due to seller fault).
4. **Gateway Execution:**
   - Programmatic refund dispatched via payment gateway API with idempotency token.
   - Sets return status to `Refunded`.
