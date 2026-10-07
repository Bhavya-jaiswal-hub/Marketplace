# Cart Item Entity

## Overview

The Cart Item entity represents a specific clothing **Product Variant** (Size $\times$ Color combination) and quantity stored inside a customer's persistent Cart.

In Version 1, **`variant_id` is the required purchasable reference**. The `product_id` attribute exists strictly as a denormalized parent reference for category and seller navigation, and is never used as the purchasable entity.

A Cart contains multiple Cart Items across multiple sellers. Each Cart Item references a specific `ProductVariant`, preserving the customer's size and color selection.

## Purpose

- Store clothing variants selected by customers in their shopping cart.
- Reference the active `ProductVariant` as the authoritative purchasable entity.
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

| Attribute | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | No | Unique identifier for the cart item (Primary Key) |
| `cart_id` | UUID | No | Foreign Key to `Cart` |
| `variant_id` | UUID | No | **Mandatory purchasable entity** (Foreign Key to `ProductVariant`) |
| `product_id` | UUID | No | Denormalized parent clothing product reference (Foreign Key to `Product`) |
| `quantity` | Integer | No | Number of units requested ($\ge 1$) |
| `created_at` | Timestamp | No | Record creation timestamp |
| `updated_at` | Timestamp | No | Last modification timestamp |

## Validation Rules

1. Every Cart Item must belong to a valid `Cart`.
2. `variant_id` is **mandatory** and must reference an active, purchasable `ProductVariant`.
3. `product_id` is populated as the parent product reference of the chosen `variant_id` and is not purchasable on its own.
4. `quantity` is mandatory and must be an integer $\ge 1$.
5. A customer can add Cart Items only to their own Cart.
6. The combination of `(cart_id, variant_id)` must be unique (adding the same variant again increments the existing item's quantity).
7. Cart item quantity must not exceed the variant's available inventory (`ProductVariant.stock_quantity`) at checkout.

## Business Rules (SRS FR-7, BR-8)

1. **Mandatory Variant Selection:** Customers must choose both Size and Color before an item can be added to the cart; the cart stores the resulting `variant_id`.
2. **Multi-Vendor Consolidation:** A customer's cart may contain variants from multiple independent sellers.
3. **Seller-Wise Grouping & Shipping Nudges:** Cart items are grouped by seller, calculating seller subtotals and showing dynamic nudges (*"Add ₹X more for free shipping from this seller"*).
4. **Transient State:** Cart Items represent intended purchases; immutable price snapshots and stock decrements occur only upon successful checkout in the `Order Item` entity.

## Relationships

A Cart Item:
- Belongs to one **Cart** (`N..1`).
- References one specific **Product Variant** (`N..1`, mandatory purchasable).
- References one parent **Product** (`N..1`, denormalized parent reference).