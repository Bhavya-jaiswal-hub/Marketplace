# Cart Item Entity

## Overview

The Cart Item entity represents a specific clothing **Product Variant** (Size $\times$ Color combination) and quantity stored inside a customer's persistent Cart.

A Cart contains multiple Cart Items across multiple sellers. Each Cart Item references a specific `ProductVariant` (and its parent `Product`), preserving the customer's size and color selection.

## Purpose

- Store clothing variants selected by customers in their shopping cart.
- Track requested quantities per variant.
- Enable grouping by seller to calculate seller-specific subtotals and display free shipping progress nudges.
- Provide the line items converted into discrete `Order Items` upon checkout completion.

## Owned By

Shopping Management

## Used By

- Cart Management
- Product Management & Product Variant Management
- Inventory Management (Live stock validation)
- Order Management & Checkout Engine
- Customer Marketplace

## Attributes

| Attribute | Type | Description |
|---|---|---|
| Cart Item ID | UUID | Unique identifier for the cart item |
| Cart ID | UUID | Cart associated with the item (Foreign Key to `Cart`) |
| Product ID | UUID | Parent clothing product (Foreign Key to `Product`) |
| Variant ID | UUID | Specific Size $\times$ Color variant selected (Foreign Key to `ProductVariant`) |
| Quantity | Integer | Number of units requested ($\ge 1$) |
| Created At | Timestamp | Record creation timestamp |
| Updated At | Timestamp | Last modification timestamp |

## Validation Rules

1. Every Cart Item must belong to a valid `Cart`.
2. Every Cart Item must reference a valid `Product` and active `ProductVariant`.
3. `Quantity` is mandatory and must be an integer $\ge 1$.
4. A customer can add Cart Items only to their own Cart.
5. The combination of `(Cart ID, Variant ID)` must be unique (adding the same variant again increments the existing quantity).
6. Cart item quantity must not exceed the variant's available inventory at checkout.

## Business Rules (SRS FR-7, BR-8)

1. **Mandatory Variant Selection:** Customers must choose both Size and Color before an item can be added to the cart.
2. **Multi-Vendor Consolidation:** A customer's cart may contain variants from multiple independent sellers.
3. **Seller-Wise Grouping & Shipping Nudges:** Cart items are grouped by seller, calculating seller subtotals and showing dynamic nudges (*"Add ₹X more for free shipping from this seller"*).
4. **Transient State:** Cart Items represent intended purchases; immutable price snapshots and stock decrements occur only upon successful checkout in the `Order Item` entity.

## Relationships

A Cart Item:
- Belongs to one **Cart**.
- References one parent **Product**.
- References one specific **Product Variant**.

```
Cart
  │
  └─── 1 : Many ─── Cart Item ─── Many : 1 ─── Product Variant ─── Many : 1 ─── Product
```