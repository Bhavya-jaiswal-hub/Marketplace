# Settlement Management API

## Document Information

| Field | Value |
|---|---|
| Document Name | Settlement Management API |
| Product | Multi-Vendor Clothing Marketplace |
| API Version | v1 |
| Status | Approved Baseline Specification |
| Parent Document | API Design |
| Source of Truth | [docs/SRS.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/SRS.md) (v1.2) |
| Last Updated | 2026-10-07 |

---

# 1. Overview

Settlement Management owns the weekly manual seller payout engine, eligibility verification (7+ days post-`Delivered`, no active disputes), itemized deductions (commissions, return adjustments, seller-fault return shipping), zero-payout floor on negative balances, **Seller Adjustment ledger with signed amounts**, and administrative write-offs.

> **Operational Architecture Note (SRS FR-12, BR-12):** The settlement run is triggered **manually by the Super Admin** via administrative endpoints (`/preview` and `/run`). There is **no automated cron job or scheduled background process** for executing settlements in Version 1.

# 2. Endpoints Summary

| Method | Endpoint | Actor | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/sellers/me/settlements` | Seller | List own historical weekly settlement statements |
| `GET` | `/api/v1/sellers/me/settlements/:settlementId` | Seller | View itemized settlement statement and deductions |
| `GET` | `/api/v1/sellers/me/settlements/:settlementId/report` | Seller | Download PDF/CSV settlement report |
| `GET` | `/api/v1/sellers/me/adjustments` | Seller | View own carried-forward debit ledger and current balance |
| `GET` | `/api/v1/admin/settlements` | Super Admin | List all platform settlement runs |
| `GET` | `/api/v1/admin/settlements/:settlementId` | Super Admin | Review detailed settlement breakdown per seller |
| `POST` | `/api/v1/admin/settlements/preview` | Super Admin | Preview eligible items and calculations without committing |
| `POST` | `/api/v1/admin/settlements/run` | Super Admin | Execute weekly settlement batch calculation |
| `POST` | `/api/v1/admin/settlements/:settlementId/confirm-payout` | Super Admin | Record external bank/UPI reference and lock record as immutable |
| `GET` | `/api/v1/admin/sellers/:sellerId/adjustments` | Super Admin | View seller's adjustment debit ledger |
| `POST` | `/api/v1/admin/adjustments/:adjustmentId/write-off` | Super Admin | Waive/write off an uncollectible debit (mandatory reason) |

---

# 3. Settlement Calculation & Eligibility

### 3.1 Eligibility Criteria (SRS FR-12, BR-12, AC-7)
An `OrderItem` is eligible for inclusion in a weekly settlement run if and only if:
1. Item status is `Delivered`.
2. $\ge 7$ full calendar days have elapsed since the seller's `Delivered` timestamp.
3. No open `ReturnRequest` exists for the item.
4. No active inspection dispute exists.
5. No customer "Not received" dispute (`Not Received - Under Dispute`) is active.
6. The item has not been included in a previously completed settlement.
7. The item does not belong to the Super Admin (Admin direct sales incur 0% commission and never generate settlement items).

---

### 3.2 Net Payable Formula & Negative Shortfall Handling
$$\text{Net Calculated} = \text{Gross Delivered Sales} + \text{Shipping Collected} - \text{Platform Commission} - \text{Return Deductions} - \text{Seller-Fault Return Shipping} - \text{Carried-Forward Debits}$$

- **Positive Calculation ($\text{Net} \ge 0$):**
  - $\text{Payout Amount} = \text{Net Calculated}$.
  - Applied carried-forward debits transition from `PENDING` $\to$ `APPLIED`.
- **Negative Calculation ($\text{Net} < 0$):**
  - $\text{Payout Amount} = \text{₹0.00}$ (negative settlement records are never created).
  - Shortfall $|\text{Net Calculated}|$ is recorded as a new `SETTLEMENT_SHORTFALL_DEBIT` in the `SellerAdjustment` ledger and carried forward to the seller's next settlement run.

---

# 4. Preview & Run Weekly Settlements

### 4.1 Preview Settlement Run
`POST /api/v1/admin/settlements/preview`

**Request Body:**
```json
{
  "periodFrom": "2026-09-24",
  "periodTo": "2026-09-30"
}
```

**Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "sellers": [
      {
        "sellerId": "d9b2d63d-a233-4123-8478-2c963f66afa6",
        "storeName": "Vanguard Apparel",
        "eligibleItemsCount": 14,
        "grossProductSales": 24500.00,
        "totalShippingCollected": 474.00,
        "totalPlatformCommission": 2450.00,
        "totalReturnAdjustments": 0.00,
        "totalSellerFaultReturnShipping": 79.00,
        "previousBalanceAdjustment": 500.00,
        "netCalculatedAmount": 21945.00,
        "payoutAmount": 21945.00,
        "carriedForwardDebitBalance": 0.00
      }
    ]
  },
  "message": "Settlement preview compiled successfully"
}
```

---

### 4.2 Execute Settlement Run
`POST /api/v1/admin/settlements/run`

Triggers the weekly settlement calculation manually. There is no scheduled cron job; Super Admin initiates this batch run after reviewing `/preview`.

**Request Body:**
```json
{
  "periodFrom": "2026-09-24",
  "periodTo": "2026-09-30"
}
```

**Business Rules:**
- Only accessible by `Super Admin`.
- Compiles all eligible order items ($\ge 7$ days post-`Delivered`, no active disputes/returns).
- Generates `Settlement` records with status `Calculated`.
- Deducts pending debit adjustments; if calculated net $< 0$, sets payout to ₹0.00 and records a new carried-forward debit adjustment.

---

### 4.3 Confirm External Payout & Lock Record
`POST /api/v1/admin/settlements/:settlementId/confirm-payout`

**Request Body:**
```json
{
  "bankTransactionReference": "HDFC-NEFT-9876543210"
}
```

**Business Rules:**
- Mandatory `bankTransactionReference` if `payoutAmount > 0`.
- Transitions settlement status from `Calculated` $\to$ `Settled`.
- Permanently locks the settlement record, child settlement items, and applied adjustment entries as immutable.
- Dispatches "Settlement completed" notifications to the seller.

---

# 5. Seller Adjustment & Debit Write-Off Endpoints

### 5.1 Seller View Adjustments Ledger
`GET /api/v1/sellers/me/adjustments`

**Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "currentDebitBalance": 350.00,
    "adjustments": [
      {
        "id": "8c8e1f2a-89c4-4890-8021-9e7fbc8201a1",
        "type": "SETTLEMENT_SHORTFALL_DEBIT",
        "amount": 350.00,
        "direction": "DEBIT",
        "status": "PENDING",
        "reason": "Settlement shortfall from period 2026-09-24 to 2026-09-30",
        "createdAt": "2026-10-01T06:00:00.000Z"
      }
    ]
  },
  "message": "Adjustments retrieved successfully"
}
```

---

### 5.2 Super Admin Write-Off Debit
`POST /api/v1/admin/adjustments/:adjustmentId/write-off`

**Request Body:**
```json
{
  "reason": "Administrative waiver: merchant inventory destroyed during verified courier warehouse fire."
}
```

**Business Rules:**
- Super Admin can write off an uncollectible debit balance.
- Mandatory `reason` is required.
- Records `is_written_off = true`, `written_off_by`, `written_off_at`, `written_off_reason`, and sets status to `WRITTEN_OFF`.
- Generates an immutable security audit log entry.
