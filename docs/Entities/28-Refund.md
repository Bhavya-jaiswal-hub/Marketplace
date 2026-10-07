# Refund Entity

## Overview

The Refund entity represents money returned to a customer from the marketplace payment gateway account for a pre-shipment cancellation, verified return, or arbitrated dispute.

All customer transactions in Version 1 are tax-inclusive; refunds are executed directly on the actual price paid (plus original shipping fee when full seller shipment is cancelled or returned due to seller fault).

## Purpose

- Record and track programmatic refunds issued through the payment gateway.
- Associate refunds with the specific Order, Order Item, Return Request, and original Payment Transaction.
- Enforce idempotency to prevent duplicate refund disbursements.
- Preserve immutable financial records for accounting, settlement adjustments, and audit reports.

## Owned By

Return & Refund Management

## Used By

- Payment Management (Gateway API Integration)
- Order Management (Order Item Status Updates)
- Settlement Management (Net Payable Deductions)
- Customer Management (Refund Status Tracking)
- Admin Dashboard (Refund Oversight)
- Financial Reporting

## Attributes

| Attribute | Type | Description |
|---|---|---|
| Refund ID | UUID | Unique identifier for the refund |
| Order ID | UUID | Parent order reference (Foreign Key to `Order`) |
| Order Item ID | UUID | Specific order item refunded (Foreign Key to `OrderItem`) |
| Customer ID | UUID | Customer receiving the refund (Foreign Key to `User`) |
| Payment Transaction ID | UUID | Original captured payment transaction reference |
| Return Request ID | UUID (Nullable) | Return request initiating the refund (Foreign Key to `ReturnRequest`, if applicable) |
| Amount | Numeric | Amount refunded to customer (tax-inclusive) |
| Currency | String | Currency of refund (e.g., `INR`) |
| Reason | String | Refund reason (Pre-Shipment Cancellation, Verified Return, Dispute Resolution) |
| Gateway Refund ID | String | External payment gateway refund reference ID |
| Idempotency Key | String | Unique idempotency token to prevent duplicate gateway refund calls |
| Status | Enum | Refund status: `Pending`, `Paid` (Processed), `Failed` |
| Processed At | Timestamp (Nullable) | Timestamp when payment gateway confirmed refund |
| Created At | Timestamp | Record creation timestamp |
| Updated At | Timestamp | Last modification timestamp |

## Business & Refund Calculation Rules (SRS FR-8, FR-9, FR-10, FR-11, BR-10, BR-11)

1. **Tax-Inclusive Refund Amounts:** All refunds represent the exact price paid at purchase. No separate tax calculations or TCS deductions are performed in Version 1.
2. **Cancellation Refunds:**
   - **Partial Cancellation:** If $\ge 1$ item in the seller shipment remains active, refund = sum of cancelled items' unit prices (shipping fee retained).
   - **Full Cancellation:** If all items in a seller shipment are cancelled, refund = sum of items' unit prices + full seller shipment flat shipping fee.
3. **Return Refunds:**
   - **Seller Fault:** Customer receives full refund of item price. Original shipping fee is refunded if all items in that seller's shipment were returned due to seller fault.
   - **Customer Discretion:** Customer receives refund of item price only (original shipping fee retained).
4. **Dispute Resolution Refunds:** For customer "Not received" claims resolved in customer's favor by Super Admin, a full refund of item price (+ shipping fee if entire seller shipment was unreceived) is triggered.

## Validation Rules

1. Every Refund must reference a valid `Order`, `Payment Transaction`, and `Customer`.
2. `Amount` must be $> 0$ and cannot exceed the captured amount on the associated Order Item.
3. Cumulative refunds for an order item cannot exceed its original captured total.
4. `Gateway Refund ID` must be unique once confirmed by the payment provider.

## Relationships

A Refund:
- Belongs to one **Order** and one **Order Item**.
- References one original **Payment Transaction**.
- Optionally references one **Return Request**.
- Belongs to one **Customer**.

```
Order Item
  │
  ├─── 0..1 : 1 ─── Return Request ─── 0..1 : 1 ─── Refund
  │                                                   │
  └─── 0..1 : 1 ──────────────────────────────────────┘
```