# Product Management Feature Specification

## 1. Business Context

Approved sellers and the Super Admin can list products in the marketplace. Sellers may manage only their own products and may create products only in categories approved for their seller account.

Version 1 supports one category per product. Product variants and multi-category products require a later approved model change.

## 2. Actors

| Actor | Permissions |
|---|---|
| Public/Customer | Browse eligible products and view product details |
| Seller | Create and manage own products, images, and specifications |
| Super Admin | Manage own marketplace products and view administrative product data according to policy |
| Inventory Module | Own stock quantity and inventory history |
| Category Module | Validate category existence and seller permission |

## 3. User Stories

- As a seller, I can create a product in an approved category.
- As a seller, I can edit, pause, hide, duplicate, and soft-delete my own product.
- As a seller, I cannot access or modify another seller's product.
- As a customer, I can browse active products and view their details.
- As the marketplace, I can preserve product values in order snapshots even after the product changes.

## 4. Functional Requirements

### FR-PROD-01 Create

The system shall create a product only when the authenticated owner is an approved seller or the Super Admin's seller identity, the category exists, and seller-category permission is approved.

### FR-PROD-02 Update

The system shall allow the owner to update permitted product fields without changing historical orders, settlements, refunds, or reports.

### FR-PROD-03 Lifecycle

The system shall support Active, Paused, Hidden, and Deleted states. Deleted is logical deletion. Zero inventory is an inventory condition and must make the product unavailable for purchase.

### FR-PROD-04 Media

The system shall support multiple product images and product specifications with secure storage and ownership validation.

### FR-PROD-05 Discovery

The marketplace shall expose eligible products with search, category filtering, sorting, pagination, and product details.

### FR-PROD-06 Duplication

The system shall duplicate a seller's product into a new product with a new identity and unique SKU. Inventory must be initialized explicitly.

## 5. Business Rules

1. Every product belongs to exactly one seller and one category in Version 1.
2. Sellers can manage only their own products.
3. Sellers cannot modify Super Admin-owned products.
4. Category approval is seller-specific.
5. Individual product approval is not required after category permission is approved.
6. Product price is mutable current data; Order Item price is historical snapshot data.
7. Product deletion must preserve historical relationships.
8. A product is purchasable only when its status and inventory both allow purchase.
9. SKU uniqueness must be enforced at the database and service layers.
10. Product operations should create activity records and important administrative operations must be auditable.

## 6. Validation Rules

- Name is required and within configured length limits.
- Price is non-negative and represented with approved monetary precision.
- SKU is required, normalized, and unique.
- Category must be active and valid.
- Seller must be authenticated, active, and approved.
- Seller must have approved access to the category.
- Image file type, size, and storage reference must be validated.
- Specifications must use supported key/value formats.
- State transitions must be valid.
- Client-supplied seller IDs must not determine ownership.

## 7. State Transitions

```text
Created -> Active
Active -> Paused | Hidden | Deleted
Paused -> Active | Deleted
Hidden -> Active | Deleted
```

Deleted products cannot return to active state through the normal seller API.

## 8. API Contract

The feature uses [product-management.md](../docs/api/product-management.md). The primary operations are public product listing/details, seller product CRUD, duplicate, status actions, image management, and specification management.

## 9. Data and Module Dependencies

### Entities

Product, Product Image, Product Specification, Seller Profile, Seller Category, Category, Inventory, Activity Log, Audit Log.

### Dependencies

- Authentication provides identity and role.
- Seller Management provides seller approval and ownership.
- Category Management validates category and seller-category permission.
- Inventory Management initializes and validates stock.
- Customer Marketplace consumes eligible product data.
- Order Management snapshots product values during checkout.

## 10. Edge Cases

- Seller loses category permission after products already exist: existing historical records remain valid; future product/category operations must follow the revocation policy.
- Product reaches zero stock: product remains stored but is not purchasable.
- Product is hidden while in a cart: checkout must revalidate and reject or require customer review.
- Duplicate SKU submission: return a conflict without changing the existing product.
- Image storage succeeds but database write fails: no dangling image reference may remain.
- Product price changes during checkout: checkout must revalidate and use an explicit price-change response.
- Seller attempts another seller's product ID: return ownership denial without leaking product details.

## 11. Notifications and Audit

Product creation, deletion, important status changes, category changes, and ownership-sensitive operations may create Activity Log entries. Administrative operations and security-relevant denials should create Audit Log entries according to the audit policy. Product rejection notifications are reserved for a future product-review workflow because Version 1 does not require product approval.

## 12. Test Scenarios

- Approved seller creates a product in an approved category.
- Unapproved seller is rejected.
- Seller is rejected when category permission is missing.
- Seller cannot update another seller's product.
- Duplicate SKU is rejected.
- Product price update does not alter an existing Order Item snapshot.
- Paused, hidden, deleted, and zero-stock products cannot be purchased.
- Duplicate operation does not copy historical orders or inventory.
- Product images enforce ownership and file validation.
- Public listing excludes deleted and unavailable products.
- Concurrent inventory/order flow cannot permit purchase beyond available stock.

## 13. Remaining Implementation Details

- Finalize exact image and specification schemas using the approved defaults.
- Finalize behavior for products after seller suspension or category revocation according to Admin policy.
- Product variants and multi-category products are excluded from Version 1 and require a future approved model change.
