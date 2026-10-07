# Product Entity

## Overview

The Product entity represents a clothing style listed on the marketplace by an approved seller or the Super Admin.

A product belongs to one seller and one clothing category (Men, Women, or Kids subcategory).

The Product entity stores core catalog attributes and product-level pricing (Selling Price and MRP), while individual **Size $\times$ Color** options, SKUs, and inventory quantities are managed through the **Product Variant** entity.

## Purpose

- Store core clothing product information (Title, Description, Brand, Category).
- Associate the product with its owning Seller (or Super Admin for direct retail).
- Define product-level pricing (Selling Price and MRP) applied across all variants in Version 1.
- Manage the product visibility and administrative moderation lifecycle.
- Serve as the parent container for multiple Product Variants, Product Images, and Specifications.

## Owned By

Product Management

## Used By

- Category Management
- Product Variant Management
- Inventory Management
- Shopping Management (Cart & Storefront)
- Order Management
- Return & Refund Management
- Settlement Management
- Admin Dashboard & Reporting

## Attributes

| Attribute | Type | Description |
|---|---|---|
| Product ID | UUID | Unique identifier for the product |
| Seller ID | UUID | Seller who owns the product (or Super Admin ID) |
| Category ID | UUID | Clothing category under which the product is listed |
| Title | String | Name of the clothing product |
| Description | Text | Detailed description, styling notes, fabric information |
| Price | Numeric | Current selling price (tax-inclusive, shared across all variants in V1) |
| Compare At Price (MRP) | Numeric (Nullable) | Maximum Retail Price for discount display |
| Status | Enum | Product visibility status (see Section 8.7) |
| Takedown Reason | Text (Nullable) | Mandatory reason recorded if taken down by Admin |
| Takedown By Admin ID | UUID (Nullable) | Admin ID who initiated product takedown |
| Created At | Timestamp | Record creation timestamp |
| Updated At | Timestamp | Last modification timestamp |
| Deleted At | Timestamp (Nullable) | Soft-deletion timestamp |

## Product Visibility Statuses (SRS Section 8.7)

The Product entity strictly conforms to the 5 visibility statuses defined in **SRS Section 8.7**:

- **`Active`:** Listed, indexed in search, browsable on storefront, and available for purchase.
- **`Paused`:** Merchant-paused listing displaying a "Currently unavailable" indicator; cannot be added to cart.
- **`Hidden`:** Delisted from storefront, category browsing, and search index; existing order history intact.
- **`Soft-Deleted`:** Marked as deleted in seller dashboard; archived in database if associated with historical orders, never hard deleted.
- **`Removed by Admin`:** Administrative takedown of non-compliant or violating product by Super Admin with mandatory reason logged and seller notified.

*(Note: "Out of Stock" is an inventory condition determined by the sum of variant stock quantities, not a base product visibility status).*

## Product Ownership & Moderation Bounds (SRS BR-6, BR-7)

1. **Seller Ownership:** Sellers have exclusive rights to create, edit, pause, hide, and soft-delete their own clothing listings.
2. **Super Admin Moderation:** Super Admin **cannot edit** third-party seller prices, descriptions, or stock levels directly. The Super Admin **may take down** non-compliant listings with a mandatory reason (setting status to `Removed by Admin`), suspend sellers, or revoke category access.
3. **Admin Direct Retail:** Super Admin may list and sell direct clothing inventory with **0% commission**, without category approval requirements, without generating seller settlement records, and with segregated financial reporting.

## Validation Rules

1. `Title` is mandatory and non-empty.
2. `Price` is mandatory, tax-inclusive, and $> 0$.
3. `Compare At Price` (MRP), if provided, must be $\ge \text{Price}$.
4. Product must belong to a valid approved `Seller` and approved `Category`.
5. Product must contain at least one valid `Product Variant` before becoming `Active`.
6. Status transitions must follow permitted state paths.
7. `Takedown Reason` is mandatory when status is changed to `Removed by Admin`.
8. Soft-deleted products must preserve all historical foreign key references in orders.

## Relationships

A Product:
- Belongs to one **Seller**.
- Belongs to one **Category**.
- Has one or more **Product Variants** (Size $\times$ Color).
- Has multiple **Product Images**.
- Has multiple **Product Specifications**.
- Can be referenced by multiple **Order Items** (via its variants).

```
Seller
  │
  └─── 1 : Many ─── Product ─── Many : 1 ─── Category
                       │
                       ├─── 1 : Many ─── Product Variant
                       ├─── 1 : Many ─── Product Image
                       └─── 1 : Many ─── Product Specification
```