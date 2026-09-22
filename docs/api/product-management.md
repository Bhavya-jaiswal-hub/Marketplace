# Product Management API

## Document Information

| Field | Value |
|---|---|
| Document Name | Product Management API |
| Product | Multi-Vendor Marketplace |
| API Version | v1 |
| Status | Draft |
| Parent Document | API Design |
| Related Documents | Authentication API, Seller Management API, Category Management API |
| Last Updated | DD-MM-YYYY |

---

# 1. Overview

The Product Management API manages products owned by approved sellers or the Super Admin. It exposes product business operations and does not expose product database entities as unrestricted CRUD resources.

The module is responsible for product creation, editing, duplication, visibility/status changes, deletion, images, specifications, and public product details. Inventory quantity is owned by Inventory Management.

Version 1 uses one category per product. Product variants require a separately approved entity and API contract before implementation.

# 2. Endpoints

| Method | Endpoint | Actor | Purpose |
|---|---|---|---|
| GET | `/api/v1/products` | Public | Browse active purchasable products |
| GET | `/api/v1/products/:productId` | Public | View product details |
| GET | `/api/v1/sellers/me/products` | Seller | List own products |
| POST | `/api/v1/sellers/me/products` | Seller | Create a product |
| GET | `/api/v1/sellers/me/products/:productId` | Seller | View own product |
| PATCH | `/api/v1/sellers/me/products/:productId` | Seller | Edit own product |
| POST | `/api/v1/sellers/me/products/:productId/duplicate` | Seller | Duplicate own product |
| POST | `/api/v1/sellers/me/products/:productId/pause` | Seller | Pause own product |
| POST | `/api/v1/sellers/me/products/:productId/activate` | Seller | Activate own product |
| POST | `/api/v1/sellers/me/products/:productId/hide` | Seller | Hide own product |
| DELETE | `/api/v1/sellers/me/products/:productId` | Seller | Soft-delete own product |
| GET | `/api/v1/sellers/me/products/:productId/images` | Seller | List product images |
| POST | `/api/v1/sellers/me/products/:productId/images` | Seller | Add product image |
| DELETE | `/api/v1/sellers/me/products/:productId/images/:imageId` | Seller | Remove product image |
| GET | `/api/v1/sellers/me/products/:productId/specifications` | Seller | List specifications |
| PUT | `/api/v1/sellers/me/products/:productId/specifications` | Seller | Replace specifications |

# 3. Common Rules

## Authentication and Authorization

- Public product browsing does not require authentication.
- Seller product operations require authentication and an approved seller profile.
- A seller may access and modify only products owned by that seller.
- Sellers cannot modify another seller's products or Super Admin-owned products.
- Super Admin product operations, if exposed, must use an explicit administrative contract for Super Admin-owned products only.

## Validation

- Product name, price, seller, category, and SKU are required.
- Price must be non-negative and use the approved monetary representation.
- SKU must be valid and unique according to marketplace rules.
- Category must exist and be active.
- A seller must have an approved Seller Category permission before creating or changing a product's category.
- Unsupported fields and invalid state transitions must be rejected.
- Deleted or unavailable products must not be returned as purchasable marketplace products.

## Historical Data

Changing a product's current price, name, status, or category must not alter historical Order Items, settlements, refunds, or reports. Order creation must snapshot the applicable product values.

## Side Effects

Product changes may create Activity Log and Audit Log records. Image operations may call secure file storage. Product creation must initialize or coordinate an Inventory record through Inventory Management.

# 4. List Marketplace Products

## Endpoint

`GET /api/v1/products`

## Actor

Public / Customer / Seller / Super Admin

## Authentication

Not required.

## Query Parameters

Supported parameters may include `page`, `limit`, `categoryId`, `sellerId`, `search`, `status`, `sortBy`, and `sortOrder`. Only approved filters and sort fields may be accepted.

## Business Rules

- Only products eligible for marketplace display and purchase are returned by default.
- Products with zero available inventory must not be presented as purchasable.
- Authorization must still apply to private seller/admin listing endpoints.
- Internal seller, storage, and audit information must not be exposed publicly.

## Success Response

