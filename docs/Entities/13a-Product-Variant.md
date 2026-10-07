# Product Variant Entity

## Overview

The Product Variant entity represents a specific, purchasable combination of **Size** and **Color** for a clothing product in the marketplace.

Every clothing product in Version 1 defines one or more product variants. Each variant possesses a globally unique SKU, independent stock tracking (`stock_quantity` and `low_stock_threshold`), and variant sizes selected strictly from the assigned subcategory's `SizeSet`.

Base selling price and MRP are defined at the parent `Product` level in Version 1. The `ProductVariant` entity includes an optional nullable `price_override` column in the database schema reserved for future scope (unused in Version 1).

## Purpose

- Represent individual size and color options for apparel items.
- Maintain independent inventory counts and low-stock thresholds per variant.
- Enforce globally unique Stock Keeping Units (SKUs) across the marketplace.
- Provide the variant reference for customer carts, order items, and inventory reservation.
- Enforce that variant sizes strictly adhere to the subcategory's assigned `SizeSet`.

## Owned By

Product Management

## Used By

- Category Management
- Inventory Management
- Shopping Management (Cart & Cart Items)
- Order Management (Order Items)
- Return & Refund Management
- Admin Dashboard
- Reporting & Analytics

## Attributes

| Attribute | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `product_id` | UUID | No | Foreign Key to parent `Product` |
| `size_set_value_id` | UUID | Yes | Foreign Key to canonical `SizeSetValue` |
| `sku` | String(100) | No | Globally unique Stock Keeping Unit identifier |
| `size` | String(50) | No | Category-specific size string (e.g., XS, S, M, L, XL, 32, 34, 2-3Y) |
| `color` | String(50) | No | Color descriptor (e.g., "Navy Blue", "Crimson", "Olive") |
| `stock_quantity` | Integer | No | Available inventory count for this variant ($\ge 0$) |
| `low_stock_threshold` | Integer | No | Threshold triggering low-stock alerts for this variant (default: 5) |
| `price_override` | Numeric(10, 2) | Yes | Optional variant-level price override (*Unused in V1; reserved for future scope*) |
| `is_active` | Boolean | No | Variant active flag (`true` by default) |
| `created_at` | Timestamp | No | Record creation timestamp |
| `updated_at` | Timestamp | No | Last modification timestamp |

## Variant Out-of-Stock Dynamics

- **Variant Out of Stock:** When a variant's `stock_quantity` reaches zero, the variant is marked `Out of Stock` and cannot be added to a customer's cart.
- **Product Out of Stock:** When **all** variants belonging to a parent product have `stock_quantity = 0`, the parent product is marked `Out of Stock` across catalog cards and search results.

## Validation Rules

1. Every Product Variant must reference a valid parent `Product`.
2. `sku` is mandatory, non-empty, and must be **globally unique** across the entire marketplace (`UNIQUE(sku)`).
3. `size` is mandatory and must match an active `SizeSetValue` belonging to the parent product's subcategory `SizeSet`.
4. `color` is mandatory and non-empty.
5. The combination of `(product_id, size, color)` must be unique (`UNIQUE(product_id, size, color)`).
6. `stock_quantity` must be an integer $\ge 0$.
7. `low_stock_threshold` must be an integer $\ge 0$.
8. `price_override` is nullable and ignored for billing in Version 1; parent `Product.price` governs checkout.
9. Deleting or archiving a variant must be handled logically (soft delete) if referenced in historical orders.

## Relationships

A Product Variant:
- Belongs to exactly one parent **Product** (`N..1`).
- References one **Size Set Value** (`N..1`).
- Has one **Inventory** tracking record (or direct inventory columns).
- Has many **Inventory History** movement records (`1..*`).
- Can be referenced by multiple **Cart Items** (`1..*`).
- Can be referenced by multiple **Order Items** (`1..*`).
