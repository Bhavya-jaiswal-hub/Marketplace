# Size Set Value Entity

## Overview

The `SizeSetValue` entity represents an individual size element belonging to an Admin-managed `SizeSet` (e.g., `M`, `32`, `2-3Y`, `Free Size`).

When sellers create a `ProductVariant` under a clothing subcategory, the allowed sizes presented in the UI and enforced during API validation are strictly constrained to the `SizeSetValue` records linked to that subcategory's assigned `SizeSet`.

## Purpose

- Store discrete size identifiers within a specific `SizeSet`.
- Maintain canonical display names, codes, and numerical sort orders for storefront filtering and UI rendering.
- Serve as the authoritative source of valid sizes for variant creation.

## Owned By

Category Management

## Attributes

| Attribute | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `size_set_id` | UUID | No | Foreign key referencing parent `SizeSet` |
| `value` | String(50) | No | Canonical size code / value (e.g., "M", "32", "2-3Y", "Free Size") |
| `display_name` | String(50) | No | Formatted label for storefront display (e.g., "Medium (M)", "32 in", "2-3 Years") |
| `sort_order` | Integer | No | Numeric order for sorting in filters and variant selectors (e.g., 1 for XS, 2 for S) |
| `is_active` | Boolean | No | Availability flag (default: `true`) |
| `created_at` | Timestamp | No | Record creation timestamp |
| `updated_at` | Timestamp | No | Last modification timestamp |

## Constraints & Indexes

- `UNIQUE(size_set_id, value)`: A size value cannot be duplicated within the same size set.
- `INDEX(size_set_id, sort_order)`: Fast sequential retrieval for UI selectors and filter dropdowns.

## Relationships

- **Size Set Value** belongs to one **Size Set** (`N..1`).
- **Size Set Value** is referenced by **Product Variant** (`1..N`).
