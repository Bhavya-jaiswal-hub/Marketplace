# Size Set Entity

## Overview

The `SizeSet` entity represents an Admin-managed collection of clothing sizing standards (e.g., Standard Alpha sizes, Men's Waist measurements, Women's Waist measurements, Kids' Age Brackets, Free Size).

Instead of rigid database-level hard-coded enums, `SizeSet` provides a data-driven model for organizing and assigning size options across clothing subcategories. Each subcategory is linked to exactly one `SizeSet`.

## Purpose

- Provide flexible, data-driven clothing size groupings governed by the Super Admin.
- Group individual `SizeSetValue` entries in a strictly defined sort display order.
- Allow subcategories in the clothing taxonomy to bind to a specific sizing schema.
- Prevent invalid size entries when merchants create `ProductVariant` records.

## Owned By

Category Management

## Attributes

| Attribute | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `name` | String(100) | No | Unique name of the size set (e.g., "Alpha Standard", "Men's Waist", "Kids' Age Brackets") |
| `code` | String(50) | No | Unique identifier code (e.g., `ALPHA_STD`, `MENS_WAIST`, `WOMENS_WAIST`, `KIDS_AGE`, `FREE_SIZE`) |
| `description` | Text | Yes | Optional administrative description and sizing notes |
| `is_active` | Boolean | No | Active status flag (default: `true`) |
| `created_at` | Timestamp | No | Record creation timestamp |
| `updated_at` | Timestamp | No | Last modification timestamp |

## Initial Seed Defaults (SRS FR-3, BR-3, PLC-4)

1. **Alpha Standard (`ALPHA_STD`):** `XS`, `S`, `M`, `L`, `XL`, `XXL`, `3XL`
2. **Men's Waist (`MENS_WAIST`):** `28`, `30`, `32`, `34`, `36`, `38`, `40`, `42`
3. **Women's Waist (`WOMENS_WAIST`):** `26`, `28`, `30`, `32`, `34`, `36`, `38`
4. **Kids' Age Brackets (`KIDS_AGE`):** `0-3M`, `3-6M`, `6-12M`, `1-2Y`, `2-3Y`, `3-4Y`, `4-5Y`, `5-6Y`, `6-7Y`, `7-8Y`, `8-9Y`, `9-10Y`, `10-11Y`, `11-12Y`, `12-13Y`
5. **Free Size (`FREE_SIZE`):** `Free Size` / `One Size`

## Relationships

- **Size Set** has many **Size Set Values** (`1..*`).
- **Size Set** is referenced by many subcategory **Categories** (`1..*`).
