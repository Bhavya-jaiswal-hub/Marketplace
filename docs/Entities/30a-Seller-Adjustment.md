# Seller Adjustment Entity

## Overview

The `SellerAdjustment` entity represents a double-entry ledger of debits and credits applied to a seller's financial account outside standard delivered item sales.

It manages shortfalls from negative settlement calculations, charges resulting from lost "Not received" customer disputes, deductions for seller-fault return shipping, manual administrative adjustments, and administrative write-offs.

## Purpose

- Provide an immutable audit trail for all non-standard financial adjustments applied to a seller.
- Record shortfalls when a seller's deductions exceed gross weekly sales in a settlement period ($\text{Net Payable} < 0$).
- Prevent negative settlement payout records by recording the debit shortfall in the adjustment ledger.
- Carry forward outstanding seller debits to be netted against the seller's subsequent weekly settlement batch.
- Support administrative debit write-offs with mandatory audit justification.
- Maintain transparent debit balances visible on the Seller Dashboard.

## Owned By

Settlement Management

## Used By

- Settlement Management
- Order & Dispute Management
- Return & Refund Management
- Super Admin Finance Dashboard
- Seller Dashboard & Payout Statements

## Attributes

| Attribute | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `seller_id` | UUID | No | Foreign Key to `SellerProfile` |
| `type` | Enum / String | No | Adjustment type (`SETTLEMENT_SHORTFALL_DEBIT`, `DISPUTE_CHARGE_DEBIT`, `SELLER_FAULT_RETURN_SHIPPING_DEBIT`, `MANUAL_DEBIT`, `MANUAL_CREDIT`, `WRITE_OFF`) |
| `amount` | Numeric(10, 2) | No | Adjustment amount (Always positive value $\gt 0$) |
| `direction` | Enum / String | No | Ledger direction (`DEBIT` decreases payout, `CREDIT` increases payout) |
| `status` | Enum / String | No | Adjustment status (`PENDING`, `APPLIED`, `WRITTEN_OFF`, `CANCELLED`) |
| `reason` | Text | No | Mandatory explanation / description for the adjustment |
| `order_item_id` | UUID | Yes | Foreign Key to related `OrderItem` (if dispute or item charge) |
| `return_request_id` | UUID | Yes | Foreign Key to related `ReturnRequest` (if return shipping deduction) |
| `originating_settlement_id` | UUID | Yes | Foreign Key to `Settlement` that produced a shortfall debit |
| `applied_in_settlement_id` | UUID | Yes | Foreign Key to `Settlement` where this adjustment was cleared/netted |
| `applied_at` | Timestamp | Yes | Timestamp when adjustment was cleared in a settlement |
| `is_written_off` | Boolean | No | Flag indicating if this debit was waived/written off by Admin (default: `false`) |
| `written_off_by` | UUID | Yes | Foreign Key to `User` (Super Admin who approved write-off) |
| `written_off_at` | Timestamp | Yes | Timestamp when debit was written off |
| `written_off_reason` | Text | Yes | Mandatory explanation recorded for administrative write-off |
| `created_at` | Timestamp | No | Record creation timestamp |
| `updated_at` | Timestamp | No | Last modification timestamp |

## Adjustment Types

1. **`SETTLEMENT_SHORTFALL_DEBIT`**: Created automatically when a weekly settlement run yields $\text{Net Payable} < 0$. The payout is set to ₹0, and the shortfall is logged as a debit.
2. **`DISPUTE_CHARGE_DEBIT`**: Created when Super Admin upholds a customer "Not received" dispute, charging the full refunded amount (item price + shipping) to the seller.
3. **`SELLER_FAULT_RETURN_SHIPPING_DEBIT`**: Direct ledger deduction for courier costs incurred during a verified seller-fault return.
4. **`MANUAL_DEBIT`**: Administrative penalty or manual deduction applied by Super Admin with mandatory reason.
5. **`MANUAL_CREDIT`**: Administrative credit or compensation applied to seller account with mandatory reason.
6. **`WRITE_OFF`**: Administrative adjustment canceling an unrecoverable seller debit.

## Business Rules (SRS FR-12, BR-12)

1. **No Negative Settlement Records:** Settlements never generate negative payout values. If $\text{Net Payable} < 0$, the settlement payout is recorded as **₹0.00**, and the absolute negative balance is logged as a `PENDING` `SETTLEMENT_SHORTFALL_DEBIT`.
2. **Carried-Forward Netting:** In subsequent settlement runs, all `PENDING` debits for the seller are aggregated and deducted as `carried_forward_debit_applied`. Once settled, their status transitions from `PENDING` $\to$ `APPLIED`.
3. **Admin Write-Off Authority:** Super Admin may waive an uncollectible debit. Doing so requires setting `is_written_off = true`, recording `written_off_by`, `written_off_at`, `written_off_reason`, and updating status to `WRITTEN_OFF`.
4. **Immutability:** Once an adjustment record has status `APPLIED` or `WRITTEN_OFF`, it is permanently locked and cannot be edited or deleted.
5. **Seller Dashboard Visibility:** Active `PENDING` debit balances are displayed prominently on the seller's financial dashboard.

## Relationships

- **Seller Adjustment** belongs to one **Seller Profile** (`N..1`).
- **Seller Adjustment** optionally references one **Order Item** (`N..1`).
- **Seller Adjustment** optionally references one **Return Request** (`N..1`).
- **Seller Adjustment** optionally belongs to an originating **Settlement** (`N..1`).
- **Seller Adjustment** optionally belongs to an applied **Settlement** (`N..1`).
