# Settlement Management API

## Document Information

| Field | Value |
|---|---|
| Document Name | Settlement Management API |
| Product | Multi-Vendor Marketplace |
| API Version | v1 |
| Status | Draft |
| Parent Document | API Design |
| Related Documents | Order Management API, Payment Management API, Return and Refund Management API |

## 1. Overview

Settlement Management owns seller earnings, commission deduction, settlement eligibility, settlement items, manual processing, and settlement reports. Sellers cannot modify settlement records.

## 2. Endpoints

| Method | Endpoint | Actor | Purpose |
|---|---|---|---|
| GET | `/api/v1/sellers/me/settlements` | Seller | List own settlements |
| GET | `/api/v1/sellers/me/settlements/:settlementId` | Seller | View own settlement |
| GET | `/api/v1/sellers/me/settlements/:settlementId/report` | Seller | Download settlement report |
| GET | `/api/v1/admin/settlements` | Super Admin | List settlements |
| GET | `/api/v1/admin/settlements/:settlementId` | Super Admin | Review settlement details |
| POST | `/api/v1/admin/settlements/preview` | Super Admin | Preview eligible earnings |
| POST | `/api/v1/admin/settlements` | Super Admin | Create a settlement |
| POST | `/api/v1/admin/settlements/:settlementId/process` | Super Admin | Manually process payout |
| POST | `/api/v1/admin/settlements/:settlementId/retry` | Super Admin | Retry a failed payout |
| GET | `/api/v1/admin/settlements/:settlementId/report` | Super Admin | Download settlement report |

## 3. Eligibility and Calculation

- Settlements are calculated per seller and settlement period.
- Only eligible delivered/completed Order Items may be included.
- An Order Item becomes settlement-eligible seven days after delivery, provided there is no blocking return or refund.
- Each Order Item must be included at most once for the relevant settlement component.
- Gross amount, commission, refunds, adjustments, and net amount must be traceable to Settlement Items.
- Commission uses the rate captured when the Order Item was created, never the current Category Commission value.
- Refunds and returns must be applied according to their financial state before payout.
- Net settlement must not be negative unless a future seller-balance policy explicitly supports it.

## 4. Preview and Create

`POST /api/v1/admin/settlements/preview` calculates eligible records without marking them settled. `POST /api/v1/admin/settlements` creates a Pending settlement from a defined seller and period. Preview results must not create duplicate settlement items.

## 5. Process Settlement

`POST /api/v1/admin/settlements/:settlementId/process` is Super Admin-only and idempotent. Version 1 records manual payouts; automated seller payout integration is future scope. A settlement becomes Completed only after the manual payout reference and required details are recorded successfully.

Completed settlements and settlement items are immutable in financial meaning. Failed payouts may be retried without duplicating the payout or settlement item effects.

## 6. Errors

`SETTLEMENT_NOT_FOUND`, `SETTLEMENT_ACCESS_DENIED`, `NO_ELIGIBLE_ITEMS`, `ORDER_ITEM_ALREADY_SETTLED`, `INVALID_SETTLEMENT_PERIOD`, `SETTLEMENT_ALREADY_COMPLETED`, `PAYOUT_FAILED`, `SETTLEMENT_STATE_INVALID`, and `VALIDATION_ERROR`.

## 7. Audit and Idempotency

Settlement preview, creation, processing, retry, and cancellation must be audited. Processing requires an idempotency key or settlement operation reference.

## 8. Related Entities

Seller Profile, Order, Order Item, Settlement, Settlement Item, Category Commission, Refund, Payment Transaction, Notification, Audit Log, Activity Log, Report Metadata.
