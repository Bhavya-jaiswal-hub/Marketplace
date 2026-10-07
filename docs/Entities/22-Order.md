# Order Entity (Parent Order)

## Overview

The Order entity represents the overarching customer purchase transaction resulting from a unified checkout session.

An Order consolidates clothing items purchased across one or multiple sellers. The platform captures a single payment via the payment gateway into the marketplace account, and internally splits the order into discrete, seller-specific **Order Items** for independent fulfillment, delivery, return, and settlement workflows.

## Purpose

- Consolidate multi-vendor items into a single customer order transaction.
- Track overarching fulfillment state derived from child Order Items.
- Store total financial snapshots (Tax-inclusive Subtotal, Shipping Amount, Total Captured).
- Associate the purchase with the Customer and delivery Shipping Address.
- Serve as the parent container for payment transactions and split order items.

## Owned By

Order Management

## Used By

- Customer Management
- Shopping Management & Checkout Engine
- Payment Management
- Order Item Management
- Return & Refund Management
- Notification Management
- Admin Dashboard & Reporting

## Attributes

| Attribute | Type | Description |
|---|---|---|
| Order ID | UUID | Unique identifier for the parent order |
| Customer ID | UUID | Customer who placed the order (Foreign Key to `User`/`CustomerProfile`) |
| Order Number | String | Unique, human-readable reference (e.g., `ORD-20261005-XXXX`) |
| Shipping Address ID | UUID | Snapshot reference of delivery address |
| Order Status | Enum | Parent order status derived from child items (see Section 8.2) |
| Payment Status | Enum | Payment lifecycle status (see Section 8.4) |
| Subtotal | Numeric | Sum of all item subtotals (tax-inclusive) |
| Shipping Amount | Numeric | Total platform shipping charges applied across all seller shipments |
| Total Amount | Numeric | Final total captured from customer ($\text{Subtotal} + \text{Shipping Amount}$) |
| Created At | Timestamp | Order placement timestamp |
| Updated At | Timestamp | Last modification timestamp |

## Parent Order Statuses (SRS Section 8.2)

The parent Order status is **derived from its child Order Items**:

- **`Placed`:** All items in the order are in `Placed` status.
- **`Partially Shipped`:** At least one item is `Shipped`/`Delivered`, while others remain `Placed`/`Packed`.
- **`Partially Delivered`:** At least one item is `Delivered`, while others are in transit or processing.
- **`Delivered`:** All non-cancelled items in the order have been `Delivered`.
- **`Partially Cancelled`:** One or more items are `Cancelled`, while other items continue fulfillment.
- **`Cancelled`:** All items in the order have been `Cancelled`.
- **`Under Dispute`:** One or more items are in `Not Received - Under Dispute` status awaiting Admin arbitration.

## Payment Statuses (SRS Section 8.4)

- **`Pending`:** Payment session initiated with gateway; awaiting confirmation.
- **`Paid`:** Gateway confirmed successful fund capture into marketplace account.
- **`Failed`:** Payment attempt failed, declined, or timed out.
- **`Partially Refunded`:** One or more items/cancellations refunded; remaining balance held.
- **`Refunded`:** Total transaction amount fully refunded to original customer payment method.

## Business Rules (SRS FR-8, BR-8, BR-10)

1. **Unified Payment Capture:** Single checkout payment captured into the marketplace account regardless of the number of distinct sellers.
2. **Tax-Inclusive Pricing:** All product prices and subtotals are tax-inclusive; the platform does not calculate or deduct separate tax line items in Version 1.
3. **Admin-Configurable Shipping Rules:** Flat shipping fee per seller shipment and free shipping threshold per seller subtotal are dynamically evaluated at checkout.
4. **Immutable Snapshot:** The parent order total and its split item snapshots cannot be altered after payment confirmation.

## Relationships

An Order:
- Belongs to one **Customer**.
- Contains one or more **Order Items** (split by Seller).
- Is associated with one **Shipping Address**.
- Has one or more **Payment Transactions**.

```
Customer
  │
  └─── 1 : Many ─── Order
                       │
                       ├─── 1 : Many ─── Order Item (Seller Split)
                       ├─── Many : 1 ─── Shipping Address
                       └─── 1 : Many ─── Payment Transaction
```