# Inventory Entity

## Overview

The Inventory entity tracks stock counts, reservations, and availability for each **Product Variant** (Size $\times$ Color) in the marketplace.

Because clothing products in Version 1 have distinct sizes and colors (each identified by a globally unique SKU), inventory is tracked independently at the variant level rather than at the parent product level.

## Purpose

- Store the available and reserved stock for each clothing Product Variant.
- Prevent overselling through atomic decrement and reservation locks during checkout.
- Enforce automated out-of-stock indicators per variant and across parent products.
- Automatically restock inventory upon pre-shipment cancellations or verified customer returns.
- Maintain low-stock thresholds to alert sellers of fast-moving items.

## Owned By

Inventory Management

## Used By

- Product Management
- Shopping Management (Cart & Storefront Variant Selector)
- Order Management (Checkout Reservation & Stock Decrement)
- Return & Refund Management (Restocking Verified Returns)
- Seller Management (Inventory Dashboard)
- Admin Reporting

## Attributes

| Attribute | Type | Description |
|---|---|---|
| Inventory ID | UUID | Unique identifier for the inventory record |
| Variant ID | UUID | Product Variant associated with this inventory (Foreign Key to `ProductVariant`) |
| Stock Quantity | Integer | Available physical units in stock ($\ge 0$) |
| Reserved Quantity | Integer | Units temporarily locked during active checkout payment processing ($\ge 0$) |
| Low Stock Threshold | Integer | Threshold triggering low-stock warnings (default configurable per variant) |
| Created At | Timestamp | Record creation timestamp |
| Updated At | Timestamp | Last modification timestamp |

## Stock Dynamics & Out-of-Stock Rules (SRS FR-6, BR-5, AC-3)

- **Available for Sale:** $\text{Available Units} = \text{Stock Quantity} - \text{Reserved Quantity}$.
- **Variant Out of Stock:** When $\text{Stock Quantity} = 0$, the variant displays as `Out of Stock` and cannot be added to a customer cart.
- **Product Out of Stock:** When **all variants** of a parent product reach $\text{Stock Quantity} = 0$, the parent product displays as `Out of Stock` on category listing cards.
- **Atomic Checkout Decrement:** Upon successful gateway payment capture, reserved stock is atomically converted into confirmed decremented stock within an ACID transaction.
- **Automated Restocking:**
  - When an order item is cancelled pre-shipment (by customer or seller), the variant's `Stock Quantity` is immediately incremented.
  - When a returned item is received and marked `Verified` by the seller, the variant's `Stock Quantity` is automatically restored.

## Validation Rules

1. Every Inventory record must belong to a valid `Product Variant`.
2. Each `Product Variant` must have exactly one active Inventory record.
3. `Stock Quantity` cannot be negative ($\ge 0$).
4. `Reserved Quantity` cannot be negative ($\ge 0$) and cannot exceed `Stock Quantity`.
5. Sellers can modify stock quantities only for their own product variants.
6. Inventory modifications must be atomic to prevent concurrency conflicts under high traffic.

## Relationships

An Inventory record:
- Belongs to exactly one **Product Variant**.
- Has many **Inventory History** movement records.

```
Product Variant
  │
  └─── 1 : 1 ─── Inventory
                   │
                   └─── 1 : Many ─── Inventory History
```