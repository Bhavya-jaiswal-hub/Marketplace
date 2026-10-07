# Settlement Item Entity

## Overview

The Settlement Item entity represents the itemized financial contribution and commission deduction of a specific eligible **Order Item** within a Seller Settlement.

Each Settlement Item links one-to-one with an Order Item that has met all settlement eligibility criteria (marked `Delivered` $\ge 7$ days ago, with no open return, refund, or active dispute).

## Purpose

- Preserve itemized financial calculations for each settled order item.
- Record the immutable gross item amount, commission percentage, commission amount, and seller-fault return shipping deductions.
- Provide transparent, item-level accounting for seller payout statements and platform tax reporting.
- Ensure an order item is settled exactly once.

## Owned By

Settlement Management

## Used By

- Settlement Management
- Order Management (Order Item Settlement Tracking)
- Seller Management (Detailed Settlement Statements)
- Commission Management (Historical Platform Revenue Tracking)
- Admin Dashboard
- Financial Audits

## Attributes

| Attribute | Type | Description |
|---|---|---|
| Settlement Item ID | UUID | Unique identifier for the settlement item |
| Settlement ID | UUID | Settlement reference (Foreign Key to `Settlement`) |
| Order Item ID | UUID | Order Item settled (Foreign Key to `OrderItem`, Unique) |
| Seller ID | UUID | Seller receiving the payout |
| Gross Amount | Numeric | Gross delivered item value ($\text{Unit Price} \times \text{Quantity}$) |
| Commission Rate | Numeric | Category commission percentage locked from Order Item |
| Commission Amount | Numeric | Marketplace commission retained ($\text{Gross Amount} \times \text{Commission Rate}$) |
| Return Adjustment Amount | Numeric | Refund/return adjustments associated with this item |
| Seller Fault Return Shipping Deduction | Numeric | Deducted return shipping fee if return was classified as seller-fault |
| Net Amount | Numeric | Net item payable to seller ($\text{Gross Amount} - \text{Commission Amount} - \text{Deductions}$) |
| Status | Enum | Settlement item status (see Section 8.5) |
| Created At | Timestamp | Record creation timestamp |
| Updated At | Timestamp | Last modification timestamp |

## Settlement Item Statuses (SRS Section 8.5)

The Settlement Item entity strictly conforms to the 3 statuses defined in **SRS Section 8.5**:

- **`Not Eligible`:** Marked `Delivered` less than 7 days ago, currently in an open return/refund workflow, subject to an active customer "Not received" dispute (`Not Received - Under Dispute`), or payout not yet due.
- **`Eligible`:** Order item marked `Delivered` 7+ days ago with no open return, refund, or active dispute; queued for weekly settlement calculation.
- **`Settled`:** Payout calculated, external bank/UPI reference recorded by Super Admin, and financial record permanently locked.

## Validation & Eligibility Rules (SRS FR-12, BR-12, AC-7)

1. **Eligibility Criteria:** An Order Item becomes `Eligible` if and only if:
   - Item status is `Delivered`.
   - $\ge 7$ full calendar days have elapsed since the seller's `Delivered At` timestamp.
   - No open `Return Request` exists.
   - No inspection dispute exists.
   - No customer "Not received" claim (`Not Received - Under Dispute`) exists.
2. **One-Time Settlement:** Each Order Item can be associated with at most one `Settled` Settlement Item.
3. **Admin Direct Sales:** Items sold directly by the Super Admin are **never eligible** and never generate settlement items (0% commission, direct platform revenue).
4. **Historical Commission Locking:** Commission calculations use the immutable `Commission Rate` stored on the Order Item at purchase, never the current category rate.

## Relationships

A Settlement Item:
- Belongs to one **Settlement**.
- References exactly one **Order Item** (1 : 1).
- Belongs to one **Seller Profile**.

```
Settlement
  │
  └─── 1 : Many ─── Settlement Item ─── 1 : 1 ─── Order Item
```