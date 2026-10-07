# Settlement Entity

## Overview

The Settlement entity represents the weekly manual financial payout compiled and executed by the Super Admin for an approved third-party Seller.

Customer payments are held in the marketplace payment gateway account upon order delivery. Weekly, the Super Admin initiates a manual settlement run, compiling all order items delivered at least 7 days prior with no open returns, inspection disputes, or "Not received" claims.

After external bank/UPI disbursement, the Super Admin enters the mandatory **Bank Transaction Reference Number**, which permanently locks the settlement record as immutable.

If deductions and carried-forward debits exceed gross earnings ($\text{Net Calculation} < 0$), the payout is recorded as **₹0.00** (never a negative settlement record) and the shortfall is recorded in the `SellerAdjustment` ledger to be carried forward to the seller's next settlement run.

## Purpose

- Calculate itemized net payable earnings per seller on a weekly cycle.
- Account for platform category commissions, shipping collected, return adjustments, seller-fault return shipping deductions, and previous carried-forward debits.
- Handle negative balance shortfalls cleanly via the Seller Adjustment ledger.
- Record the external bank/UPI payment reference for financial reconciliation.
- Serve as the permanent, immutable ledger for seller payouts.
- Generate downloadable weekly settlement statements for sellers.

## Owned By

Settlement Management

## Used By

- Seller Management (Seller Payout History & Statements)
- Order Management (Order Item Settlement Locking)
- Commission Management (Marketplace Revenue Tracking)
- Return & Refund Management (Return Adjustments & Fault Deductions)
- Super Admin Finance Dashboard (Weekly Settlement Execution Queue)
- Financial Audit & Tax Reporting

## Attributes

| Attribute | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | No | Unique identifier for the settlement |
| `seller_id` | UUID | No | Seller receiving the settlement (Foreign Key to `SellerProfile`) |
| `period_from` | Date | No | Start date of settlement calculation period |
| `period_to` | Date | No | End date of settlement calculation period |
| `gross_product_sales` | Numeric(10, 2) | No | Total gross value of eligible items delivered $\ge 7$ days ago |
| `total_shipping_collected` | Numeric(10, 2) | No | Shipping fees collected from customers for eligible items |
| `total_platform_commission` | Numeric(10, 2) | No | Total category commission retained by the marketplace |
| `total_return_adjustments` | Numeric(10, 2) | No | Adjustments for refunded items or post-delivery clawbacks |
| `total_seller_fault_return_shipping` | Numeric(10, 2) | No | Total return shipping deductions for seller-fault returns |
| `previous_balance_adjustment` | Numeric(10, 2) | No | Carried-forward seller debit balance applied from previous settlements |
| `net_calculated_amount` | Numeric(10, 2) | No | Calculated net amount (can be negative before floor) |
| `payout_amount` | Numeric(10, 2) | No | Actual disbursed amount ($\max(0, \text{net\_calculated\_amount})$) |
| `carried_forward_debit_balance` | Numeric(10, 2) | No | New shortfall debit created if $\text{net\_calculated\_amount} < 0$ (otherwise 0) |
| `bank_transaction_reference` | String(100) | Yes | Mandatory external bank/UPI reference number (required if payout > 0) |
| `status` | Enum | No | Settlement status: `Calculated`, `Settled` |
| `settled_at` | Timestamp | Yes | Timestamp when Super Admin entered reference and locked record |
| `settled_by_admin_id` | UUID | Yes | Super Admin who executed the settlement run |
| `created_at` | Timestamp | No | Record creation timestamp |
| `updated_at` | Timestamp | No | Last modification timestamp |

## Net Payable Calculation Formula (SRS FR-12, BR-12)

$$\text{net\_calculated\_amount} = \text{gross\_product\_sales} + \text{total\_shipping\_collected} - \text{total\_platform\_commission} - \text{total\_return\_adjustments} - \text{total\_seller\_fault\_return\_shipping} - \text{previous\_balance_adjustment}$$

- If $\text{net\_calculated\_amount} \ge 0$:
  $$\text{payout\_amount} = \text{net\_calculated\_amount}, \quad \text{carried\_forward\_debit\_balance} = 0$$
- If $\text{net\_calculated\_amount} < 0$:
  $$\text{payout\_amount} = 0.00, \quad \text{carried\_forward\_debit\_balance} = |\text{net\_calculated\_amount}|$$
  *(A new `SETTLEMENT_SHORTFALL_DEBIT` entry is recorded in the `SellerAdjustment` ledger for this shortfall).*

## Business Rules (SRS FR-4, FR-12, BR-4, BR-7, BR-12, AC-7)

1. **Manual Weekly Execution:** Settlements are calculated and executed manually by the Super Admin on a weekly administrative cycle (no automated bank API payout engine in V1).
2. **7-Day Settlement Holding Period:** An order item is eligible for inclusion only if $\ge 7$ full calendar days have elapsed since the seller marked the item `Delivered`.
3. **Dispute & Return Blocking:** Any order item with an active return request, inspection dispute, or customer "Not received" dispute (`Not Received - Under Dispute`) is strictly excluded from settlement calculation.
4. **Negative Settlement Balance Handling:** If net earnings are negative, payout is set to ₹0.00 and the shortfall is recorded in the `SellerAdjustment` ledger. Negative settlement records are never created.
5. **Admin Direct Retail Exclusion:** Products sold directly by the Super Admin incur 0% commission and **never generate settlement records**. All retail revenues flow directly into marketplace accounts and appear in segregated sales reports.
6. **Immutability (SRS C-5):** Once the Super Admin enters the external `bank_transaction_reference`, the settlement status becomes `Settled`, child settlement items and applied adjustment entries are locked, and the record cannot be altered or deleted.

## Relationships

A Settlement:
- Belongs to one **Seller Profile** (`N..1`).
- Contains multiple **Settlement Items** derived from eligible Order Items (`1..*`).
- May apply multiple previous **Seller Adjustment** records (`1..*`).
- May generate a new shortfall **Seller Adjustment** record (`0..1`).
- Is executed by one **Super Admin** (`N..1`).