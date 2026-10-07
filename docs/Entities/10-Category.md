# Category Entity

## Overview

The Category entity represents the standardized classification tree for **Clothing & Apparel** in the marketplace.

The catalog in Version 1 is strictly restricted to clothing (Men's, Women's, and Kids' apparel). Each subcategory is assigned exactly one Admin-managed **Size Set** (data entity `SizeSet`) from which merchants select variant sizes, rather than using a rigid hardcoded enum.

## Purpose

- Maintain the hierarchical taxonomy for clothing categories and subcategories.
- Link subcategories to a specific `SizeSet` governing valid product variant sizes.
- Associate commission percentages with categories via `CategoryCommission`.
- Enforce that sellers list products only in categories for which they hold active approval.

## Owned By

Category Management

## Attributes

| Attribute | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `parent_id` | UUID | Yes | Parent category reference for hierarchy (Self-referential FK) |
| `size_set_id` | UUID | Yes | Foreign key to assigned `SizeSet` (Mandatory for leaf subcategories) |
| `name` | String(100) | No | Category display name (e.g., "Men's Shirts", "Women's Sarees") |
| `slug` | String(100) | No | Unique URL slug |
| `description` | Text | Yes | Category description |
| `is_active` | Boolean | No | Flag indicating whether category is active |
| `created_at` | Timestamp | No | Record creation timestamp |
| `updated_at` | Timestamp | No | Last modification timestamp |

## Clothing Hierarchy (SRS FR-3, BR-3)

- **Men's Clothing:** Shirts, T-Shirts, Trousers, Jeans, Ethnic Wear, Jackets & Outerwear.
- **Women's Clothing:** Dresses, Tops & Tees, Sarees & Ethnic Wear, Kurtas, Skirts & Pants, Winterwear.
- **Kids' Clothing:** Boys' Clothing, Girls' Clothing, Baby & Toddler Wear.
*(Footwear and accessories are deferred to Version 2).*

## Relationships

- **Category** can have one parent **Category** and many child **Categories** (`1..*`).
- **Category** belongs to one optional **Size Set** (`N..1`, mandatory for leaf subcategories).
- **Category** has one active **Category Commission** rule (and historical records).
- **Category** has many **Seller Category** authorizations.
- **Category** owns many **Products**.