`200 OK`

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 0,
      "totalPages": 0
    }
  },
  "message": "Products retrieved successfully"
}
```

# 5. Get Product Details

## Endpoint

`GET /api/v1/products/:productId`

## Actor

Public / Customer / Seller / Super Admin

## Authentication

Not required for public products.

## Validation Rules

- Product ID must be valid.
- Product must exist.
- Deleted or private products must not be exposed through the public representation.

## Success Response

`200 OK`

```json
{
  "success": true,
  "data": {
    "product": {}
  },
  "message": "Product retrieved successfully"
}
```

# 6. Create Product

## Endpoint

`POST /api/v1/sellers/me/products`

## Actor

Seller

## Authentication

Required.

## Request Body

```json
{
  "name": "Example Product",
  "description": "Product description",
  "sku": "SKU-001",
  "price": 999,
  "categoryId": "category-id",
  "images": [],
  "specifications": []
}
```

## Business Rules

- The seller profile must be approved and active.
- The seller must have approved access to the selected category.
- Product-level Admin approval is not required after category approval.
- Product ownership is taken from the authenticated seller, never from a client-supplied seller ID.
- Inventory initialization is coordinated with Inventory Management.

## Success Response

`201 Created`

```json
{
  "success": true,
  "data": {
    "product": {}
  },
  "message": "Product created successfully"
}
```

## Errors

`401`, `403`, `404`, `409`, and `422` may represent authentication, seller eligibility, missing category, duplicate SKU, or validation/business-rule failures.

## Idempotency

Product creation should support an idempotency key if retries can create duplicate products. SKU uniqueness remains a database-level safeguard.

# 7. Update Product

## Endpoint

`PATCH /api/v1/sellers/me/products/:productId`

## Actor

Seller

## Authentication

Required.

## Business Rules

- The product must belong to the authenticated seller.
- Only fields permitted by Product Management may be changed.
- Changing category requires current approval for the new category.
- Changing price affects future purchases only.
- Inventory fields must be handled by Inventory Management.
- Product updates must preserve historical records.

## Success Response

`200 OK`

```json
{
  "success": true,
  "data": {
    "product": {}
  },
  "message": "Product updated successfully"
}
```

# 8. Duplicate Product

## Endpoint

`POST /api/v1/sellers/me/products/:productId/duplicate`

## Actor

Seller

## Business Rules

- The source product must belong to the authenticated seller.
- The duplicate receives a new product ID and must have a unique SKU.
- The duplicate must use a category approved for the seller.
- Inventory is not copied as available stock without explicit initialization.
- The source product's historical order records are never duplicated.

## Success Response

`201 Created`

```json
{
  "success": true,
  "data": {
    "product": {}
  },
  "message": "Product duplicated successfully"
}
```

# 9. Product Status Actions

## Endpoints

- `POST /api/v1/sellers/me/products/:productId/pause`
- `POST /api/v1/sellers/me/products/:productId/activate`
- `POST /api/v1/sellers/me/products/:productId/hide`

## Rules

- The product must belong to the authenticated seller.
- The requested transition must be valid for the current status.
- Paused and hidden products must not be purchasable.
- Inventory-derived out-of-stock state must remain owned by Inventory Management.
- The action must be auditable where required.

Repeated application of the same resulting state must be harmless.

# 10. Delete Product

## Endpoint

`DELETE /api/v1/sellers/me/products/:productId`

## Actor

Seller

## Business Rules

Deletion is logical. Historical cart, order, refund, settlement, reporting, and audit references must remain valid. A deleted product is unavailable for new purchases.

## Success Response

`200 OK`

```json
{
  "success": true,
  "data": null,
  "message": "Product deleted successfully"
}
```

# 11. Images and Specifications

Product images and specifications are owned by Product Management and must be accessed through the owning product's authorization boundary.

- Images require file type, size, storage, and ownership validation.
- A seller may modify images only for their own product.
- Product specifications must validate supported names, values, and formats.
- Image/specification changes must not affect historical orders.
- Storage failures must not leave dangling product-image references.

# 12. Error Codes

- `PRODUCT_NOT_FOUND`
- `PRODUCT_ACCESS_DENIED`
- `SELLER_NOT_APPROVED`
- `CATEGORY_NOT_FOUND`
- `CATEGORY_NOT_APPROVED`
- `SKU_ALREADY_EXISTS`
- `INVALID_PRODUCT_STATUS`
- `PRODUCT_NOT_PURCHASABLE`
- `VALIDATION_ERROR`

# 13. Related Entities

Product, Seller Profile, Category, Seller Category, Product Image, Product Specification, Inventory, Cart Item, Order Item, Activity Log, Audit Log.

# 14. Completion Criteria

The Product Management API is complete when product ownership, category authorization, CRUD/actions, image/specification handling, public browsing, validation, errors, audit effects, idempotency, and historical-data behavior are finalized against the corresponding entity specifications.
