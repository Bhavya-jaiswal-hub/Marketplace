# Product Management Feature Specification

## Document Information

| Field | Value |
|---|---|
| Feature Name | Product & Variant Management |
| Domain | Product Management (MOD-05) |
| Product | Multi-Vendor Clothing Marketplace |
| Version | 1.2 |
| Status | Approved Baseline Specification |
| Prepared By | Bhavya Jaiswal |
| Approved By | Super Admin (Client) |
| Source of Truth | [docs/SRS.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/SRS.md) (v1.2) |
| Last Updated | 2026-10-07 |

---

## 1. Business Context

Approved sellers and the Super Admin list clothing products in the marketplace. The catalog is strictly restricted to **Clothing & Apparel** (Men, Women, Kids).

Sellers may create products only in subcategories for which they hold active approval. In Version 1, every product defines one or more **Product Variants** based on **Size** and **Color**.

Sizes must conform strictly to the **Size Set** assigned to the product's subcategory by the Super Admin. Each variant has a globally unique SKU and independent inventory tracking. Base selling price and MRP are defined at the parent product level in Version 1.

---

## 2. Actors & Permissions

| Actor | Permissions |
|---|---|
| **Public / Customer** | Browse active products, view PDPs, filter by subcategory, size, color, price range, and select variants |
| **Seller** | Create, edit, duplicate, pause, hide, and soft-delete own products and variants; manage image galleries |
| **Super Admin** | Manage direct retail products (0% commission, no category approval, separate reporting); moderate seller listings via administrative takedown (`Removed by Admin`) with mandatory reason |
| **Inventory Module** | Maintain variant stock counts (`stock_quantity`) and reservation locks |
| **Category Module** | Validate subcategory existence, seller permission, and assigned `SizeSet` size values |

---

## 3. User Stories

- **As a seller**, I can create a clothing product under an approved subcategory and define Size $\times$ Color variants using sizes from the subcategory's assigned Size Set.
- **As a seller**, I can assign unique SKUs and stock quantities to each variant.
- **As a seller**, I can edit, pause, hide, duplicate, and soft-delete only my own products.
- **As a seller**, I cannot access or modify another seller's or Super Admin's products.
- **As a customer**, I can view variant options (Size $\times$ Color), inspect live stock status, and add available variants to my cart.
- **As a Super Admin**, I can take down non-compliant listings (`Removed by Admin`) by providing a mandatory explanation, notifying the seller.
- **As the marketplace**, I preserve immutable variant attributes and pricing on historical order items even if products or variants are subsequently edited or archived.

---

## 4. Functional Requirements

### FR-PROD-01 Product & Variant Creation
- The system shall allow creation of a product when the seller is approved and holds permission for the subcategory.
- Creation payload must include product metadata (title, description, subcategory_id, price, compare_at_price) and a non-empty array of **variants** `[{ size, color, sku, stock_quantity, low_stock_threshold }]`.
- Variant `size` values must belong to the active `SizeSet` assigned to the subcategory.
- Variant `sku` must be globally unique across the entire platform.

### FR-PROD-02 Product & Variant Updates
- The seller may update product titles, descriptions, base prices, variant stock counts, and add new variants without mutating historical order records.
- Variant size and color edits for existing SKUs are restricted if associated with active orders.

### FR-PROD-03 Visibility & Lifecycle States (SRS Section 8.7)
- **`Active`:** Publicly visible, indexed in search, purchasable.
- **`Paused`:** Displayed with "Currently unavailable" indicator; cannot be added to cart.
- **`Hidden`:** Delisted from search and storefront browsing; historical order links intact.
- **`Soft-Deleted`:** Removed from seller view; permanently preserved in database if referenced in historical orders.
- **`Removed by Admin`:** Takedown by Super Admin with mandatory reason logged and seller notified.

### FR-PROD-04 Media & Specifications
- Multiple product images can be uploaded and assigned to specific variants or the parent product.
- Structured apparel specifications (fabric, weave, fit, wash care) are stored and validated.

### FR-PROD-05 Product Duplication
- Sellers may duplicate an existing product listing.
- The duplication workflow clones product metadata (title prefixed with "Copy of", description, subcategory, specifications, images) and all variant definitions (size, color, stock).
- Duplication automatically generates new unique SKUs for each cloned variant (or prompts the seller to supply distinct unique SKUs) to guarantee global SKU uniqueness across the platform.

---

## 5. Business Rules (SRS FR-5, BR-3, BR-4, BR-5, BR-6, BR-7)

1. **Clothing Hierarchy:** Every product must belong to exactly one subcategory within Men's, Women's, or Kids' Clothing.
2. **Data-Driven Sizing:** Variant sizes are constrained strictly to the `SizeSet` linked to the product's subcategory.
3. **Product-Level Pricing in V1:** All variants share the parent product's base price in V1 (`product_variants.price_override` is nullable and reserved for future scope).
4. **Independent Variant Inventory:** Each variant maintains its own stock count. A variant with stock $= 0$ is `Out of Stock`; a product with all variants at 0 is `Out of Stock`.
5. **Ownership & Non-Interference:** Super Admin cannot edit seller prices, descriptions, or stock, but may moderate listings via `Removed by Admin`.
6. **Admin Direct Retail:** Admin listings incur 0% commission, bypass category approval, and generate no settlement items.

---

## 6. Validation Rules

- `title`: Required, 3–200 characters.
- `price`: Numeric(10, 2), $> 0$.
- `compare_at_price`: Optional, Numeric(10, 2), $\ge \text{price}$.
- `subcategory_id`: Valid, active subcategory UUID for which seller has `Approved` status.
- `variants`: Array with $\ge 1$ item.
  - `size`: Valid `SizeSetValue` for the subcategory's `SizeSet`.
  - `color`: Non-empty string $\le 50$ chars.
  - `sku`: Non-empty, globally unique string $\le 100$ chars.
  - `stock_quantity`: Integer $\ge 0$.
  - `low_stock_threshold`: Integer $\ge 0$ (default: 5).
  - Unique composite constraint: `(product_id, size, color)` must be unique.

---

## 7. State Transitions

```text
[Created] ──→ Active
Active    ──→ Paused | Hidden | Soft-Deleted | Removed by Admin
Paused    ──→ Active | Hidden | Soft-Deleted | Removed by Admin
Hidden    ──→ Active | Paused | Soft-Deleted | Removed by Admin
Removed by Admin ──→ [Re-instated by Admin only]
```

---

## 8. API Contract & Dependencies

- **API Documentation:** [docs/api/product-management.md](../docs/api/product-management.md)
- **Entity Specifications:** [13-Product.md](../docs/Entities/13-Product.md), [13a-Product-Variant.md](../docs/Entities/13a-Product-Variant.md), [10a-Size-Set.md](../docs/Entities/10a-Size-Set.md)
