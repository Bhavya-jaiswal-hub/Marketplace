# Product Management API

## Document Information

| Field | Value |
|---|---|
| Document Name | Product Management API |
| Product | Multi-Vendor Clothing Marketplace |
| API Version | v1 |
| Status | Approved Baseline Specification |
| Parent Document | API Design |
| Source of Truth | [docs/SRS.md](file:///c:/Users/acer/OneDrive/Documents/MarketPlace/docs/SRS.md) (v1.2) |
| Last Updated | 2026-10-07 |

---

# 1. Overview

The Product Management API manages clothing products and Size $\times$ Color **Product Variants** owned by approved sellers or the Super Admin. It enforces subcategory permissions, data-driven Size Set validation, independent variant SKU/stock tracking, and product-level base pricing in Version 1.

# 2. Endpoints Summary

| Method | Endpoint | Actor | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/products` | Public | Browse active purchasable clothing products (with faceted filters) |
| `GET` | `/api/v1/products/:productId` | Public | View product details with variant matrix (Size $\times$ Color) and stock status |
| `GET` | `/api/v1/sellers/me/products` | Seller | List own products and variant stock levels |
| `POST` | `/api/v1/sellers/me/products` | Seller | Create a clothing product with Size $\times$ Color variants |
| `GET` | `/api/v1/sellers/me/products/:productId` | Seller | View own product and variant details |
| `PATCH` | `/api/v1/sellers/me/products/:productId` | Seller | Edit own product details, base price, and variant attributes |
| `POST` | `/api/v1/sellers/me/products/:productId/duplicate` | Seller | Duplicate own product (requires new SKUs) |
| `POST` | `/api/v1/sellers/me/products/:productId/pause` | Seller | Pause listing (status `Paused` — "Currently unavailable") |
| `POST` | `/api/v1/sellers/me/products/:productId/activate` | Seller | Activate listing (status `Active`) |
| `POST` | `/api/v1/sellers/me/products/:productId/hide` | Seller | Hide listing from storefront (status `Hidden`) |
| `DELETE` | `/api/v1/sellers/me/products/:productId` | Seller | Soft-delete product (status `Soft-Deleted`) |
| `POST` | `/api/v1/admin/products/:productId/takedown` | Super Admin | Moderate listing (status `Removed by Admin`, mandatory reason) |
| `GET` | `/api/v1/sellers/me/products/:productId/images` | Seller | List product/variant images |
| `POST` | `/api/v1/sellers/me/products/:productId/images` | Seller | Upload image for product or variant |
| `DELETE` | `/api/v1/sellers/me/products/:productId/images/:imageId` | Seller | Remove product image |

---

# 3. Create Product with Variants

## Endpoint
`POST /api/v1/sellers/me/products`

## Authentication & Authorization
Required (`SELLER` or `SUPER_ADMIN`).

## Request Body
```json
{
  "title": "Classic Cotton Oxford Shirt",
  "description": "Premium 100% combed cotton formal shirt with button-down collar.",
  "subcategoryId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "price": 1299.00,
  "compareAtPrice": 1999.00,
  "variants": [
    {
      "size": "M",
      "color": "Sky Blue",
      "sku": "OXF-BLU-M",
      "stockQuantity": 25,
      "lowStockThreshold": 5
    },
    {
      "size": "L",
      "color": "Sky Blue",
      "sku": "OXF-BLU-L",
      "stockQuantity": 30,
      "lowStockThreshold": 5
    },
    {
      "size": "XL",
      "color": "Sky Blue",
      "sku": "OXF-BLU-XL",
      "stockQuantity": 15,
      "lowStockThreshold": 5
    }
  ],
  "specifications": [
    { "key": "Fabric", "value": "100% Cotton" },
    { "key": "Fit", "value": "Slim Fit" },
    { "key": "Wash Care", "value": "Machine wash cold with like colors" }
  ]
}
```

## Validation & Business Rules
1. `title`, `description`, `subcategoryId`, `price`, and `variants` array are mandatory.
2. `price` must be $> 0$; `compareAtPrice` if provided must be $\ge \text{price}$.
3. `variants` must contain at least 1 item.
4. Each variant's `size` must belong to the active `SizeSet` assigned to the `subcategoryId`.
5. Each variant's `sku` must be non-empty and **globally unique** across the platform.
6. The combination `(product_id, size, color)` must be unique.
7. Seller must have `Approved` status for the target subcategory (Super Admin direct retail bypasses category approval).
8. Product-level pricing applies across all variants in Version 1.

## Success Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "product": {
      "id": "7b8e1f2a-89c4-4890-8021-9e7fbc8201a1",
      "sellerId": "d9b2d63d-a233-4123-8478-2c963f66afa6",
      "subcategoryId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "title": "Classic Cotton Oxford Shirt",
      "slug": "classic-cotton-oxford-shirt",
      "price": 1299.00,
      "compareAtPrice": 1999.00,
      "status": "Active",
      "variants": [
        {
          "id": "11111111-2222-3333-4444-555555555555",
          "sku": "OXF-BLU-M",
          "size": "M",
          "color": "Sky Blue",
          "stockQuantity": 25,
          "lowStockThreshold": 5,
          "isOutOfStock": false
        }
      ],
      "createdAt": "2026-10-07T10:00:00.000Z"
    }
  },
  "message": "Product and variants created successfully"
}
```

---

# 4. Update Product & Variants

## Endpoint
`PATCH /api/v1/sellers/me/products/:productId`

## Request Body
```json
{
  "title": "Classic Cotton Oxford Shirt - Updated",
  "price": 1399.00,
  "compareAtPrice": 2099.00,
  "variants": [
    {
      "id": "11111111-2222-3333-4444-555555555555",
      "stockQuantity": 40
    },
    {
      "size": "XXL",
      "color": "Sky Blue",
      "sku": "OXF-BLU-XXL",
      "stockQuantity": 10,
      "lowStockThreshold": 3
    }
  ]
}
```

## Business Rules
- Allows updating product metadata, base price, stock levels, and adding new variants.
- Historical orders retain their immutable frozen unit prices and variant snapshots.

---

# 5. Product Visibility & Moderation Actions

### Seller Actions
- `POST /api/v1/sellers/me/products/:productId/pause` $\to$ Sets status to `Paused`.
- `POST /api/v1/sellers/me/products/:productId/activate` $\to$ Sets status to `Active`.
- `POST /api/v1/sellers/me/products/:productId/hide` $\to$ Sets status to `Hidden`.
- `DELETE /api/v1/sellers/me/products/:productId` $\to$ Sets status to `Soft-Deleted`.

### Super Admin Moderation Action (SRS BR-6, UC-ADM-06)
`POST /api/v1/admin/products/:productId/takedown`

**Request Body:**
```json
{
  "reason": "Non-compliant product listing: counterfeit brand claim violating platform terms."
}
```

**Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "productId": "7b8e1f2a-89c4-4890-8021-9e7fbc8201a1",
    "status": "Removed by Admin",
    "removedReason": "Non-compliant product listing: counterfeit brand claim violating platform terms.",
    "removedAt": "2026-10-07T12:00:00.000Z"
  },
  "message": "Product taken down successfully and seller notified"
}
```
